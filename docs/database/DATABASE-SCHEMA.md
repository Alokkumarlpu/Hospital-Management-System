# Database Schema

MongoDB stores the application records as Mongoose collections. Public identifiers (`PAT-*`, `DOC-*`, `APT-*`, `INV-*`, `PAY-*`, and `VIS-*`) are unique human-readable references; relationships use `ObjectId` references.

## Core relationships

- Users may have one patient or doctor profile and create appointments, clinical records, invoices, notifications, and audit entries.
- Departments contain doctors and appointments.
- Patients have appointments, visits, prescriptions, diagnostic reports, invoices, and payments.
- Appointments may produce one visit record and one invoice.
- Invoices have many payments; payments support idempotent refunds.
- Audit logs reference the actor and optionally the affected entity.
- Documents reference their source prescription, diagnostic report, visit, or invoice and store generation, release, availability, and protected storage metadata.
- Notifications reference the recipient user and use a deduplication key for repeat-safe workflow notifications.

## Integrity and indexes

Unique indexes protect public identifiers, user email, invoice appointment references, payment transaction/idempotency keys, and active doctor time slots. Query indexes cover patient history, appointment scheduling, invoice status/due dates, payments, documents, notifications, and audit filtering. See the [ER diagram](./ER-Diagram.md) for the visual model.

## Clinical document fields

`Prescription` stores medicines as structured rows containing medicine name, dosage, frequency, duration, route, instructions, and quantity. `DiagnosticReport` stores structured result rows containing parameter name, result value, unit, reference range, and result status, together with findings, observations, report notes, and release status.

`Document` stores the generated document identifier, source relationship, storage key, generation status, release status, release timestamp, and role availability flags. The binary PDF is stored outside MongoDB; MongoDB stores its secure reference and metadata.

## Schema evolution

There are no destructive migrations in this repository. Mongoose creates/updates indexes during normal application startup. Production deployments should use a controlled migration process before changing indexes or removing fields.
