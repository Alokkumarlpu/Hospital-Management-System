import { body, param, query } from 'express-validator';

const mongoId = (field) => param(field).isMongoId().withMessage(`Valid ${field} is required`);
const optionalText = (field, max) => body(field).optional({ values: 'falsy' }).trim().isLength({ max }).withMessage(`${field} is too long`);

export const visitIdValidator = [mongoId('id')];
export const visitValidators = [
  body('patientId').isMongoId().withMessage('Valid patient ID is required'),
  body('appointmentId').isMongoId().withMessage('Valid appointment ID is required'),
  optionalText('chiefComplaint', 200),
  optionalText('symptoms', 5000),
  optionalText('clinicalObservations', 10000),
  optionalText('assessmentNotes', 10000),
  optionalText('treatmentPlan', 10000),
  optionalText('additionalNotes', 10000),
  body('followUpDate').optional({ values: 'falsy' }).isISO8601().withMessage('Invalid follow-up date'),
];
export const visitUpdateValidators = [
  ...visitValidators.filter((validator) => validator !== visitValidators[0] && validator !== visitValidators[1]),
];

export const noteValidators = [
  body('visitRecordId').isMongoId().withMessage('Valid visit record ID is required'),
  optionalText('chiefComplaint', 200),
  optionalText('historyOfPresentIllness', 10000),
  optionalText('examinationFindings', 10000),
  optionalText('clinicalObservations', 10000),
  optionalText('assessment', 10000),
  optionalText('treatmentPlan', 10000),
  optionalText('followUpInstructions', 5000),
];
export const noteUpdateValidators = [
  ...noteValidators.filter((validator) => validator !== noteValidators[0]),
];

export const prescriptionValidators = [
  body('visitRecordId').isMongoId().withMessage('Valid visit record ID is required'),
  body('medicines').isArray({ min: 1, max: 50 }).withMessage('At least one medicine is required'),
  body('medicines.*.medicineName').trim().isLength({ min: 1, max: 200 }).withMessage('Medicine name is required'),
  body('medicines.*.dosage').trim().isLength({ min: 1, max: 100 }).withMessage('Medicine dosage is required'),
  body('medicines.*.frequency').trim().isLength({ min: 1, max: 100 }).withMessage('Medicine frequency is required'),
  body('medicines.*.duration').trim().isLength({ min: 1, max: 100 }).withMessage('Medicine duration is required'),
  body('medicines.*.route').optional().trim().isLength({ max: 100 }).withMessage('Medicine route is too long'),
  body('medicines.*.instructions').optional().trim().isLength({ max: 500 }).withMessage('Medicine instructions are too long'),
];

export const reportValidators = [
  body('visitRecordId').isMongoId().withMessage('Valid visit record ID is required'),
  body('reportName').trim().isLength({ min: 1, max: 200 }).withMessage('Report name is required'),
  optionalText('testCategory', 100),
  optionalText('laboratory', 200),
  optionalText('description', 5000),
  optionalText('reportNotes', 5000),
  body('reportDate').optional().isISO8601().withMessage('Invalid report date'),
  body('fileMetadata').optional().isObject().withMessage('File metadata must be an object'),
  body('fileMetadata.fileName').optional().trim().isLength({ max: 255 }).withMessage('Invalid file name'),
  body('fileMetadata.mimeType').optional().trim().isIn(['application/pdf', 'image/jpeg', 'image/png']).withMessage('Unsupported file type'),
  body('fileMetadata.sizeBytes').optional().isInt({ min: 0, max: 10 * 1024 * 1024 }).withMessage('File size must not exceed 10 MB').toInt(),
];

export const reportStatusValidator = [
  mongoId('id'),
  body('status').isIn(['requested', 'pending', 'completed', 'verified']).withMessage('Invalid report status'),
];

export const reportUpdateValidators = [
  param('id').isMongoId().withMessage('Valid report ID is required'),
  optionalText('reportName', 200),
  optionalText('testCategory', 100),
  optionalText('laboratory', 200),
  optionalText('description', 5000),
  optionalText('reportNotes', 5000),
  optionalText('findings', 10000),
  optionalText('observations', 10000),
  optionalText('doctorNotes', 10000),
  body('reportDate').optional().isISO8601().withMessage('Invalid report date'),
  body('results').optional().isArray({ max: 100 }).withMessage('Results must be an array'),
];

export const patientHistoryValidator = [
  query('patientId').isMongoId().withMessage('Valid patient ID is required'),
  query('from').optional().isISO8601().withMessage('Invalid start date'),
  query('to').optional().isISO8601().withMessage('Invalid end date'),
  query('type').optional().isIn(['all', 'visits', 'notes', 'prescriptions', 'reports', 'appointments']).withMessage('Invalid record type'),
];
