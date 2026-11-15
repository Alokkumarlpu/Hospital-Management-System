import fs from 'node:fs/promises';
import { Appointment, DiagnosticReport, Document, Doctor, Invoice, Patient, Prescription, User, VisitRecord } from '../models/index.js';
import { writeAuditLog } from '../utils/audit.js';
import { createNotification } from '../utils/notifications.js';
import { documentPath, generatePdfDocument } from '../utils/pdfDocuments.js';
import { getPatient } from './patientPortalController.js';

function documentError(message, statusCode = 400) {
  return Object.assign(new Error(message), { statusCode });
}

async function loadSource(type, id) {
  const source = type === 'prescription' ? await Prescription.findById(id)
    : type === 'diagnostic_report' ? await DiagnosticReport.findById(id)
      : type === 'visit_summary' ? await VisitRecord.findById(id)
        : await Invoice.findById(id);
  if (!source) throw documentError('Source clinical record not found', 404);
  const visit = type === 'visit_summary' ? source : source.visitRecordId ? await VisitRecord.findById(source.visitRecordId) : null;
  const [patient, doctor, appointment] = await Promise.all([
    Patient.findById(visit?.patientId || source.patientId),
    Doctor.findById(visit?.doctorId),
    Appointment.findById(visit?.appointmentId || source.appointmentId),
  ]);
  if (!patient || (type !== 'invoice' && (!doctor || !appointment))) throw documentError('Document relationships are incomplete', 409);
  return { source, visit, patient, doctor, appointment };
}

async function authorizeDocument(req, document) {
  if (req.user.role === 'admin' || req.user.role === 'front_desk') return;
  if (req.user.role === 'patient') {
    const ownsDocument = String(req.user.patientId) === String(document.patientId)
      || await Patient.exists({ _id: document.patientId, userId: req.user._id });
    const released = document.status === 'released' || (!document.status && document.availability.patient && document.generationStatus === 'generated');
    if (!document.availability.patient || !released || !ownsDocument) throw documentError('Document is not available', 403);
    return;
  }
  const doctor = await Doctor.findOne({ _id: document.doctorId, userId: req.user._id, isActive: true });
  if (!doctor) throw documentError('You may access only your assigned documents', 403);
}

export async function generateDocument(req, res, next) {
  try {
    const { type, id } = req.params;
    if (!['prescription', 'diagnostic_report', 'visit_summary', 'invoice'].includes(type)) throw documentError('Invalid document type');
    const related = await loadSource(type, id);
    const existing = await Document.findOne(type === 'prescription' ? { prescriptionId: id } : type === 'diagnostic_report' ? { diagnosticReportId: id } : type === 'invoice' ? { invoiceId: id } : { visitRecordId: id, documentType: type });
    if (existing && existing.generationStatus === 'generated') return res.json({ success: true, document: existing });
    const metadata = await generatePdfDocument({ documentType: type, ...related, prescription: type === 'prescription' ? related.source : undefined, report: type === 'diagnostic_report' ? related.source : undefined, invoice: type === 'invoice' ? related.source : undefined });
    const document = existing || new Document({ documentType: type, patientId: related.patient._id, doctorId: related.doctor?._id, appointmentId: related.appointment?._id, visitRecordId: related.visit?._id, ...(type === 'prescription' ? { prescriptionId: related.source._id } : {}), ...(type === 'diagnostic_report' ? { diagnosticReportId: related.source._id } : {}), ...(type === 'invoice' ? { invoiceId: related.source._id } : {}), generatedBy: req.user._id });
    const released = type === 'invoice' || related.visit?.lockedAt !== null;
    Object.assign(document, metadata, {
      title: type === 'prescription' ? 'Medical Prescription' : type === 'diagnostic_report' ? 'Diagnostic Report' : type === 'visit_summary' ? 'Visit Summary' : 'Invoice',
      generationStatus: 'generated',
      status: released ? 'released' : 'finalized',
      releasedAt: released ? new Date() : undefined,
      errorMessage: undefined,
      availability: { patient: released, frontDesk: true },
    });
    await document.save();
    const sourceUpdate = { documentId: document._id };
    if (type === 'prescription') await Prescription.findByIdAndUpdate(id, sourceUpdate);
    if (type === 'diagnostic_report') await DiagnosticReport.findByIdAndUpdate(id, sourceUpdate);
    if (type === 'visit_summary') await VisitRecord.findByIdAndUpdate(id, sourceUpdate);
    if (type === 'invoice') await Invoice.findByIdAndUpdate(id, sourceUpdate);
    await writeAuditLog({ userId: req.user._id, action: 'create', entityType: 'Document', entityId: document._id, metadata: { documentType: type } });
    const users = await User.find({ role: { $in: ['admin', 'front_desk'] }, isActive: true }).select('_id');
    await Promise.all(users.map((user) => createNotification({ recipientUserId: user._id, type: 'clinical', title: 'Clinical document available', message: `A ${type.replace('_', ' ')} document is available for authorized access.`, link: `/invoices`, metadata: { documentId: document._id }, deduplicationKey: `document-${document._id}-${user._id}` })));
    res.status(existing ? 200 : 201).json({ success: true, document });
  } catch (error) { next(error); }
}

export async function getDocument(req, res, next) {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) throw documentError('Document not found', 404);
    await authorizeDocument(req, document);
    res.json({ success: true, document });
  } catch (error) { next(error); }
}

export async function downloadDocument(req, res, next) {
  try {
    const document = await Document.findById(req.params.id);
    if (!document || document.generationStatus !== 'generated') throw documentError('Generated document not found', 404);
    await authorizeDocument(req, document);
    await fs.access(documentPath(document.storageKey));
    await writeAuditLog({ userId: req.user._id, action: 'access', entityType: 'Document', entityId: document._id, req });
    res.download(documentPath(document.storageKey), `${document.documentId}.pdf`);
  } catch (error) { next(error); }
}

export async function listDocuments(req, res, next) {
  try {
    const filter = {};
    if (req.user.role === 'patient') {
      const patient = await getPatient(req);
      filter.patientId = patient._id;
      filter['availability.patient'] = true;
    } else if (req.user.role === 'clinician') {
      const doctor = await Doctor.findOne({ userId: req.user._id, isActive: true });
      if (!doctor) throw documentError('Clinician profile is unavailable', 403);
      filter.doctorId = doctor._id;
    }
    if (req.query.type) filter.documentType = req.query.type;
    let documents = await Document.find(filter).sort({ createdAt: -1 }).limit(500).populate('patientId', 'patientId name').populate({ path: 'doctorId', select: 'name departmentId', populate: { path: 'departmentId', select: 'departmentName' } }).populate('appointmentId', 'appointmentId appointmentDate');
    if (req.user.role === 'patient') {
      const invoices = await Invoice.find({ patientId: filter.patientId }).sort({ invoiceDate: -1 }).limit(100);
      const invoiceDocuments = await Promise.all(invoices.map(async (invoice) => {
        let document = await Document.findOne({ invoiceId: invoice._id });
        if (!document) {
          const related = await loadSource('invoice', invoice._id);
          const metadata = await generatePdfDocument({ documentType: 'invoice', ...related, invoice });
          document = await Document.create({ documentType: 'invoice', title: 'Invoice', patientId: invoice.patientId, doctorId: related.doctor?._id, appointmentId: related.appointment?._id, visitRecordId: related.visit?._id, invoiceId: invoice._id, generatedBy: invoice.createdBy, ...metadata, status: 'released', releasedAt: new Date(), availability: { patient: true, frontDesk: true } });
          await Invoice.findByIdAndUpdate(invoice._id, { documentId: document._id });
        }
        return document;
      }));
      documents = documents.concat(invoiceDocuments);
    }
    await Document.populate(documents, [
      { path: 'patientId', select: 'patientId name' },
      { path: 'doctorId', select: 'name departmentId', populate: { path: 'departmentId', select: 'departmentName' } },
      { path: 'appointmentId', select: 'appointmentId appointmentDate' },
    ]);
    const search = (req.query.search || '').trim().toLowerCase();
    const from = req.query.from ? new Date(req.query.from) : null;
    const to = req.query.to ? new Date(`${req.query.to}T23:59:59.999Z`) : null;
    const status = req.query.status;
    const sortDirection = req.query.sort === 'oldest' ? 1 : -1;
    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 10, 1), 50);
    const normalized = documents.map((document) => {
      const item = document.toObject ? document.toObject() : document;
      item.title = item.title || (item.documentType === 'prescription' ? 'Medical Prescription' : item.documentType === 'diagnostic_report' ? 'Diagnostic Report' : item.documentType === 'visit_summary' ? 'Visit Summary' : 'Invoice');
      item.status = item.status || (item.availability?.patient ? 'released' : item.generationStatus === 'generated' ? 'finalized' : 'pending');
      return item;
    }).filter((item) => (!search || `${item.title} ${item.documentId}`.toLowerCase().includes(search))
      && (!status || item.status === status)
      && (!from || new Date(item.generatedAt) >= from)
      && (!to || new Date(item.generatedAt) <= to))
      .sort((left, right) => (new Date(left.generatedAt) - new Date(right.generatedAt)) * sortDirection);
    const total = normalized.length;
    res.json({ success: true, documents: normalized.slice((page - 1) * limit, page * limit), pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) { next(error); }
}
