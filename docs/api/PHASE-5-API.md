# Phase 5 Clinical API

All endpoints require an authenticated session. Administrators may read clinical records for administrative purposes. Clinicians may read and write records for patients assigned to their linked doctor profile. Front-desk users cannot access clinical endpoints.

## Visit records

| Method | Endpoint | Access |
| --- | --- | --- |
| POST | `/api/visits` | Clinician |
| GET | `/api/visits` | Admin, clinician |
| GET | `/api/visits/:id` | Admin, assigned clinician |
| GET | `/api/visits/patient/:patientId` | Admin, assigned clinician |
| GET | `/api/visits/appointment/:appointmentId` | Admin, assigned clinician |
| PUT | `/api/visits/:id` | Assigned clinician |

Visit creation requires `patientId` and `appointmentId`. The appointment determines the doctor, and the API rejects mismatched patient/doctor references and duplicate visits for an appointment.

## Clinical notes

| Method | Endpoint | Access |
| --- | --- | --- |
| POST | `/api/clinical-notes` | Clinician |
| GET | `/api/clinical-notes/visit/:visitId` | Admin, assigned clinician |
| GET | `/api/clinical-notes/patient/:patientId` | Admin, assigned clinician |
| PUT | `/api/clinical-notes/:id` | Assigned clinician |

## Prescriptions

| Method | Endpoint | Access |
| --- | --- | --- |
| POST | `/api/prescriptions` | Clinician |
| GET | `/api/prescriptions` | Admin, clinician |
| GET | `/api/prescriptions/:id` | Admin, assigned clinician |
| GET | `/api/prescriptions/patient/:patientId` | Admin, assigned clinician |
| GET | `/api/prescriptions/visit/:visitId` | Admin, assigned clinician |
| PUT | `/api/prescriptions/:id` | Assigned clinician |

Prescription medicines require `medicineName`, `dosage`, `frequency`, and `duration`. Multiple medicines are supported in one request.

## Diagnostic reports

| Method | Endpoint | Access |
| --- | --- | --- |
| POST | `/api/diagnostic-reports` | Clinician |
| GET | `/api/diagnostic-reports` | Admin, clinician |
| GET | `/api/diagnostic-reports/:id` | Admin, assigned clinician |
| GET | `/api/diagnostic-reports/patient/:patientId` | Admin, assigned clinician |
| GET | `/api/diagnostic-reports/visit/:visitId` | Admin, assigned clinician |
| PATCH | `/api/diagnostic-reports/:id/status` | Assigned clinician |

Report statuses are `requested`, `pending`, `completed`, and `cancelled`. File metadata is validated for PDF/JPEG/PNG and a maximum size of 10 MB, but no upload or public file-serving endpoint is enabled because secure storage is not configured.

## Patient history

`GET /api/history?patientId=<id>&type=all&from=YYYY-MM-DD&to=YYYY-MM-DD` returns visits, notes, prescriptions, diagnostic report metadata, and appointment history from MongoDB. `type` may be `all`, `visits`, `notes`, `prescriptions`, `reports`, or `appointments`.

## Data protection

Record updates are rejected when `lockedAt` is set. Clinical ownership is checked server-side using the doctor linked to the authenticated clinician and the appointment/visit patient relationship. Audit logs record clinical record creation, updates, and report status changes without copying clinical text.
