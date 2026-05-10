Rotate exposed secrets — checklist (ordered)

1) Immediately generate replacement secrets (do this before history rewrite):

PowerShell example:

```powershell
# 48-byte hex secrets
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Bash example:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Secrets to rotate:
- `MONGO_URI` (create new DB user/password, update connection string)
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `ADMIN_REGISTRATION_SECRET`
- `WHATSAPP_ACCESS_TOKEN` (if used)
- Any `TEST_*` passwords stored in repo or CI

2) Update and verify in these locations BEFORE invalidating old secrets:
- CI/CD secret store (GitHub Actions Secrets, Azure Key Vault, AWS Secrets Manager, etc.)
- Staging and production deployment environments
- Any third-party integrations (WhatsApp, payment gateways)

3) Rotate and validate DB credentials:
- Create new DB user (least-privilege) and update `MONGO_URI`
- Verify application can connect in a staging environment
- Once confirmed, revoke old DB user credentials

4) Rotate JWT and admin secrets:
- Update access and refresh secrets in all environments
- Revoke or rotate refresh tokens where supported; consider forcing logout of active sessions

5) Coordinate and communicate:
- Inform team and schedule a maintenance window if necessary
- After history purge, tell everyone to re-clone the repo

6) Post-rotation hardening:
- Add `backend/.env` to `.gitignore` and ensure `.env.example` exists
- Add pre-commit or CI scanning (git-secrets, trufflehog) to prevent future leaks
- Consider enabling secret rotation policies in your secrets manager

