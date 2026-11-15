import { Appointment, BillableService, DiagnosticReport, Doctor, Document, Invoice, Patient, Prescription, User, VisitRecord } from '../models/index.js';
import { createNotification } from './notifications.js';
import { createPublicId } from './identifiers.js';
import { writeAuditLog } from './audit.js';
import { generatePdfDocument } from './pdfDocuments.js';

function dueDate() {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return date;
}

export async function releaseDocument({ type, source, patient, doctor, appointment, visit, invoice, userId }) {
  const lookup = type === 'prescription' ? { prescriptionId: source._id } : type === 'diagnostic_report' ? { diagnosticReportId: source._id } : type === 'invoice' ? { invoiceId: source._id } : { visitRecordId: source._id, documentType: type };
  let document = await Document.findOne(lookup);
  const metadata = await generatePdfDocument({ documentType: type, patient, doctor, appointment, visit, prescription: type === 'prescription' ? source : undefined, report: type === 'diagnostic_report' ? source : undefined, invoice: type === 'invoice' ? source : undefined });
  if (!document) document = new Document({ documentType: type, patientId: patient._id, doctorId: doctor._id, appointmentId: appointment._id, visitRecordId: visit._id, ...(type === 'prescription' ? { prescriptionId: source._id } : {}), ...(type === 'diagnostic_report' ? { diagnosticReportId: source._id } : {}), ...(type === 'invoice' ? { invoiceId: source._id } : {}), generatedBy: userId });
  Object.assign(document, metadata, { title: type === 'prescription' ? 'Medical Prescription' : type === 'diagnostic_report' ? 'Diagnostic Report' : type === 'visit_summary' ? 'Visit Summary' : 'Invoice', status: 'released', releasedAt: new Date(), generationStatus: 'generated', availability: { patient: true, frontDesk: true } });
  await document.save();
  if (type === 'prescription') await Prescription.findByIdAndUpdate(source._id, { documentId: document._id });
  if (type === 'diagnostic_report') await DiagnosticReport.findByIdAndUpdate(source._id, { documentId: document._id });
  if (type === 'visit_summary') await VisitRecord.findByIdAndUpdate(source._id, { documentId: document._id });
  if (type === 'invoice') await Invoice.findByIdAndUpdate(source._id, { documentId: document._id });
  return document;
}

export async function processCompletedVisit({ appointment, visit, userId }) {
  const [patient, doctor, service] = await Promise.all([
    Patient.findById(appointment.patientId).select('patientId name userId'),
    Doctor.findById(appointment.doctorId).select('name departmentId consultationFee userId'),
    BillableService.findOne({ serviceCode: 'CONSULTATION', active: true }),
  ]);
  if (!patient || !doctor) throw new Error('Patient or doctor is unavailable for post-visit processing');
  const billableService = service || (doctor.consultationFee > 0 ? {
    name: 'Consultation fee',
    category: 'Consultation',
    unitPrice: doctor.consultationFee,
  } : null);

  if (!visit.reportId) {
    visit.reportId = createPublicId('RPT');
    visit.reportGeneratedAt = new Date();
    await visit.save();
    await writeAuditLog({ userId, action: 'create', entityType: 'VisitReport', entityId: visit._id, metadata: { reportId: visit.reportId } });
  }

  let invoice = await Invoice.findOne({ appointmentId: appointment._id });
  if (!invoice && billableService) {
    invoice = await Invoice.create({
      invoiceNumber: createPublicId('INV'),
      patientId: appointment.patientId,
      appointmentId: appointment._id,
      visitRecordId: visit._id,
      dueDate: dueDate(),
      lineItems: [{ serviceId: billableService._id, description: billableService.name, category: billableService.category, quantity: 1, unitPrice: billableService.unitPrice, amount: billableService.unitPrice }],
      subtotal: billableService.unitPrice,
      discount: 0,
      tax: 0,
      totalAmount: billableService.unitPrice,
      amountPaid: 0,
      outstandingBalance: billableService.unitPrice,
      status: 'unpaid',
      generationType: 'automatic',
      generationStatus: 'auto_generated',
      createdBy: userId,
    });
    visit.invoiceId = invoice._id;
    visit.billingStatus = 'auto_generated';
    await visit.save();
    await writeAuditLog({ userId, action: 'create', entityType: 'Invoice', entityId: invoice._id, metadata: { generationType: 'automatic', visitId: visit._id } });
  } else if (invoice) {
    visit.invoiceId = invoice._id;
    visit.billingStatus = 'auto_generated';
    await visit.save();
  } else {
    visit.billingStatus = 'pending_review';
    await visit.save();
  }

  const [prescriptions, reports] = await Promise.all([
    Prescription.find({ visitRecordId: visit._id }),
    DiagnosticReport.find({ visitRecordId: visit._id }),
  ]);
  await releaseDocument({ type: 'visit_summary', source: visit, patient, doctor, appointment, visit, userId });
  await Promise.all([
    ...prescriptions.map((prescription) => releaseDocument({ type: 'prescription', source: prescription, patient, doctor, appointment, visit, userId })),
    ...reports
      .filter((report) => report.status === 'completed' && (report.results?.length || report.description || report.reportNotes || report.findings || report.observations))
      .map((report) => releaseDocument({ type: 'diagnostic_report', source: report, patient, doctor, appointment, visit, userId })),
    invoice ? releaseDocument({ type: 'invoice', source: invoice, patient, doctor, appointment, visit, invoice, userId }) : null,
  ]);

  const recipients = await User.find({ role: { $in: ['admin', 'front_desk'] }, isActive: true }).select('_id');
  const baseMetadata = { appointmentId: appointment._id, visitId: visit._id, invoiceId: invoice?._id, reportId: visit.reportId };
  await Promise.all([
    createNotification({
      recipientUserId: patient.userId,
      type: 'clinical',
      title: 'Visit report available',
      message: invoice ? 'Your consultation has been completed. Your visit report and invoice are now available.' : 'Your consultation has been completed. Your visit report is now available.',
      link: `/patient/appointments/${appointment._id}`,
      metadata: baseMetadata,
      deduplicationKey: `visit-completed-patient-${visit._id}`,
    }),
    createNotification({
      recipientUserId: doctor.userId,
      type: 'clinical',
      title: 'Visit completed successfully',
      message: `Visit report ${visit.reportId} has been generated for patient ${patient.patientId}.`,
      link: `/appointments/${appointment._id}`,
      metadata: baseMetadata,
      deduplicationKey: `visit-completed-doctor-${visit._id}`,
    }),
    ...recipients.map((recipient) => createNotification({
      recipientUserId: recipient._id,
      type: 'billing',
      title: invoice ? 'Automatic invoice generated' : 'Invoice requires review',
      message: invoice ? `Invoice ${invoice.invoiceNumber} was generated for patient ${patient.patientId}.` : `Visit completed for patient ${patient.patientId}; configure a billable service before invoicing.`,
      link: invoice ? `/invoices/${invoice._id}` : '/invoices',
      metadata: baseMetadata,
      deduplicationKey: `visit-completed-front-desk-${recipient._id}-${visit._id}`,
    })),
  ]);
  return { invoice, reportId: visit.reportId, billingStatus: visit.billingStatus };
}
