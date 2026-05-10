#!/usr/bin/env bash
# Grep-based verification scan (fast). Non-destructive.
PATTERN='MONGO_URI|JWT_ACCESS_SECRET|JWT_REFRESH_SECRET|ADMIN_REGISTRATION_SECRET|TEST_ADMIN_PASS|TEST_CUSTOMER_PASS|WHATSAPP_ACCESS_TOKEN|API_KEY|SECRET|PASSWORD|ACCESS_KEY|SECRET_KEY|PRIVATE_KEY'

echo "Scanning workspace for common secret names (this may produce false positives)..."
# ignore .git folder
grep -RIn --exclude-dir=.git -E "$PATTERN" . || true

echo "Scan complete. Review matches above."
