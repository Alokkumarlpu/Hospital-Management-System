# Database ER Diagram

The schema uses MongoDB collections with Mongoose `ObjectId` references. References are kept explicit so records can be populated when needed without duplicating mutable patient or clinician data.

```mermaid
erDiagram
    USER ||--o| DOCTOR : "profile for"
    USER ||--o{ APPOINTMENT : creates
    USER ||--o{ AUDIT_LOG : generates
    DEPARTMENT ||--o{ DOCTOR : contains
    DEPARTMENT ||--o{ APPOINTMENT : categorizes
    DOCTOR ||--o{ APPOINTMENT : attends
    PATIENT ||--o{ APPOINTMENT : books
    DOCTOR ||--o{ DOCTOR_SCHEDULE : has
    APPOINTMENT ||--o| VISIT_RECORD : results_in
    PATIENT ||--o{ VISIT_RECORD : has
    DOCTOR ||--o{ VISIT_RECORD : authors
    VISIT_RECORD ||--o{ CLINICAL_NOTE : documents
    VISIT_RECORD ||--o{ PRESCRIPTION : includes
    PATIENT ||--o{ PRESCRIPTION : receives
    DOCTOR ||--o{ PRESCRIPTION : writes
    VISIT_RECORD ||--o{ DIAGNOSTIC_REPORT : includes
    PATIENT ||--o{ DIAGNOSTIC_REPORT : owns
    DOCTOR ||--o{ DIAGNOSTIC_REPORT : orders
    APPOINTMENT ||--o| INVOICE : billed_by
    PATIENT ||--o{ INVOICE : billed
    INVOICE ||--o{ PAYMENT : receives
    PATIENT ||--o{ PAYMENT : makes
    USER {
      ObjectId _id PK
      string email UK
      string role
    }
    PATIENT {
      ObjectId _id PK
      string patientId UK
      string name
      string bloodGroup
      boolean isActive
      date dateOfBirth
    }
    DOCTOR {
      ObjectId _id PK
      string doctorId UK
      ObjectId userId FK
      ObjectId departmentId FK
    }
    DEPARTMENT {
      ObjectId _id PK
      string departmentCode UK
      string departmentName UK
      boolean isActive
    }
    APPOINTMENT {
      ObjectId _id PK
      string appointmentId UK
      ObjectId doctorId FK
      ObjectId patientId FK
      string slotKey
      date appointmentDate
      string startTime
      string endTime
      string status
    }
    DOCTOR_SCHEDULE {
      ObjectId _id PK
      ObjectId doctorId FK
      string workingDay
      string startTime
      string endTime
      string breakStartTime
      string breakEndTime
      int slotDuration
    }
    VISIT_RECORD {
      ObjectId _id PK
      string visitId UK
      ObjectId appointmentId FK
      ObjectId patientId FK
      ObjectId doctorId FK
      date visitDate
      date lockedAt
    }
    CLINICAL_NOTE {
      ObjectId _id PK
      ObjectId visitRecordId FK
      ObjectId patientId FK
      ObjectId doctorId FK
    }
    PRESCRIPTION {
      ObjectId _id PK
      string prescriptionId UK
      ObjectId visitRecordId FK
      string status
    }
    DIAGNOSTIC_REPORT {
      ObjectId _id PK
      string reportId UK
      ObjectId visitRecordId FK
      string status
    }
    INVOICE {
      ObjectId _id PK
      string invoiceNumber UK
      ObjectId appointmentId FK
      ObjectId visitRecordId FK
      date dueDate
      decimal totalAmount
      decimal amountPaid
      decimal outstandingBalance
      string status
    }
    PAYMENT {
      ObjectId _id PK
      string paymentId UK
      ObjectId invoiceId FK
      string transactionReference UK
      string idempotencyKey UK
      decimal amount
      string paymentStatus
      decimal refundedAmount
    }
    AUDIT_LOG {
      ObjectId _id PK
      ObjectId userId FK
      ObjectId entityId
    }
```

## Integrity decisions

- Business identifiers and user email have unique indexes.
- Search-oriented text/compound indexes cover patient and doctor lookup.
- Appointment queries are indexed by doctor, date, time, and status.
- Appointment creation in the implementation phase will normalize a requested appointment to a schedule slot and derive `slotKey` as `doctorId + date + startTime`. The partial unique index on active (`scheduled` or `confirmed`) appointments rejects concurrent duplicate inserts with MongoDB duplicate-key error `11000`. The booking service must translate that error to a conflict response.
- When a booking also updates related records, the service will use a MongoDB transaction with `session.withTransaction()`. Availability checks remain advisory; the unique index is the concurrency boundary.
- Invoice appointment and visit-record appointment references are unique to enforce one invoice and one visit record per appointment. Payments remain one-to-many to support retries and partial payments.
- Clinical records use public unique identifiers, author references, and optional `lockedAt` fields. Clinician access is checked through the doctor linked to the authenticated user and the appointment/visit patient relationship.
- Diagnostic reports currently store metadata only. File metadata is validated, but private file storage and authenticated download are intentionally deferred until secure object storage is configured.
- Invoice amounts are recalculated from line items on the backend. Payment and refund idempotency keys are unique, and invoice balance changes use conditional atomic updates when transactions are unavailable.
- Payment records are simulated only and contain no card, UPI PIN, password, or banking credential fields.
