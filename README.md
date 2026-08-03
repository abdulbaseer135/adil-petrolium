# Tail Website — Fuel Management System

This repository contains a fuel management and customer statements platform with a secure backend API, a React frontend, and support tooling for deployment and maintenance.

## Repository Overview

- `backend/` — Express API, MongoDB integration, authentication, authorization, audits, exports, and backend tests.
- `frontend/` — React 19 app with Redux Toolkit, routing, API integration, UI state management, and frontend tests.
- `scripts/` — repository scripts for maintenance tasks such as secret rotation and history purge.
- `package.json` — root metadata and shared dependency references.

## Summary

A secure fuel management application for petroleum dealers with customer account statement exports, role-based access control, and audit logging. The backend serves protected APIs, while the frontend provides a responsive user interface for admins and customers.

## Quick Links

- `backend/` — backend application source and API logic
- `frontend/` — React application source and UI code
- `scripts/` — helper scripts for repo maintenance
- `README.md` — this consolidated documentation

## Project Description

This system is designed for managing petroleum dealer accounts, customer transactions, and statement generation. It supports role-based access control for administrators and customers, secure session management, exportable account statements, and monitoring of activity through audit logs.

### Core Capabilities

- Secure login and refresh-token authentication
- Role-based access control for admin and customer users
- Customer account statements export in Word format
- Transaction reporting by day, month, and year
- Audit logging for sensitive actions and changes
- Real-time updates via Server-Sent Events (SSE)
- Rate limiting and request sanitization for hardened API security

## Tech Stack

### Backend
- Node.js, Express
- MongoDB via Mongoose
- `bcryptjs`, `jsonwebtoken`, `helmet`, `express-rate-limit`
- `pino` logging and `express-validator` request validation
- Test stack: Mocha, Chai, Sinon, Supertest, NYC

### Frontend
- React 19, React Router v6
- Redux Toolkit for state management
- Axios for HTTP requests
- Create React App build tooling
- TypeScript support for developer tooling

## Setup and Usage

### Prerequisites

- Node.js installed
- MongoDB running locally or accessible via connection string

### Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in `backend/` with environment variables such as:

```text
PORT=4000
MONGO_URI=mongodb://localhost:27017/<database>
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d
CLIENT_URL=http://localhost:3000
```

Start the backend:

```bash
npm run dev
```

### Frontend Setup

```bash
cd frontend
npm install
npm start
```

Open the app at `http://localhost:3000`.

### Production Build

```bash
cd frontend
npm run build
```

## Testing

### Backend

```bash
cd backend
npm test
```

### Frontend

```bash
cd frontend
npm test
```

### Coverage

- Backend coverage: `cd backend && npm run test:coverage`
- Frontend coverage: `cd frontend && npm run test:coverage`

## Security and Hardening

This repository was built with a strong security focus:

- HttpOnly cookies for auth tokens
- CSRF protections and secure cookie handling
- Input sanitization for request bodies and export generation
- Role-based enforcement on API endpoints
- Session and refresh token handling outside of local storage
- Audit logging for administrative and export actions

## Notes

All previous repository documentation has been consolidated into this single root `readme.md` file. Other markdown files were removed to keep the repository documentation centralized and easier to maintain.

## License

Proprietary. All rights reserved.
