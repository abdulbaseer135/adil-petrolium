#!/usr/bin/env bash
# Lightweight repo secret scanner
# Usage: bash scripts/scan-secrets.sh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

echo "Running quick secret scan in $ROOT_DIR"

PATTERNS=(
  "MONGO_URI"
  "JWT_ACCESS_SECRET"
  "JWT_REFRESH_SECRET"
  "ADMIN_REGISTRATION_SECRET"
  "TEST_ADMIN_PASS"
  "TEST_CUSTOMER_PASS"
  "WHATSAPP_ACCESS_TOKEN"
  "API_KEY"
  "SECRET"
  "PASSWORD"
  "ACCESS_KEY"
  "SECRET_KEY"
  "PRIVATE_KEY"
)

echo "Searching working tree for common secret patterns..."
for p in "${PATTERNS[@]}"; do
  git grep -n --break --heading -I -e "$p" || true
done

echo
echo "Scanning frontend build artifacts (possible leaked envs)..."
if [ -d frontend/build ]; then
  grep -RIInE "(JWT|SECRET|TOKEN|API_KEY|MONGO|PASSWORD)" frontend/build || true
else
  echo "No frontend/build directory found."
fi

echo
echo "If you have 'truffleHog' or 'git-secrets' installed, consider running them for a deeper scan:" 
echo "  trufflehog filesystem $ROOT_DIR"
echo "  git secrets --scan"

echo "Scan complete. Review matches above and act accordingly."
