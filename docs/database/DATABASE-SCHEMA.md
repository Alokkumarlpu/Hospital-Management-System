# Database Schema

MongoDB stores the application records as Mongoose collections. Public identifiers (`PAT-*`, `DOC-*`, `APT-*`, `INV-*`, `PAY-*`, and `VIS-*`) are unique human-readable references; relationships use `ObjectId` references.

## Core relationships

- Users may have one doctor profile and create appointments, clinical records, invoices, and audit entries.
- Departments contain doctors and appointments.
- Patients have appointments, visits, prescriptions, diagnostic reports, invoices, and payments.
- Appointments may produce one visit record and one invoice.
- Invoices have many payments; payments support idempotent refunds.
- Audit logs reference the actor and optionally the affected entity.

## Integrity and indexes

Unique indexes protect public identifiers, user email, invoice appointment references, payment transaction/idempotency keys, and active doctor time slots. Query indexes cover patient history, appointment scheduling, invoice status/due dates, payments, and audit filtering. See the [ER diagram](./ER-Diagram.md) for the visual model.
