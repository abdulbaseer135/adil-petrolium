# Tail Website — Fuel Management System

![CI](https://github.com/yourorg/tail-website/actions/workflows/ci.yml/badge.svg)

Enterprise-grade fuel management and customer account statement system with comprehensive security, authentication, and reporting capabilities.

## Quick Start

- **User Guide**: [USER_GUIDE_STATEMENT.md](USER_GUIDE_STATEMENT.md)
- **Developer Setup**: See [CONTRIBUTING.md](CONTRIBUTING.md)
- **Full Documentation**: [DOCUMENTATION_INDEX.md](DOCUMENTATION_INDEX.md)

## Features

- 🔐 Secure authentication (JWT + refresh tokens, HttpOnly cookies, CSRF protection)
- 📊 Professional customer account statements (Word export)
- 📈 Daily, monthly, and yearly reports
- 🛡️ Role-based access control (admin / customer)
- 🔄 Real-time transaction updates (Server-Sent Events)
- 📝 Comprehensive audit logging
- ✅ Full test coverage (frontend + backend)

## Tech Stack

### Backend
- Node.js + Express
- MongoDB (Mongoose)
- JWT authentication, bcryptjs hashing, csurf CSRF protection

### Frontend
- React 19, Redux Toolkit
- React Router v6
- Axios with request/response interceptors
- Comprehensive Jest test suite

## Security Highlights

- ✅ No token storage in localStorage — HttpOnly cookies only
- ✅ CSRF double-submit pattern (XSRF-TOKEN)
- ✅ Server-enforced RBAC on all endpoints
- ✅ Input sanitization and HTML escaping for exports
- ✅ Audit logging for sensitive actions
- ✅ Rate limiting on auth endpoints
- ✅ Dependency audit and override management

## Running Tests

See [CONTRIBUTING.md](CONTRIBUTING.md) for full setup instructions. Quick commands:

```bash
# Frontend tests
cd frontend && npm test

# Backend tests (requires MongoDB on localhost:27017)
cd backend && npm test
```

## For Security Researchers

See [FRONTEND_HARDENING_RUNBOOK.md](backend/FRONTEND_HARDENING_RUNBOOK.md) for detailed backend hardening steps and [backend/SECURITY_REMEDIATION.md](backend/SECURITY_REMEDIATION.md) for secrets rotation and git history purge guidance.

## License

Proprietary. All rights reserved.
