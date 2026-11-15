# Phase 6 Billing API

All billing endpoints require authentication. Administrators and front-desk users can perform financial changes. Clinicians can only read permitted patient billing information and cannot create payments, cancel invoices, or issue refunds.

## Invoices

| Method | Endpoint | Access |
| --- | --- | --- |
| POST | `/api/invoices` | Admin, front desk |
| GET | `/api/invoices` | Admin, front desk, clinician |
| GET | `/api/invoices/:id` | Admin, front desk, assigned clinician |
| GET | `/api/invoices/patient/:patientId` | Admin, front desk, assigned clinician |
| PUT | `/api/invoices/:id` | Admin, front desk |
| PATCH | `/api/invoices/:id/cancel` | Admin, front desk |

Invoice creation requires an active `patientId` and one or more line items. `subtotal`, line item amounts, `totalAmount`, `amountPaid`, and `outstandingBalance` are calculated or controlled by the backend. Submitted line-item amounts and totals are not trusted.

Invoice statuses are `draft`, `unpaid`, `partially_paid`, `paid`, `cancelled`, and `overdue`. Paid or partially paid invoices cannot be edited or cancelled.

## Simulated payments

| Method | Endpoint | Access |
| --- | --- | --- |
| POST | `/api/payments` | Admin, front desk |
| GET | `/api/payments` | Admin, front desk, clinician |
| GET | `/api/payments/:id` | Admin, front desk, assigned clinician |
| GET | `/api/payments/invoice/:invoiceId` | Admin, front desk, assigned clinician |
| GET | `/api/payments/patient/:patientId` | Admin, front desk, assigned clinician |
| POST | `/api/payments/:id/refund` | Admin, front desk |

Supported methods are `cash`, `card`, `upi`, and `net_banking`. Send an `Idempotency-Key` header or `idempotencyKey` body value for payment creation. `simulateStatus` accepts `successful` or `failed`; failed payments never change invoice balances.

Payments use generated internal transaction references. The API never accepts card numbers, UPI PINs, passwords, banking credentials, or real gateway tokens.

## Billing reports

| Method | Endpoint | Access |
| --- | --- | --- |
| GET | `/api/billing/dashboard` | Admin, front desk |
| GET | `/api/billing/reports` | Admin, front desk |
| GET | `/api/billing/outstanding` | Admin, front desk |

Reports use MongoDB aggregation. Filters include invoice status, invoice date range, patient, payment method, and payment status where applicable.

## Integrity and refunds

Successful payments use a MongoDB transaction when the deployment supports transactions. On standalone MongoDB, the implementation detects unsupported transactions and uses atomic conditional invoice increments, unique idempotency indexes, and compensating updates if payment persistence fails. A payment is rejected with `409 Conflict` when it exceeds the current balance or duplicates an idempotency key.

Refunds preserve the original payment and append a refund record. Refund idempotency keys prevent duplicate refunds, and refunded amounts cannot exceed the successful payment’s remaining refundable amount.
