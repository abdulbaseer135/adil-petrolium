Frontend Hardening Runbook — backend actions
=========================================

Scope: concrete, minimal backend changes to address the top frontend security issues identified:
- cookie flags & CSRF enforcement
- RBAC enforcement (do not trust client role)
- SSE subscription authorization
- Export/document generation sanitization (server-side checks)

1) Verify and enforce secure cookie flags
----------------------------------------
- File: `backend/src/controllers/authController.js` (defines `COOKIE_OPTS`).
- Goal: ensure auth cookies are HttpOnly, Secure in production, SameSite at least `Lax` (prefer `Strict` for highest protection), and appropriate `path`.

Recommended `COOKIE_OPTS` (example):

```js
const COOKIE_OPTS = {
  httpOnly: true,
  secure: config.env === 'production',
  sameSite: config.env === 'production' ? 'strict' : 'lax',
  path: '/',
  // optional: domain: process.env.COOKIE_DOMAIN || undefined,
};
```

Validation steps:
- Start server in staging/production and exercise login. Inspect `Set-Cookie` headers using curl:

```bash
curl -i -c /tmp/cookies.txt -X POST https://your-app.example/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"...","password":"..."}'

# Look for HttpOnly, Secure and SameSite in Set-Cookie
```

If any cookie lacks the flags, adjust `COOKIE_OPTS` and redeploy. Do not expose access/refresh tokens to JS (they must be HttpOnly).

2) CSRF token handling
----------------------
- File: `backend/src/routes/authRoutes.js` currently sets `XSRF-TOKEN` cookie (readable). Keep that behavior but set `sameSite`/`secure` as above. Ensure CSRF middleware (`csurf`) is enabled for state-changing endpoints.

Checks:
- Verify `GET /api/v1/auth/csrf` returns `XSRF-TOKEN` cookie. Ensure frontend calls this before `POST /auth/refresh` (frontend already does). Confirm server enforces CSRF on POST routes.

3) RBAC enforcement — server-side only
-------------------------------------
- Files: route files under `backend/src/routes/*.js` and `backend/src/middleware/auth.js`.
- Use existing `authenticate` and `authorize` middlewares. Ensure every admin-only route uses `authorize('admin')` (examples already present in `customerRoutes.js`, `transactionRoutes.js`, `reportRoutes.js`).

Runbook actions:
- Grep for routes that perform sensitive operations and check for `authenticate` + `authorize('admin')`.
- If a route uses only `authenticate`, add `authorize('admin')` or a controller-level check. Example:

```js
// before
router.post('/some-admin-action', authenticate, ctrl.someAction);

// after
router.post('/some-admin-action', authenticate, authorize('admin'), ctrl.someAction);
```

Also, never rely on a `role` value sent by the client in the request body — always use `req.user.role` from the authenticated session.

4) SSE subscription authorization
---------------------------------
- File: `backend/src/routes/eventsRoutes.js`
- Issue: customers may pass `customerId` query param and subscribe to another customer's stream.

Remediation (two options — choose one):
- Option A (recommended for clarity): require `enforceCustomerOwnership` for the `/transactions` SSE route and always derive `customerId` from `req.customerId` for customers. Example change:

```js
// current
router.get('/transactions', authenticate, [...], validate, async (req, res, next) => {
  // ... current logic
});

// recommended
router.get('/transactions', authenticate, enforceCustomerOwnership, [...], validate, async (req, res, next) => {
  let customerId = req.user.role === 'customer' ? req.customerId : req.query.customerId;
  // ... validate and proceed
});
```

- Option B: Always ignore `customerId` query param for customers and validate that admins requesting other streams are authorized.

Validation: attempt to subscribe as a customer and confirm you cannot receive events for another customer's id.

5) Export/document generation sanitization
----------------------------------------
- The frontend builds HTML/Word blobs using user/DB data. Ensure server-side returned fields are sanitized and validated. Prefer server-side document generation for complex exports.

Server recommendations:
- Validate and sanitize strings (escape `<`, `>`, `&`, `"`, `'`). Use a vetted library when possible (e.g., `sanitize-html` for HTML contexts).
- When returning data used to generate documents client-side, return only structured values (numbers, ISO dates, enums) and avoid sending pre-rendered HTML from the server.

6) Tests & verification
-----------------------
- Add integration tests to assert that Set-Cookie includes `HttpOnly` and `SameSite` attributes, and that SSE subscriptions are authorized. There are existing integration tests under `backend/tests/integration` — add assertions there.

7) Incident / deployment checklist
--------------------------------
1. Update env with strong secrets (rotate JWT secrets). 2. Update `COOKIE_OPTS` and redeploy to staging. 3. Run curl validation. 4. Run integration tests. 5. Deploy to production behind HTTPS. 6. Rotate any potentially exposed credentials.

References: `backend/src/controllers/authController.js`, `backend/src/routes/authRoutes.js`, `backend/src/routes/eventsRoutes.js`, `backend/src/middleware/auth.js`.

End of runbook.
