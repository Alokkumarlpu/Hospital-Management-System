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

## Phase 1 boundary

This phase does not implement login, authorization, dashboard pages, appointment booking endpoints, payments processing, file uploads, or clinical workflows. Those will be implemented only after Phase 1 approval.
