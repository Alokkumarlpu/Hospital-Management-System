# Phase 7 Reporting and Audit API

All endpoints require the existing session authentication unless noted otherwise.

| Endpoint | Access | Purpose |
| --- | --- | --- |
| `GET /api/audit-logs` | Admin | Paginated audit records; supports `search`, `action`, `entityType`, `entityId`, `from`, `to`, `page`, `limit`, and `format=csv`. |
| `GET /api/reports/appointments/summary` | Admin, front desk, clinician | Appointment totals and status counts. |
| `GET /api/reports/appointments/trends` | Admin, front desk, clinician | Daily appointment counts. |
| `GET /api/reports/appointments/by-department` | Admin, front desk, clinician | Appointment counts grouped by department. |
| `GET /api/reports/appointments/by-doctor` | Admin, front desk, clinician | Appointment counts grouped by doctor. |
| `GET /api/reports/billing/summary` | Admin, front desk | Invoice, collection, outstanding, and status totals. |
| `GET /api/reports/billing/revenue-trends` | Admin, front desk | Daily successful-payment revenue after refunds. |
| `GET /api/reports/billing/invoice-status` | Admin, front desk | Invoice status distribution. |
| `GET /api/reports/billing/payment-methods` | Admin, front desk | Successful payment methods after refunds. |
| `GET /api/dashboard/summary` | Admin, front desk, clinician | Role-scoped dashboard totals and administrator recent audit activity. |

Date filters use UTC day boundaries and reject invalid or reversed ranges. Report responses use `{ success: true, summary|trends|departments|doctors|statuses|methods|dashboard }`. Pagination responses use the existing `data` and `pagination` structure.
