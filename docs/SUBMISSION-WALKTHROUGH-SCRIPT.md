# CareAxis 3–5 Minute Walkthrough Script

This script is intended for recording the required submission walkthrough. Use only the seeded dummy accounts and do not display real credentials or personal data.

## 0:00–0:30 — Start-up and architecture

1. Show the repository root with `frontend`, `backend`, `docs`, and `README.md`.
2. Show the two running local URLs:
   - Frontend: `http://localhost:5173`
   - API health: `http://localhost:5000/api/health`
3. Briefly explain the React/Vite frontend, Express/Mongoose backend, MongoDB persistence, and server-side session authentication.

## 0:30–1:15 — Role-based access

1. Sign in with `admin@example.test`.
2. Show the admin dashboard, management navigation, notifications, and the shared `/profile` route.
3. Sign out and sign in with `frontdesk1@example.test`.
4. Show patient/appointment/billing access and confirm that restricted clinical actions are not available.
5. Sign out and sign in with `clinician1@example.test`.
6. Show assigned appointments and clinical records.

## 1:15–2:15 — Patient workflow

1. Sign in with `patient1@example.test`.
2. Show the patient dashboard and authenticated patient-owned appointments.
3. Open `/profile` and show the shared role-aware profile page.
4. Open prescriptions or diagnostic reports and show release-aware status messaging.
5. Open notifications and show persisted patient notifications.

## 2:15–3:30 — Clinical document workflow

1. As the clinician, open an appointment and show the consultation page.
2. Show structured clinical notes, prescription medicines, and diagnostic result rows.
3. For a diagnostic report, demonstrate the intended lifecycle:
   `requested → pending → completed → verified → released`.
4. Explain that release generates the PDF first and stores a `Document` reference before the report becomes patient-visible.
5. Return to the patient portal and show the released report’s preview/download action.

## 3:30–4:15 — Billing, audit, and security

1. Show the automatically generated invoice after visit completion.
2. Show a simulated payment and the resulting balance/status.
3. As an administrator, open audit logs and show authentication or record-access events.
4. Mention that patient ownership checks, role middleware, authenticated PDF downloads, and session revocation are enforced server-side.

## 4:15–4:45 — Verification

Show the terminal results for:

```bash
cd backend
npm run compile-models
npm test -- --runInBand

cd ../frontend
npm run build
```

End by noting that the repository contains the README, ER diagram, API documentation, schema documentation, tests, seed script, and known limitations.
