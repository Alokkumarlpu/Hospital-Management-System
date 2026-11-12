# Hospital Management System

Phase 1 foundation for the Algions AI Labs internship assessment. This repository contains the MERN application scaffold, REST API health check, MongoDB/Mongoose data architecture, synthetic seed data, and architecture documentation. Authentication, dashboards, and clinical/business workflows are intentionally reserved for Phase 2.

## Technology stack

- **Frontend:** React, Vite, Tailwind CSS, React Router DOM, Axios, Lucide React
- **Backend:** Node.js, Express, JavaScript ES modules
- **Database:** MongoDB with Mongoose
- **Development:** Git, GitHub, VS Code, Postman

## Structure

```text
frontend/  React/Vite client and reusable UI foundations
backend/   Express API, configuration, models, seeders, and tests
docs/      Database and system architecture documentation
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
| `JWT_SECRET` | Secret reserved for Phase 2 authentication |
| `CLIENT_URL` | Frontend origin, normally `http://localhost:5173` |
| `NODE_ENV` | `development`, `test`, or `production` |

## Run

In one terminal:

```bash
cd backend
npm run dev
```

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

See [the ER diagram](docs/database/ER-Diagram.md) and [the system architecture](docs/architecture/SYSTEM-ARCHITECTURE.md) for relationships, indexes, and appointment concurrency decisions.

## Authentication and authorization

Phase 2 provides cookie-based JWT authentication with server-side session records:

- `httpOnly` cookies prevent JavaScript access to the token.
- `secure` and `SameSite=None` are enabled in production; local development uses `SameSite=Lax`.
- Each JWT has a unique ID and matching hashed session record. Logout revokes that record, so clearing a browser cookie is not the invalidation mechanism.
- Tokens expire according to `JWT_EXPIRES_IN` (default `1d`); password changes and deactivation revoke all sessions for the user.
- Passwords are hashed with bcrypt and password hashes are excluded from normal queries and all API responses.

Available roles:

- **admin:** user management and privileged account/role changes.
- **front_desk:** authentication foundation only in this phase; patient and billing modules remain deferred.
- **clinician:** authentication foundation only in this phase; medical record modules remain deferred.

### Authentication endpoints

| Method | Endpoint | Access |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Public; always creates `front_desk` unless an authenticated admin supplies a role |
| `POST` | `/api/auth/login` | Public |
| `POST` | `/api/auth/logout` | Authenticated session or idempotent public request |
| `GET` | `/api/auth/me` | Authenticated |
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

Change or remove these credentials before any non-development use. To seed, configure `backend/.env` and run `npm run seed` from `backend/`.

### Authentication testing

Run static checks:

```bash
cd backend
npm run compile-models
npm test
```

Use Postman or the frontend against a configured MongoDB instance to exercise registration, login, logout, `/api/auth/me`, password changes, inactive-account rejection, admin-only user endpoints, and cross-role denial. End-to-end auth execution requires `MONGODB_URI`; this repository does not include credentials or an actual `.env`.

## Phase 2 boundary

Authentication, session revocation, RBAC middleware, protected route placeholders, and profile UI are implemented. Patient CRUD, doctor CRUD, appointment booking, complete dashboards, payments processing, file uploads, and clinical workflows remain deferred.
