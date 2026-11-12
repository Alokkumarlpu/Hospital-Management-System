# Phase 4 Scheduling API

All scheduling endpoints require the Phase 2 authentication cookie. Dates use `YYYY-MM-DD`; times use 24-hour `HH:MM`.

## Doctor schedules

| Method | Path | Roles | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/doctor-schedules` | admin | Create a working period |
| `GET` | `/api/doctor-schedules?doctorId=` | admin, front_desk, clinician | List schedules; clinicians are restricted to their own doctor |
| `GET` | `/api/doctor-schedules/:id` | authenticated | View schedule |
| `PUT` | `/api/doctor-schedules/:id` | admin | Update schedule |
| `DELETE` | `/api/doctor-schedules/:id` | admin | Soft-deactivate schedule |

Example:

```json
{
  "doctorId": "ObjectId",
  "workingDay": "monday",
  "startTime": "09:00",
  "endTime": "17:00",
  "slotDuration": 30,
  "breakStartTime": "13:00",
  "breakEndTime": "14:00"
}
```

Schedules reject invalid ranges, breaks outside working hours, overlaps for the same doctor/day, and inactive doctors.

## Availability

```text
GET /api/appointments/available-slots?doctorId=ObjectId&date=2026-12-01&departmentId=ObjectId
```

The response contains only future slots within active working periods, excluding breaks and active appointments.

## Appointments

| Method | Path | Roles | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/appointments` | admin, front_desk | Book appointment |
| `GET` | `/api/appointments` | admin, front_desk, clinician | Paginated/filterable list |
| `GET` | `/api/appointments/:id` | admin, front_desk, assigned clinician | Details |
| `PUT` | `/api/appointments/:id` | admin, front_desk | Update reason/type |
| `PATCH` | `/api/appointments/:id/status` | role-dependent | Valid status transition |
| `PATCH` | `/api/appointments/:id/reschedule` | admin, front_desk | Rebook date/time/doctor |
| `PATCH` | `/api/appointments/:id/cancel` | admin, front_desk | Cancel with reason |

Booking example:

```json
{
  "patientId": "ObjectId",
  "doctorId": "ObjectId",
  "departmentId": "ObjectId",
  "appointmentDate": "2026-12-01",
  "startTime": "09:00",
  "endTime": "09:30",
  "appointmentType": "consultation",
  "reason": "Synthetic example"
}
```

List filters include `page`, `limit`, `doctorId`, `patientId`, `departmentId`, `date`, `status`, and `search`. Search matches appointment ID, patient name, and patient ID.

## Status transitions

```text
scheduled  -> confirmed | cancelled | no_show
confirmed  -> checked_in | cancelled | no_show
checked_in -> in_progress | cancelled
in_progress -> completed
```

Front desk controls confirmation, check-in, cancellation, and no-show. Clinicians control in-progress and completed transitions for appointments assigned to them. Administrators may perform role-appropriate transitions, but invalid transitions remain rejected.

## Conflict prevention

The backend rejects conflicts using:

```text
existing.startTime < requested.endTime
AND existing.endTime > requested.startTime
```

Cancelled appointments are excluded. Before checking conflicts and inserting, booking acquires an atomic short-lived lock on the doctor document using `findOneAndUpdate`. Only one request can hold the lock; the lock is released in a `finally` block and expires after 15 seconds if a process crashes. A unique active `slotKey` index provides an additional exact-slot safeguard. Conflicts return HTTP `409`.
