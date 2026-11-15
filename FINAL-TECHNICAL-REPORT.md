# CareAxis Final Technical Report

## Objective

Deliver a synthetic-data hospital management system covering authentication, role-based management, scheduling, clinical records, prescriptions, diagnostic reports, secure PDFs, billing, notifications, audit logging, analytics, and reporting.

## Architecture

The system uses React/Vite/Tailwind on the frontend and Node.js/Express/Mongoose/MongoDB on the backend. The frontend has a shared `/profile` route for every authenticated role, a patient portal, and management layouts for admin, front desk, and clinician workspaces. Backend middleware performs authentication, role authorization, validation, rate limiting, Helmet configuration, and centralized error handling. See the [architecture overview](docs/architecture/SYSTEM-ARCHITECTURE.md), [architecture diagram](docs/architecture/SYSTEM-ARCHITECTURE-DIAGRAM.md), and [ER diagram](docs/database/ER-Diagram.md).

## Security

Passwords are bcrypt-hashed, JWT sessions are stored server-side with token hashes, logout revokes sessions, inactive accounts are rejected, and sensitive routes enforce backend RBAC. Patient ownership is derived from the authenticated user and not trusted from arbitrary frontend patient IDs. Audit logs sanitize secret-like metadata and are administrator-only. Document downloads require authenticated ownership or an authorized management/clinician relationship. Payment records are simulated and contain no payment credentials.

## Testing

Executed verification:

- `backend/npm run compile-models`: passed
- `backend/npm test -- --runInBand`: passed, 6 suites and 22 tests
- `frontend/npm run build`: passed
- `git diff --check`: passed

The backend tests cover authentication, role authorization, management APIs, scheduling conflicts, clinical ownership, billing/payment edge cases, report/PDF linkage, and reporting. The frontend has no configured browser-test, lint, or type-check script; manual walkthrough coverage is documented in the [submission walkthrough script](docs/SUBMISSION-WALKTHROUGH-SCRIPT.md).

## Design decisions

- Server-side sessions combine JWT claims with hashed session records so logout and password changes can revoke access.
- Appointment conflicts use normalized slots and database-backed locking/unique constraints.
- Clinical records remain structured MongoDB documents rather than flattened text.
- PDF generation occurs server-side from finalized records. A report is not released until its PDF is generated and stored.
- Patient-facing document lists and downloads enforce patient ownership and release status.
- Notifications are persisted and deduplicated by workflow event.
- Local development uses protected filesystem storage for PDFs; production should use private object storage.

## Submission notes

The application is intended for local evaluation with MongoDB and synthetic seed data. There is no hosted demo URL. Demo credentials, setup, environment variables, tests, known limitations, and local run commands are documented in [README.md](README.md). The [API documentation](docs/api/API-DOCUMENTATION.md) and [database schema](docs/database/DATABASE-SCHEMA.md) are included in the repository.
