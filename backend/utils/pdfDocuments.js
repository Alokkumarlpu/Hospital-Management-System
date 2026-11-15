import fs from 'node:fs/promises';
import path from 'node:path';
import PDFDocument from 'pdfkit';
import { createPublicId } from './identifiers.js';

const storageDirectory = path.resolve(process.cwd(), 'storage', 'documents');
const colors = { navy: '#203b91', ink: '#111827', muted: '#64748b', line: '#dbe3ef' };

function text(value) {
  return value === undefined || value === null || value === '' ? 'Not recorded' : String(value);
}

function drawHeader(pdf, title) {
  pdf.fillColor(colors.navy).fontSize(18).font('Helvetica-Bold').text('CareAxis Hospital Operations');
  pdf.moveDown(0.25).fillColor(colors.ink).fontSize(14).text(title);
  pdf.moveDown(0.35).strokeColor(colors.line).moveTo(pdf.page.margins.left, pdf.y).lineTo(pdf.page.width - pdf.page.margins.right, pdf.y).stroke();
  pdf.moveDown(0.7);
}

function drawFooter(pdf) {
  const y = pdf.page.height - 68;
  pdf.font('Helvetica').fontSize(8).fillColor(colors.muted)
    .text(`CareAxis · Generated ${new Date().toLocaleString()} · Confidential`, pdf.page.margins.left, y, { width: 390, lineBreak: false })
    .text(`Page ${pdf.bufferedPageRange().count}`, 470, y, { lineBreak: false });
}

function createPdf(title, sections, tables = []) {
  return new Promise((resolve, reject) => {
    const pdf = new PDFDocument({ margin: 48, size: 'A4', bufferPages: true });
    const chunks = [];
    pdf.on('data', (chunk) => chunks.push(chunk));
    pdf.on('end', () => resolve(Buffer.concat(chunks)));
    pdf.on('error', reject);
    drawHeader(pdf, title);
    for (const section of sections) {
      pdf.font('Helvetica-Bold').fontSize(10).fillColor(colors.navy).text(section.heading);
      pdf.moveDown(0.2).font('Helvetica').fontSize(9).fillColor(colors.ink);
      for (const line of section.lines) pdf.text(line, { width: 500 });
      pdf.moveDown(0.65);
    }
    for (const table of tables) {
      pdf.font('Helvetica-Bold').fontSize(10).fillColor(colors.navy).text(table.heading);
      pdf.moveDown(0.3);
      const widths = table.headers.map((header) => Math.max(70, 500 / table.headers.length));
      const row = (values, header = false) => {
        if (pdf.y > 720) { pdf.addPage(); drawHeader(pdf, title); }
        const startY = pdf.y;
        const height = Math.max(22, ...values.map((value, index) => pdf.heightOfString(text(value), { width: widths[index] - 8 }))) + 8;
        pdf.rect(48, startY, 500, height).fillAndStroke(header ? '#eef4ff' : '#ffffff', colors.line);
        let x = 48;
        values.forEach((value, index) => {
          pdf.fillColor(header ? colors.navy : colors.ink).font(header ? 'Helvetica-Bold' : 'Helvetica').fontSize(8).text(text(value), x + 4, startY + 4, { width: widths[index] - 8, height: height - 8 });
          x += widths[index];
        });
        pdf.y = startY + height;
      };
      row(table.headers, true);
      table.rows.forEach((values) => row(values));
      pdf.moveDown(0.7);
    }
    const pageCount = pdf.bufferedPageRange().count;
    for (let page = 0; page < pageCount; page += 1) {
      pdf.switchToPage(page);
      drawFooter(pdf);
    }
    pdf.end();
  });
}

export async function generatePdfDocument({ documentType, patient, doctor, appointment, visit, prescription, report, invoice }) {
  const title = documentType === 'prescription' ? 'MEDICAL PRESCRIPTION'
    : documentType === 'diagnostic_report' ? 'DIAGNOSTIC REPORT'
      : documentType === 'visit_summary' ? 'VISIT SUMMARY' : 'INVOICE';
  const sections = [];
  if (patient) sections.push({ heading: 'Patient details', lines: [`Name: ${text(patient.name)}`, `Patient ID: ${text(patient.patientId)}`, `Gender: ${text(patient.gender)}`] });
  if (doctor) sections.push({ heading: 'Doctor details', lines: [`Doctor: ${text(doctor.name)}`, `Specialization: ${text(doctor.specialization)}`] });
  if (appointment) sections.push({ heading: 'Appointment details', lines: [`Appointment ID: ${text(appointment.appointmentId)}`, `Date: ${appointment.appointmentDate ? new Date(appointment.appointmentDate).toLocaleDateString() : 'Not recorded'} ${text(appointment.startTime)}-${text(appointment.endTime)}`] });
  const tables = [];
  if (documentType === 'prescription') {
    sections.push({ heading: 'Prescription details', lines: [`Prescription ID: ${text(prescription.prescriptionId)}`, `Prescription date: ${prescription.prescribedDate ? new Date(prescription.prescribedDate).toLocaleDateString() : 'Not recorded'}`, `Assessment: ${text(prescription.diagnosisOrAssessment)}`, `Instructions: ${text(prescription.instructions)}`, `Follow-up date: ${prescription.followUpDate ? new Date(prescription.followUpDate).toLocaleDateString() : 'Not recorded'}`] });
    tables.push({ heading: 'Medicines', headers: ['Medicine', 'Dosage', 'Frequency', 'Duration', 'Instructions'], rows: (prescription.medicines || []).map((medicine) => [medicine.medicineName, `${medicine.dosage} ${medicine.dosageUnit || ''}`.trim(), medicine.frequency, medicine.duration, medicine.instructions]) });
  } else if (documentType === 'diagnostic_report') {
    sections.push({ heading: 'Test details', lines: [`Report ID: ${text(report.reportId)}`, `Test: ${text(report.reportName)}`, `Category: ${text(report.testCategory)}`, `Test date: ${report.reportDate ? new Date(report.reportDate).toLocaleDateString() : 'Not recorded'}`, `Status: ${text(report.status)}`] });
    tables.push({ heading: 'Results', headers: ['Parameter', 'Result', 'Unit', 'Reference range', 'Status'], rows: (report.results || []).map((result) => [result.parameterName, result.resultValue, result.unit, result.referenceRange, result.resultStatus]) });
    sections.push({ heading: 'Clinical notes', lines: [`Findings: ${text(report.findings || report.description)}`, `Observations: ${text(report.observations)}`, `Doctor notes: ${text(report.doctorNotes || report.reportNotes)}`] });
  } else if (documentType === 'visit_summary') {
    sections.push({ heading: 'Visit summary', lines: [`Visit ID: ${text(visit.visitId)}`, `Visit date: ${visit.visitDate ? new Date(visit.visitDate).toLocaleDateString() : 'Not recorded'}`, `Chief complaint: ${text(visit.chiefComplaint)}`, `Symptoms: ${text(visit.symptoms)}`, `Observations: ${text(visit.clinicalObservations)}`, `Assessment: ${text(visit.assessmentNotes)}`, `Treatment plan: ${text(visit.treatmentPlan)}`, `Follow-up instructions: ${text(visit.additionalNotes)}`] });
  } else if (invoice) {
    sections.push({ heading: 'Invoice details', lines: [`Invoice number: ${text(invoice.invoiceNumber)}`, `Invoice date: ${invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString() : 'Not recorded'}`, `Due date: ${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'Not recorded'}`, `Payment status: ${text(invoice.status)}`] });
    tables.push({ heading: 'Itemized services', headers: ['Service', 'Quantity', 'Unit price', 'Amount'], rows: (invoice.lineItems || []).map((item) => [item.description, item.quantity, item.unitPrice.toFixed(2), item.amount.toFixed(2)]) });
    sections.push({ heading: 'Totals', lines: [`Subtotal: ${invoice.subtotal.toFixed(2)}`, `Discount: ${invoice.discount.toFixed(2)}`, `Tax: ${invoice.tax.toFixed(2)}`, `Total: ${invoice.totalAmount.toFixed(2)}`, `Amount paid: ${invoice.amountPaid.toFixed(2)}`, `Outstanding: ${invoice.outstandingBalance.toFixed(2)}`] });
  }
  const buffer = await createPdf(title, sections, tables);
  const documentId = createPublicId(documentType === 'invoice' ? 'INV' : documentType === 'prescription' ? 'PRES' : documentType === 'diagnostic_report' ? 'RPT' : 'VIS');
  const storageKey = `${documentId}.pdf`;
  await fs.mkdir(storageDirectory, { recursive: true });
  await fs.writeFile(path.join(storageDirectory, storageKey), buffer, { flag: 'wx' });
  return { documentId, storageKey, fileSize: buffer.length, mimeType: 'application/pdf' };
}

export function documentPath(storageKey) {
  return path.join(storageDirectory, path.basename(storageKey));
}
