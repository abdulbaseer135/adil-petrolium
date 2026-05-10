# Phase 14: Secrets Rotation & Deployment Updates
## Production Credentials Refresh

**Date**: May 9, 2026  
**Status**: ⏳ **AWAITING EXECUTION** (Deployment Ops)  
**Severity**: HIGH  
**Timeline**: 15-30 minutes (during maintenance window)  

---

## Executive Summary

Phase 14 addresses the remediation of secrets that were exposed in git history (`backend/.env`). This phase involves:
1. Generating new cryptographic secrets
2. Updating all production environments
3. Rotating CI/CD pipeline secrets
4. Updating staging environments
5. Documenting the rotation timeline

---

## Exposed Secrets Inventory

### From Committed `backend/.env`

| Secret | Type | Exposure | Action Required |
|--------|------|----------|-----------------|
| `MONGO_URI` | Database connection string | Git history | Update to production DB credentials |
| `JWT_ACCESS_SECRET` | Token signing key | Git history | Rotate immediately |
| `JWT_REFRESH_SECRET` | Token refresh signing key | Git history | Rotate immediately |
| `ADMIN_REGISTRATION_SECRET` | Admin onboarding token | Git history | Rotate immediately |
| `TEST_ADMIN_PASS` | Test credentials | Git history | Invalidate (test-only) |
| `TEST_CUSTOMER_PASS` | Test credentials | Git history | Invalidate (test-only) |
| `WHATSAPP_*` | WhatsApp integration tokens | Git history | Rotate if active |

---

## Secrets Rotation Procedure

### Step 1: Generate New Secrets

Use PowerShell (Windows) or Bash (Unix) helper script:

**PowerShell** (Windows):
```powershell
# Run from project root
& scripts/rotate-secrets.ps1
```

**Bash** (macOS/Linux):
```bash
# Run from project root
bash scripts/rotate-secrets.sh
```

**Script Output** (Example):
```
╔═══════════════════════════════════════════════════════════╗
║           SECRETS ROTATION HELPER (May 9, 2026)           ║
╚═══════════════════════════════════════════════════════════╝

1) Generated JWT_ACCESS_SECRET:
   abc123...xyz789 (32 chars)

2) Generated JWT_REFRESH_SECRET:
   def456...uvw012 (32 chars)

3) Generated ADMIN_REGISTRATION_SECRET:
   ghi789...rst345 (32 chars)

NEXT STEPS:
1) Update staging environment variables
2) Test staging login/refresh/logout
3) Update production environment variables during maintenance
4) Monitor production logs for auth failures
5) Invalidate old tokens if using Token Revocation List
```

### Step 2: Update Staging Environment

**For Docker/Container Deployments**:
```bash
# Update staging environment file
echo "JWT_ACCESS_SECRET=<NEW_VALUE>" >> /path/to/staging/.env
echo "JWT_REFRESH_SECRET=<NEW_VALUE>" >> /path/to/staging/.env
echo "ADMIN_REGISTRATION_SECRET=<NEW_VALUE>" >> /path/to/staging/.env

# Restart staging server
docker restart tail-api-staging
```

**For GitHub Actions Secrets** (if using CI/CD):
1. Go to **Settings → Secrets and variables → Actions**
2. Update each secret:
   - `JWT_ACCESS_SECRET`
   - `JWT_REFRESH_SECRET`
   - `ADMIN_REGISTRATION_SECRET`
3. Secrets are automatically injected on next workflow run

**For AWS Systems Manager Parameter Store**:
```bash
aws ssm put-parameter \
  --name /tail-website/staging/JWT_ACCESS_SECRET \
  --value "$(openssl rand -base64 32)" \
  --type SecureString \
  --overwrite

aws ssm put-parameter \
  --name /tail-website/staging/JWT_REFRESH_SECRET \
  --value "$(openssl rand -base64 32)" \
  --type SecureString \
  --overwrite

# ... repeat for ADMIN_REGISTRATION_SECRET
```

### Step 3: Test Staging

**Login Flow Test**:
```bash
curl -X POST http://staging.api.example.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "password123"
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Login successful",
  "data": { "userId": "...", "role": "admin", ... }
}
```

**Refresh Token Test**:
```bash
curl -X POST http://staging.api.example.com/api/v1/auth/refresh \
  -H "Cookie: refreshToken=<TOKEN>" \
  --include
```

**Expected Response**: `Set-Cookie: accessToken=...`

### Step 4: Schedule Production Rotation

**Recommended Approach**: Rolling rotation (zero-downtime)

#### Option A: Load Balancer Strategy (Preferred)
1. **Update half the servers** with new secrets
2. **Test**: Direct traffic to updated servers
3. **Monitor**: Check logs for auth errors
4. **Update remaining servers** if Step 2 succeeds
5. **Rollback**: Revert to old secrets if issues arise

#### Option B: Maintenance Window
1. **Schedule maintenance window** (low-traffic time)
2. **Announce maintenance** to users
3. **Stop API server**
4. **Update all secrets**
5. **Start API server**
6. **Monitor** for 30 minutes
7. **Notify users** maintenance complete

**Maintenance Window Template**:
```
Maintenance Notice:
==================
Date: [DATE]
Time: [TIME] UTC (X hours)
Impact: API unavailable for ~15 minutes
Scope: All authentication & token operations

During maintenance:
- Login/logout will be unavailable
- Token refresh may fail
- Existing sessions unaffected (active tokens still valid)

We apologize for the inconvenience.
```

### Step 5: Update Production Environment

**For Cloud Deployments** (Heroku, Railway, etc.):
```bash
# Using CLI
heroku config:set \
  JWT_ACCESS_SECRET="<NEW_VALUE>" \
  JWT_REFRESH_SECRET="<NEW_VALUE>" \
  ADMIN_REGISTRATION_SECRET="<NEW_VALUE>" \
  -a tail-website-prod

# Dyno restarts automatically
```

**For Kubernetes**:
```bash
# Create new secret
kubectl create secret generic tail-api-secrets \
  --from-literal=JWT_ACCESS_SECRET="<NEW_VALUE>" \
  --from-literal=JWT_REFRESH_SECRET="<NEW_VALUE>" \
  --from-literal=ADMIN_REGISTRATION_SECRET="<NEW_VALUE>" \
  --dry-run=client -o yaml | kubectl apply -f -

# Rollout restart to pick up new secrets
kubectl rollout restart deployment/tail-api
```

**For Traditional Servers**:
```bash
# SSH into production server
ssh deploy@prod.example.com

# Update environment file
sudo nano /etc/tail-api/.env

# Update these lines:
# JWT_ACCESS_SECRET=<NEW_VALUE>
# JWT_REFRESH_SECRET=<NEW_VALUE>
# ADMIN_REGISTRATION_SECRET=<NEW_VALUE>

# Save (Ctrl+X, Y, Enter)

# Restart service
sudo systemctl restart tail-api

# Verify
sudo systemctl status tail-api
```

### Step 6: Validate Production

**Health Check**:
```bash
curl https://api.example.com/health
```

**Expected**: `{"status":"ok","ts":"...","env":"production"}`

**Login Test**:
```bash
curl -X POST https://api.example.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "password123"
  }' \
  -v
```

**Monitor Logs**:
```bash
# Real-time log monitoring
tail -f /var/log/tail-api/error.log
tail -f /var/log/tail-api/auth.log

# Or via cloud provider
aws logs tail /aws/ecs/tail-api --follow
heroku logs -t -p web
```

**Watch for**:
- ❌ "Invalid or expired token" errors (means old secrets still in use)
- ❌ MongoDB connection failures (MONGO_URI issue)
- ✅ Successful logins with new secrets
- ✅ Token refresh succeeding

---

## Pre-Rotation Checklist

- [ ] All team members notified
- [ ] Staging secrets updated and tested
- [ ] Maintenance window scheduled (if required)
- [ ] Rollback plan documented
- [ ] Monitoring alerts configured
- [ ] Backup of old secrets (stored securely, offline)
- [ ] New secrets generated using cryptographically secure method

---

## Rotation Timeline

### Phase 1: Staging (Day 1)
- [ ] Generate new secrets
- [ ] Update staging `.env`
- [ ] Run staging tests
- [ ] Verify login/refresh flow

### Phase 2: Canary Deployment (Day 2)
- [ ] Update load balancer to route 10% traffic to new secrets
- [ ] Monitor for errors
- [ ] Increase to 50% if no issues
- [ ] Increase to 100% over 1 hour

### Phase 3: Monitoring (Days 2-3)
- [ ] Monitor error rates
- [ ] Check auth log volume
- [ ] Verify no failed token refreshes
- [ ] Confirm no user complaints

### Phase 4: Cleanup (Day 3+)
- [ ] Remove old secrets from all systems
- [ ] Document rotation completion
- [ ] Update status in ROTATE_SECRETS.md

---

## Troubleshooting

### Symptoms: "Invalid or expired token" errors on 50% of requests

**Cause**: Secrets mismatch (servers running different secrets)

**Fix**:
1. Verify all servers have same secrets
2. Check load balancer is hitting updated servers
3. Restart all server instances

### Symptoms: MongoDB connection failures after rotation

**Cause**: MONGO_URI not updated or incorrectly set

**Fix**:
1. Verify MONGO_URI is in environment
2. Test connection: `mongosh <MONGO_URI>`
3. Check for special characters (% signs need URL encoding)

### Symptoms: Users locked out after rotation

**Cause**: Refresh tokens still use old secret (one-way operation)

**Expected**: Users need to log in again (normal behavior)

**Prevent by**: Announcing maintenance window in advance

---

## Reverting Rotation (Emergency Only)

If critical issues arise, revert to old secrets:

```bash
# Restore old secrets to all servers
# (Use backup from Step: Pre-Rotation Checklist)

# Restart all services
# For Kubernetes: kubectl rollout restart deployment/tail-api
# For Heroku: heroku releases:rollback

# Verify: curl https://api.example.com/health
```

**Note**: Users will need to log in again after revert (refresh tokens will fail).

---

## Post-Rotation Documentation

After rotation completes, update:
1. ✅ `ROTATE_SECRETS.md` — Mark rotation complete with date/time
2. ✅ `backend/SECURITY_REMEDIATION.md` — Update rotation status
3. ✅ Team wiki/runbook — Document new rotation process
4. ✅ Monitoring dashboards — Track secret ages

---

## Compliance & Audit Trail

**Required for SOC 2 / ISO 27001**:
- [x] Document rotation date/time
- [x] Record who authorized rotation (manager name)
- [x] Document new secret generation method (cryptographically secure random)
- [x] Store old secrets securely (encrypted, offline backup)
- [x] Maintain audit log of who accessed secrets
- [x] Set reminder for next annual rotation

**Example Audit Log Entry**:
```
Date: May 9, 2026
Time: 14:00 UTC
Action: Secrets Rotation
Secrets Updated:
  - JWT_ACCESS_SECRET (32-char random)
  - JWT_REFRESH_SECRET (32-char random)
  - ADMIN_REGISTRATION_SECRET (32-char random)
Authorized By: [Manager Name]
Verified By: [QA Lead Name]
Status: COMPLETE
Monitoring Duration: 3 days
Issues: None
```

---

## Timing & Coordination

**Ideal Rotation Schedule**:
- **Annually**: Mandatory full rotation (all secrets)
- **On breach**: Immediate rotation (same day as discovery)
- **On developer departure**: Immediate rotation (remove access)
- **Major version upgrade**: After deployment (new deployment = new secrets)

**Notification Template**:
```
To: all-developers@example.com
Subject: Tail Website API Secrets Rotation — May 9, 2026

Hi team,

We are rotating the API secrets as part of our security hardening post-audit.

Timeline:
- Staging: May 9, 2:00 PM UTC (no downtime)
- Production: May 9, 10:00 PM UTC (15-min maintenance window)

Impact:
- All users will be logged out
- Mobile/web apps will need to re-login
- API tokens will be refreshed

No action required on your part. We will monitor closely.

Questions? Reach out to security@example.com

Best regards,
Security Team
```

---

## Success Criteria

✅ Phase 14 is complete when:
1. New secrets generated and stored securely
2. Staging environment updated and tested
3. Production secrets updated during maintenance window
4. All services restarted successfully
5. Health checks passing
6. Auth flow working (login/refresh/logout)
7. Logs show no errors
8. Users can log back in
9. Audit trail documented

---

**Phase 14 Status**: ⏳ **READY FOR EXECUTION**

All documentation, scripts, and procedures in place. Awaiting DevOps/Ops team to execute during production maintenance window.

**Estimate**: 30 minutes (including monitoring)

---

**Document Generated**: May 9, 2026
