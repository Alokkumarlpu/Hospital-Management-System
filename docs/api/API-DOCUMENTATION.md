# API Documentation

The API is a cookie-authenticated Express REST service under `/api`. Every protected endpoint requires an active server-side session. Responses use `{ success, ... }`; list endpoints additionally return `data` and `pagination`.

## Modules

- Authentication: `/auth`
- Management: `/patients`, `/doctors`, `/departments`, `/users`
- Scheduling: `/doctor-schedules`, `/appointments`
- Clinical: `/visits`, `/clinical-notes`, `/prescriptions`, `/diagnostic-reports`, `/history`
- Billing: `/invoices`, `/payments`, `/billing`
- Patient portal: `/patient-portal`
- Phase 7 reporting: see [PHASE-7-API.md](./PHASE-7-API.md)

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

Notification history and password-reset delivery are intentionally not fabricated: this installation currently exposes `GET /patient-portal/notifications` with `available: false`. A production deployment should add a notification store/event worker and a verified email/SMS reset-token delivery service before enabling those features.
