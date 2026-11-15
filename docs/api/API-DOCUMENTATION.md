# CareAxis API Documentation

The API is a cookie-authenticated Express REST service under `/api`. Every protected endpoint requires an active server-side session. Responses use `{ success, ... }`; list endpoints additionally return `data` and `pagination`.

## Modules

- Authentication: `/auth`
- Management: `/patients`, `/doctors`, `/departments`, `/users`
- Scheduling: `/doctor-schedules`, `/appointments`
- Clinical: `/visits`, `/clinical-notes`, `/prescriptions`, `/diagnostic-reports`, `/history`
- Billing: `/invoices`, `/payments`, `/billing`
- Patient portal: `/patient-portal`
- Documents: `/documents`
- Notifications: `/notifications`
- Reporting: see [PHASE-7-API.md](./PHASE-7-API.md)

Validation errors return HTTP 400, unauthenticated requests return 401, forbidden roles return 403, missing resources return 404, and business conflicts return 409. Production error responses do not include stack traces.

## Patient portal

Patient accounts use `role: patient` and a verified `User.patientId` association. New patients may register at `POST /auth/patient/register`; existing records must be linked with a one-time invitation token created by `POST /patient-portal/invites` (Front Desk or Admin only). Patient login uses the existing `POST /auth/login` endpoint and the normal session cookie.

All endpoints below require an authenticated patient session and derive ownership from `User.patientId`; client-supplied patient IDs are ignored:

- `GET /patient-portal/dashboard`
- `GET|PUT /patient-portal/profile`
- `GET /patient-portal/doctors`, `/patient-portal/departments`, `/patient-portal/available-slots`
- `POST /patient-portal/appointments`, `GET /patient-portal/appointments`
- `PATCH /patient-portal/appointments/:id/cancel`, `/reschedule`
- `GET /patient-portal/records`, `/prescriptions`, `/reports`
- `GET /patient-portal/invoices`, `/payments`
- `POST /patient-portal/payments` for simulated, idempotent invoice payments

Patient notifications are persisted in the `Notification` collection and are scoped to the authenticated user. The patient portal exposes `GET /patient-portal/notifications`, `PATCH /patient-portal/notifications/:id/read`, and `PATCH /patient-portal/notifications/read-all`.

## Profile

The shared profile route is `/profile` for every authenticated role. The API is role-aware but derives the account identity from the authenticated session:

- `GET /auth/profile`
- `PUT /auth/profile`
- `PUT /auth/change-password`

Only personal/contact fields and the profile photo may be updated through the profile endpoint. Roles, permissions, clinical credentials, and protected identifiers remain server-controlled.

## Clinical document lifecycle

Clinicians create and update structured prescriptions and diagnostic reports. Diagnostic report statuses are:

`requested -> pending -> completed -> verified -> released`

`cancelled` is terminal. A report cannot be released unless it is verified and contains report data. Release generates a PDF first, stores its protected storage reference in `Document`, links the document back to the source report, and only then marks the report as released. Patients can list or download only released documents belonging to their authenticated patient record.

Document endpoints:

| Method | Endpoint | Access |
| --- | --- | --- |
| `GET` | `/documents` | Authenticated; patient results are owner-scoped |
| `GET` | `/documents/:id` | Authenticated and authorized |
| `GET` | `/documents/:id/download` | Authenticated and authorized |
| `POST` | `/documents/:type/:id/generate` | Admin, front desk, or clinician |

Supported document types are `prescription`, `diagnostic_report`, `visit_summary`, and `invoice`. PDFs are generated with structured MongoDB records and stored under protected local storage in development.
