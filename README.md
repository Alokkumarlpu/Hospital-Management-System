# Hospital Management System

CareAxis is a synthetic-data MERN hospital management system with role-based workspaces for patients, front desk staff, clinicians, and administrators.

## Technology stack

- **Frontend:** React, Vite, Tailwind CSS, React Router DOM, Axios, Lucide React
- **Backend:** Node.js, Express, JavaScript ES modules
- **Database:** MongoDB with Mongoose
- **Development:** Git, GitHub, VS Code, Postman

## Structure

```text
frontend/  React/Vite/Tailwind client
backend/   Express API, configuration, models, seeders, storage, and tests
docs/      Database, architecture, API, and submission documentation
```

## Prerequisites

- Node.js 20 or newer and npm
- MongoDB 7+ running locally or a MongoDB Atlas URI

## Installation

```bash
cd frontend && npm install
cd ../backend && npm install
```

Copy `backend/.env.example` to `backend/.env` and set values. Never commit `.env`.

| Variable | Description |
| --- | --- |
| `PORT` | Express port, normally `5000` |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret used to sign JWT sessions; use a long random value |
| `CLIENT_URL` | Frontend origin, normally `http://localhost:5173` |
| `NODE_ENV` | `development`, `test`, or `production` |

Optional frontend configuration can be supplied in `frontend/.env`:

| Variable | Description |
| --- | --- |
| `VITE_API_URL` | API base URL; defaults to `http://localhost:5000/api` |

## Run

In one terminal:

```bash
cd backend
npm run dev
```

Open `http://localhost:5173`.

In another terminal:

```bash
cd frontend
npm run dev
```

The API health check is `GET http://localhost:5000/api/health` and returns:

```json
{ "success": true, "message": "Hospital Management System API is running" }
```

## Database and seed data

With MongoDB running and `backend/.env` configured:

```bash
cd backend
npm run seed
```

The seed is repeatable: it clears only the seeded collections, then creates synthetic administrator, front-desk, clinician, department, doctor, patient, and schedule records. All values use `example.test` or dummy phone numbers; no real patient data is included.

To confirm all model modules compile without connecting to MongoDB:

```bash
npm run compile-models
```

See the [ER diagram](docs/database/ER-Diagram.md) and [system architecture](docs/architecture/SYSTEM-ARCHITECTURE.md) for relationships, indexes, and appointment concurrency decisions.
Additional submission documentation is available in the [database schema](docs/database/DATABASE-SCHEMA.md), [API documentation](docs/api/API-DOCUMENTATION.md), [architecture diagram](docs/architecture/SYSTEM-ARCHITECTURE-DIAGRAM.md), [appointment workflow](docs/architecture/APPOINTMENT-WORKFLOW.md), [walkthrough script](docs/SUBMISSION-WALKTHROUGH-SCRIPT.md), and [final technical report](FINAL-TECHNICAL-REPORT.md).

## Authentication and authorization

The system provides cookie-based JWT authentication with server-side session records:

- `httpOnly` cookies prevent JavaScript access to the token.
- `secure` and `SameSite=None` are enabled in production; local development uses `SameSite=Lax`.
- Each JWT has a unique ID and matching hashed session record. Logout revokes that record, so clearing a browser cookie is not the invalidation mechanism.
- Tokens expire according to `JWT_EXPIRES_IN` (default `1d`); password changes and deactivation revoke all sessions for the user.
- Passwords are hashed with bcrypt and password hashes are excluded from normal queries and all API responses.

Available roles:

- **admin:** user management and privileged account/role changes.
- **front_desk:** patient registration, appointment workflows, and permitted directories.
- **clinician:** assigned appointments and clinical records for assigned patients.
- **patient:** self-service appointments, medical records, prescriptions, reports, and billing.

### Authentication endpoints

| Method | Endpoint | Access |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Public; always creates `front_desk` unless an authenticated admin supplies a role |
| `POST` | `/api/auth/login` | Public |
| `POST` | `/api/auth/logout` | Authenticated session or idempotent public request |
| `GET` | `/api/auth/me` | Authenticated |
| `GET` | `/api/auth/profile` | Authenticated |
| `PUT` | `/api/auth/profile` | Authenticated; personal fields only |
| `PUT` | `/api/auth/change-password` | Authenticated |
| `GET` | `/api/users` | Admin |
| `GET` | `/api/users/:id` | Admin |
| `PUT` | `/api/users/:id` | Admin |
| `PATCH` | `/api/users/:id/status` | Admin |

Authentication endpoints are rate limited. Generic login errors avoid revealing whether an email exists. Role authorization is enforced by backend middleware, not frontend visibility.

### Demo accounts

The seed script creates synthetic accounts. The shared development password is `DevelopmentOnly123!`:

- `admin@example.test`
- `frontdesk1@example.test`
- `frontdesk2@example.test`
- `clinician1@example.test` through `clinician5@example.test`
- `patient1@example.test`

The registration screen supports Front Desk and Clinician workspaces. Patient accounts use the separate patient registration flow. Administrator accounts remain provisioned by an administrator or the seed script.

Change or remove these credentials before any non-development use. To seed, configure `backend/.env` and run `npm run seed` from `backend/`.

### Authentication testing

Run static checks:

```bash
cd backend
npm run compile-models
npm test
```

Use Postman or the frontend against a configured MongoDB instance to exercise registration, login, logout, `/api/auth/me`, password changes, inactive-account rejection, admin-only user endpoints, and cross-role denial. End-to-end auth execution requires `MONGODB_URI`; this repository does not include credentials or an actual `.env`.

## Phase 3 management modules

Patient, doctor, and department management are now available through protected APIs and responsive pages.

```bash
GET    /api/patients
POST   /api/patients
GET    /api/patients/:id
PUT    /api/patients/:id
PATCH  /api/patients/:id/status

GET    /api/doctors
POST   /api/doctors
GET    /api/doctors/:id
PUT    /api/doctors/:id
PATCH  /api/doctors/:id/status

GET    /api/departments
POST   /api/departments
GET    /api/departments/:id
PUT    /api/departments/:id
PATCH  /api/departments/:id/status
```

All endpoints require authentication. Admins manage all three resources; front desk users manage patients and read doctor/department directories; clinicians have limited patient read access and read-only directories. Search supports `search`, and list endpoints support `page` and `limit`. See [the Phase 3 API reference](docs/api/PHASE-3-API.md) and the [final technical report](FINAL-TECHNICAL-REPORT.md).

## Phase 4 scheduling modules

Doctor schedules and appointment scheduling are now available:

```text
POST   /api/doctor-schedules
GET    /api/doctor-schedules
PUT    /api/doctor-schedules/:id
DELETE /api/doctor-schedules/:id

GET    /api/appointments/available-slots
POST   /api/appointments
GET    /api/appointments
GET    /api/appointments/:id
PUT    /api/appointments/:id
PATCH  /api/appointments/:id/status
PATCH  /api/appointments/:id/reschedule
PATCH  /api/appointments/:id/cancel
```

Appointment creation validates active references, doctor schedules, breaks, past dates, patient conflicts, and doctor conflicts. Concurrent requests are serialized with a short-lived atomic doctor lock; cancelled appointments release their time slots. See [the Phase 4 API reference](docs/api/PHASE-4-API.md) and the [appointment workflow](docs/architecture/APPOINTMENT-WORKFLOW.md).

## Clinical, document, and notification modules

Clinical workflows are available through protected APIs and responsive pages:

```text
POST   /api/visits
GET    /api/visits
PUT    /api/visits/:id
POST   /api/clinical-notes
POST   /api/prescriptions
GET    /api/prescriptions
POST   /api/diagnostic-reports
PUT    /api/diagnostic-reports/:id
PATCH  /api/diagnostic-reports/:id/status
POST   /api/diagnostic-reports/:id/release
GET    /api/history?patientId=<id>

GET    /api/documents
GET    /api/documents/:id
GET    /api/documents/:id/download
POST   /api/documents/:type/:id/generate

GET    /api/notifications
PATCH  /api/notifications/read-all
PATCH  /api/notifications/:id/read
```

Clinicians can create and modify assigned clinical records. Administrators have read-only clinical access, and front-desk users cannot access clinical records. Diagnostic reports use structured result rows and the lifecycle `requested`, `pending`, `completed`, `verified`, `released`, or `cancelled`. Released prescriptions, diagnostic reports, visit summaries, and invoices are generated server-side as CareAxis-branded PDFs and served through authenticated download routes. See the [API reference](docs/api/API-DOCUMENTATION.md).

## Phase 6 billing modules

Billing workflows are available through protected APIs and responsive pages:

```text
POST   /api/invoices
GET    /api/invoices
PUT    /api/invoices/:id
PATCH  /api/invoices/:id/cancel
POST   /api/payments
GET    /api/payments
POST   /api/payments/:id/refund
GET    /api/billing/dashboard
GET    /api/billing/reports
GET    /api/billing/outstanding
```

## Phase 7 audit, analytics, and reporting

Phase 7 adds centralized audit events, role-scoped dashboards, server-side appointment and billing reports, and administrator-only audit review:

```text
GET    /api/audit-logs
GET    /api/reports/appointments/summary
GET    /api/reports/appointments/trends
GET    /api/reports/appointments/by-department
GET    /api/reports/appointments/by-doctor
GET    /api/reports/billing/summary
GET    /api/reports/billing/revenue-trends
GET    /api/reports/billing/invoice-status
GET    /api/reports/billing/payment-methods
GET    /api/dashboard/summary
```

Reports accept UTC date filters through `from` and `to` query parameters. Successful payments are counted after refunds; failed payments are excluded. Audit exports use CSV formula-injection protection and omit secrets and clinical content. See the [Phase 7 API reference](docs/api/PHASE-7-API.md) and the [final technical report](FINAL-TECHNICAL-REPORT.md).

Invoice totals and balances are calculated on the backend. Simulated payments support partial payments, failed transactions, idempotency keys, concurrent balance protection, and refunds. No real payment provider or financial credential collection is used. See [the Phase 6 API reference](docs/api/PHASE-6-API.md) and the [final technical report](FINAL-TECHNICAL-REPORT.md).

## Phase 6 boundary

Phase 6 does not integrate real payment gateways, collect payment credentials, or start reporting/analytics work beyond billing reports.

## Tests and verification

```bash
cd backend
npm run compile-models
npm test -- --runInBand

cd ../frontend
npm run build
```

The backend suite covers authentication, management APIs, scheduling conflicts, clinical ownership, billing/payment edge cases, reporting, PDF linkage, and role authorization. The frontend has a production build check but no separate browser-test or lint script.

## Submission and known limitations

- There is no hosted demo URL; use the local run steps above.
- All demo accounts use the dummy password `DevelopmentOnly123!` and must never be used outside development.
- MongoDB schema evolution uses Mongoose schemas; no separate migration runner is included.
- Generated PDFs use protected local storage under `backend/storage/documents/`; production deployment should replace this with private object storage.
- Payments are simulated and do not accept real financial credentials.
- A 3–5 minute recording must be made from the [walkthrough script](docs/SUBMISSION-WALKTHROUGH-SCRIPT.md); no external video URL is included in this repository.
