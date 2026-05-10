# Contributing to Tail Website

Thank you for contributing! This guide covers development setup, testing, and CI/CD practices.

## Development Setup

### Prerequisites

- Node.js 18+ (use nvm or your preferred node version manager)
- MongoDB 6.0+ running locally (for backend tests)
- Git with git-filter-repo installed (optional, for history rewriting)

### Frontend Setup

```bash
cd frontend
npm ci          # install dependencies from package-lock.json
npm start       # run dev server on http://localhost:3000
npm test        # run Jest tests (watch mode)
npm test -- --watchAll=false  # run tests once (CI mode)
npm run build   # build for production
```

### Backend Setup

```bash
cd backend
npm ci          # install dependencies
npm start       # run server on http://localhost:5000 (dev mode, auto-reload)
npm test        # run Jest tests (watch mode)
npm test -- --watchAll=false  # run tests once (CI mode)
```

**Backend environment setup**:
1. Copy `.env.example` to `.env` (not committed to git)
2. Update values in `.env` with your local MongoDB URI and JWT secrets:

```bash
MONGO_URI=mongodb://127.0.0.1:27017/tail_dev
JWT_ACCESS_SECRET=your-long-random-secret-min-64-chars
JWT_REFRESH_SECRET=another-long-random-secret-min-64-chars
ADMIN_REGISTRATION_SECRET=your-admin-secret
NODE_ENV=development
```

3. Start MongoDB:

```bash
# macOS/Linux (Docker)
docker run --rm -d -p 27017:27017 --name mongo mongo:6.0

# or local MongoDB service
mongod
```

## Running Tests

### Frontend Tests (Local)

```bash
cd frontend
npm test -- --watchAll=false
```

Includes:
- ✅ Component rendering tests (Snapshot testing)
- ✅ Security scans (no localStorage/sessionStorage, no dangerouslySetInnerHTML)
- ✅ Integration tests (auth flow, routing)

### Backend Tests (Local)

Tests require a test MongoDB database (separate from dev):

```bash
cd backend

# Set test environment
export MONGO_URI=mongodb://127.0.0.1:27017/test_ci
export NODE_ENV=test

# Run tests
npm test -- --watchAll=false
```

Includes:
- ✅ Auth integration tests (login, refresh, logout)
- ✅ CSRF protection tests
- ✅ Customer/transaction CRUD tests
- ✅ Report generation tests
- ✅ Audit logging tests

### Full CI Run (GitHub Actions)

The CI workflow runs automatically on push to `main`/`master` and on pull requests:

1. **Frontend tests** run first (npm test)
2. **Backend tests** run after, with a MongoDB service

The workflow file is at `.github/workflows/ci.yml`.

## Code Quality

### Linting & Formatting

Frontend (uses React's eslint config):

```bash
cd frontend
npm run build  # validates eslint rules during build
```

Backend uses Jest which includes basic lint checks. Consider adding ESLint or Prettier:

```bash
npm install --save-dev eslint prettier
npx eslint src/**/*.js
npx prettier --write src/**/*.js
```

### Security Scanning

#### Frontend

Frontend security test automatically scans for:
- `localStorage` / `sessionStorage` usage (tokens must use HttpOnly cookies)
- `dangerouslySetInnerHTML` (prefer safe JSX)
- Proper escaping in document exports (e.g., `escapeHtml()`)

Run manually:

```bash
cd frontend
npm test -- security.spec.js
```

#### Backend

Check dependencies for known vulnerabilities:

```bash
cd backend
npm audit
```

If vulnerabilities appear, update or override via `package.json` overrides (see existing entries).

## Commits & Pull Requests

### Commit Message Guidelines

Use clear, concise commit messages:

```
feat: add CSRF token rotation
fix: prevent duplicate token refresh in interceptor
docs: update contributing guide
test: add SSE subscription authorization tests
chore: upgrade react-router to v6.10
```

### Pull Request Template

When creating a PR, follow the template at `.github/pull_request_template.md`:

- **Title**: Clear description of change
- **Type**: feat / fix / chore / docs / test
- **Description**: Why? What changed?
- **Testing**: How was it tested locally?
- **Checklist**: Ran tests? Updated docs? Security review?

Example:

```markdown
## Description
Enforce SSE subscription authorization to prevent customers from subscribing to other customers' events.

## Type
fix: security

## Testing
- [x] Ran `npm test -- --watchAll=false` in backend (all pass)
- [x] Tested with curl: confirmed customer cannot subscribe to other customerId
- [x] Tested admin subscriptions still work
```

### Pre-PR Checklist

Before pushing a PR:

1. Run tests locally and confirm they pass:
   ```bash
   cd frontend && npm test -- --watchAll=false
   cd backend && npm test -- --watchAll=false
   ```

2. Check for secrets (do NOT commit `.env`):
   ```bash
   git diff --staged | grep -E "(SECRET|PASSWORD|TOKEN|KEY)"
   # Should return nothing
   ```

3. Update docs if behavior changed (README, comments, RUNBOOK)

4. If backend API changed, verify frontend can consume it

## Security Practices

### Secrets Management

- **Never commit `.env`** — use `.env.example` with placeholders
- Secrets are injected via CI/deployment environment variables
- Rotate secrets regularly (see [SECURITY_REMEDIATION.md](backend/SECURITY_REMEDIATION.md))

### Authentication & Authorization

- All API endpoints require `authenticate` middleware (validates JWT)
- Admin-only endpoints must use `authorize('admin')` middleware
- Never trust `role` from request body — always use `req.user.role` from session

### Data Sanitization

- Backend: return only structured data (numbers, dates, enums) — avoid pre-rendered HTML
- Frontend: use `escapeHtml()` when generating HTML (e.g., Word exports)
- Never use `dangerouslySetInnerHTML` without explicit reason and code review

## Troubleshooting

### Backend tests fail with "Cannot connect to MongoDB"

Ensure MongoDB is running:
```bash
# Docker
docker ps | grep mongo

# or check if local service is running
mongosh  # if this connects, MongoDB is ready
```

### Frontend tests timeout

If tests hang, clear Jest cache:
```bash
cd frontend
npx jest --clearCache
npm test -- --watchAll=false
```

### CSRF test fails in CI

Ensure `npm ci` is used (not `npm install`) to use locked versions. Backend server must have `csurf` middleware enabled (see `backend/src/server.js`).

## Questions?

For security questions, see:
- Frontend hardening: [backend/FRONTEND_HARDENING_RUNBOOK.md](backend/FRONTEND_HARDENING_RUNBOOK.md)
- Secrets & history: [backend/SECURITY_REMEDIATION.md](backend/SECURITY_REMEDIATION.md)
- General docs: [DOCUMENTATION_INDEX.md](DOCUMENTATION_INDEX.md)
