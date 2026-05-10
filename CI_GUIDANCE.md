# CI/CD & Testing Guidance

This document provides an overview of the CI/CD pipeline, local testing setup, and troubleshooting.

## CI/CD Pipeline Overview

### GitHub Actions Workflow

The workflow is defined in `.github/workflows/ci.yml` and runs automatically on:
- **Push** to `main` or `master` branches
- **Pull requests** to `main` or `master` branches

#### Workflow Steps

1. **Checkout code** — Clone the repository
2. **Setup Node.js 18** — Install Node version 18
3. **Frontend tests** (in parallel with setup):
   - Install dependencies (`npm ci`)
   - Run Jest tests (`npm test -- --watchAll=false`)
   - Includes security scans (localStorage, sessionStorage, dangerouslySetInnerHTML detection)
4. **Backend tests** (after frontend passes):
   - Spin up MongoDB 6.0 service (on localhost:27017)
   - Install dependencies (`npm ci`)
   - Run Jest tests with test MongoDB (`npm test -- --watchAll=false`)
   - Includes auth, CSRF, CRUD, report, and audit tests

#### Estimated Time
- Frontend tests: ~4–6 seconds
- Backend tests: ~10–15 seconds (includes MongoDB startup)
- **Total pipeline**: ~20–30 seconds

### CI Status Badge

The CI status badge is displayed in `README.md`:

```markdown
![CI](https://github.com/yourorg/tail-website/actions/workflows/ci.yml/badge.svg)
```

Replace `yourorg` with your GitHub organization name. The badge updates automatically based on the latest workflow run.

## Local Testing Setup

### Prerequisites

- **Node.js 18+** (install from nodejs.org or via nvm)
- **MongoDB 6.0+** (for backend tests)
- **Git** (already required for this repo)

### Frontend Tests (No External Services Required)

```bash
cd frontend

# Install dependencies
npm ci

# Run tests once (CI mode)
npm test -- --watchAll=false

# Or run in watch mode (for development)
npm test
```

**What's tested**:
- Component rendering and snapshots
- Auth flow and routing
- Security: no localStorage/sessionStorage, no dangerouslySetInnerHTML
- Escaping in generated documents

### Backend Tests (Requires MongoDB)

**Step 1: Start MongoDB** (choose one method):

```bash
# Option A: Docker (fastest)
docker run --rm -d -p 27017:27017 --name mongo mongo:6.0

# Option B: Homebrew (macOS)
brew install mongodb-community
brew services start mongodb-community

# Option C: Local installation
# Follow MongoDB installation guide for your OS
```

**Step 2: Run tests**:

```bash
cd backend

# Set test environment
export MONGO_URI=mongodb://127.0.0.1:27017/test_ci
export NODE_ENV=test

# Install dependencies
npm ci

# Run tests once (CI mode)
npm test -- --watchAll=false

# Or run in watch mode
npm test
```

**What's tested**:
- Auth endpoints (login, refresh, logout)
- CSRF token generation and validation
- Customer CRUD and list operations
- Transaction operations and void logic
- Report generation (daily, monthly, yearly)
- Audit logging
- Role-based access control (RBAC)

### Full Local CI Simulation

To run the complete CI workflow locally (both frontend and backend tests with isolated MongoDB):

```bash
#!/bin/bash

# Cleanup any existing test MongoDB
docker rm -f mongo-test 2>/dev/null || true

# Start a fresh MongoDB for testing
docker run --rm -d -p 27017:27017 --name mongo-test mongo:6.0

# Wait for MongoDB to be ready
sleep 5

# Frontend tests
echo "=== Running Frontend Tests ==="
cd frontend
npm ci
npm test -- --watchAll=false
FRONTEND_EXIT=$?

# Backend tests
echo "=== Running Backend Tests ==="
cd ../backend
npm ci
MONGO_URI=mongodb://127.0.0.1:27017/test_ci NODE_ENV=test npm test -- --watchAll=false
BACKEND_EXIT=$?

# Cleanup
docker stop mongo-test

# Report
echo ""
echo "=== Test Results ==="
echo "Frontend: $([ $FRONTEND_EXIT -eq 0 ] && echo 'PASS' || echo 'FAIL')"
echo "Backend: $([ $BACKEND_EXIT -eq 0 ] && echo 'PASS' || echo 'FAIL')"

exit $(($FRONTEND_EXIT + $BACKEND_EXIT))
```

## Troubleshooting CI Failures

### Frontend Tests Fail: "Cannot find module"

**Solution**: Clear npm cache and reinstall:

```bash
cd frontend
rm -rf node_modules package-lock.json
npm ci
npm test -- --watchAll=false
```

### Backend Tests Fail: "MongoDB connection refused"

**Solution**: Verify MongoDB is running and accessible:

```bash
# Check if container is running (Docker)
docker ps | grep mongo

# Or try connecting
mongosh --eval "db.adminCommand({ping: 1})"

# If not running, start it
docker run --rm -d -p 27017:27017 --name mongo mongo:6.0
```

### Backend Tests Hang or Timeout

**Solution**: MongoDB may not be fully started. Increase wait time:

```bash
# After starting MongoDB, wait longer
sleep 10

# Then run tests
cd backend
npm test -- --watchAll=false
```

### Security Test Fails: "localStorage usage detected"

**Solution**: The security scan found a file with `localStorage` or `sessionStorage`. Do NOT store tokens in these — use HttpOnly cookies instead. Example fix:

```javascript
// ❌ BAD
localStorage.setItem('token', jwt);

// ✅ GOOD
// Token is stored in HttpOnly cookie (server-side), never in JS
```

If this is in a test file, add the file to the scan exclusion in `frontend/src/__tests__/security.spec.js`.

### CI Workflow Fails with "Permission denied"

**Solution**: If using a private action, ensure the workflow has correct permissions. Check `.github/workflows/ci.yml` has:

```yaml
permissions:
  contents: read
  # Add other permissions if needed
```

### Pull Request Checks Don't Appear

**Solution**: Ensure the workflow file is in the correct branch and GitHub Actions is enabled:

1. Go to **Settings** → **Actions** → **General**
2. Confirm "GitHub Actions" is enabled
3. Commit and push `.github/workflows/ci.yml` to the branch

## CI Environment Secrets

### Managing Secrets in CI

If the backend tests need environment variables (e.g., API keys, secrets), configure them via GitHub:

1. **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Add name (e.g., `WHATSAPP_API_KEY`) and value
4. In workflow file, reference with `${{ secrets.WHATSAPP_API_KEY }}`

Example:

```yaml
env:
  MONGO_URI: mongodb://127.0.0.1:27017/test_ci
  WHATSAPP_API_KEY: ${{ secrets.WHATSAPP_API_KEY }}
```

**Important**: Never commit `.env` files. Always use placeholders in `.env.example`.

## Performance Tips

### Reduce CI Time

1. **Use `npm ci`** instead of `npm install` (faster, uses lock file)
2. **Cache dependencies** in GitHub Actions (consider adding):

```yaml
- uses: actions/cache@v3
  with:
    path: frontend/node_modules
    key: ${{ runner.os }}-npm-${{ hashFiles('frontend/package-lock.json') }}
```

3. **Run independent jobs in parallel** (frontend tests don't wait for backend)

### Reduce Local Test Time

```bash
# Run only specific test file
npm test -- specific.test.js

# Run tests matching a pattern
npm test -- --testNamePattern="auth"

# Watch mode with bail (stop on first failure)
npm test -- --bail
```

## Monitoring & Debugging

### View GitHub Actions Logs

1. Go to **Actions** tab in GitHub
2. Click the workflow run
3. Click **Frontend tests** or **Backend tests** to expand
4. Scroll through logs to find failures

### Enable Debug Logging

Add to workflow to get verbose Node.js output:

```yaml
env:
  DEBUG: '*'
```

Or for specific packages:

```yaml
env:
  DEBUG: 'mongo*,express*'
```

## Adding New Tests

When adding features, add tests:

```bash
# Frontend: add to src/__tests__/
# Pattern: ComponentName.test.jsx

# Backend: add to tests/integration/ or tests/unit/
# Pattern: featureName.test.js
```

Run the test locally before pushing:

```bash
cd frontend
npm test -- newtest.test.js
```

The CI pipeline will automatically run all tests on push.

---

For more details, see:
- [CONTRIBUTING.md](CONTRIBUTING.md) — Development setup & contribution guidelines
- [.github/workflows/ci.yml](.github/workflows/ci.yml) — Full workflow definition
- [.github/pull_request_template.md](.github/pull_request_template.md) — PR template & checklist
