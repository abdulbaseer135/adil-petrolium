#!/usr/bin/env bash
# Non-destructive helper to generate secrets and print rotation steps.
# Requires node installed in PATH.
if ! command -v node >/dev/null 2>&1; then
  echo "node not found; please install node to generate example secrets." >&2
  exit 2
fi
BYTES=${1:-48}
ACCESS=$(node -e "console.log(require('crypto').randomBytes($BYTES).toString('hex'))")
REFRESH=$(node -e "console.log(require('crypto').randomBytes($BYTES).toString('hex'))")
ADMIN=$(node -e "console.log(require('crypto').randomBytes($BYTES).toString('hex'))")

echo "New JWT_ACCESS_SECRET:\n$ACCESS"
echo "\nNew JWT_REFRESH_SECRET:\n$REFRESH"
echo "\nNew ADMIN_REGISTRATION_SECRET:\n$ADMIN"

echo "\nRotation checklist (manual steps):"
echo "1) Add these values to your CI/CD secret store (GitHub Actions Secrets, Azure Key Vault, etc.)."
echo "2) Update staging first and verify application starts and can connect to DB."
echo "3) Update production secrets during maintenance window."
echo "4) Revoke old DB user credentials after staging validation."
echo "5) Notify team and consider forcing token revocation where needed."
