# Phase 15: Secret Verification & CI git-secrets Integration
## Preventing Future Secret Commits

**Date**: May 9, 2026  
**Status**: ⏳ **AWAITING IMPLEMENTATION** (GitHub Actions)  
**Severity**: HIGH (Prevention)  
**Timeline**: 45 minutes (setup + validation)  

---

## Executive Summary

Phase 15 establishes automated secret detection in CI/CD to prevent `.env` files or credential-like patterns from being committed in the future. Two approaches are provided:

1. **git-secrets** (Local + CI)
2. **TruffleHog** (GitHub Action)

Both can be used independently or together (defense-in-depth).

---

## Current Status: Secrets Verification

### Secrets Currently in Repository

**Working Tree** (Production code):
- ✅ `.env` removed from `backend/`
- ✅ `.env.example` created with placeholders
- ✅ No hardcoded credentials in source code
- ✅ All secrets externalized to environment variables

**Git History**:
- ⏳ `.env` still in git history (committed before audit)
- ⏳ Requires mirror clone + git-filter-repo to remove (Phase 13)
- ⚠️ Credentials exposed in commits (documented in SECURITY_REMEDIATION.md)

### Verification Method

```bash
# Search for common secret patterns in current code
grep -r "password\|secret\|key\|token" backend/src --include="*.js" | grep -v node_modules | grep -v "\.json"

# Search for .env files
find . -name ".env*" -type f | grep -v node_modules

# Search for AWS/API keys
grep -r "AKIA\|sk_live\|sk_test" . --include="*.js" | grep -v node_modules
```

**Result**: ✅ **NO SECRETS FOUND IN WORKING CODE**

---

## Strategy 1: git-secrets (Recommended for Private Repos)

### Setup: Local Installation

**macOS/Linux**:
```bash
# Install git-secrets
brew install git-secrets

# Or from source
git clone https://github.com/awslabs/git-secrets.git
cd git-secrets && make install
```

**Windows (PowerShell)**:
```powershell
# Using chocolatey
choco install git-secrets

# Or manual installation
git clone https://github.com/awslabs/git-secrets.git
cd git-secrets
Copy-Item .\git-secrets 'C:\Program Files\Git\usr\bin\git-secrets'
```

### Configure Repository

```bash
cd /path/to/tail-website

# Install git hooks
git secrets --install

# Add AWS secret patterns
git secrets --register-aws

# Add custom patterns for this project
git secrets --add --literal 'MONGO_URI'
git secrets --add --literal 'JWT_ACCESS_SECRET'
git secrets --add --literal 'JWT_REFRESH_SECRET'
git secrets --add --literal 'ADMIN_REGISTRATION_SECRET'
git secrets --add --literal 'WHATSAPP_ACCESS_TOKEN'
git secrets --add --literal 'TEST_ADMIN_PASS'
git secrets --add --literal 'TEST_CUSTOMER_PASS'

# Add regex patterns
git secrets --add 'mongodb\+srv:\/\/[^\/]+:.*@'  # MongoDB Atlas URI pattern
git secrets --add 'sk_live_[A-Za-z0-9]{24}'    # Stripe keys (if used)
git secrets --add '"password"\s*:\s*"[^"]*"'   # JSON password fields
```

### Scan Existing Repository

```bash
# Scan all commits (this will take time on large repos)
git secrets --scan

# Scan only uncommitted changes
git secrets --scan --cached

# Scan specific commit
git secrets --scan <commit-hash>
```

**Expected Output**:
```
[WARNING] Matched one or more prohibited patterns

.env:1:MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/...

Matched prohibited patterns:
mongodb\+srv:\/\/[^\/]+:.*@
```

### Exclude False Positives

Some files may have legitimate patterns (e.g., documentation, examples). Exclude them:

```bash
# Edit .gitignore to exclude patterns
echo ".env.example" >> .gitignore
echo "docs/**" >> .gitignore
echo "examples/**" >> .gitignore

# Or configure git-secrets to ignore paths
git config --add secrets.patterns '(?i)^(docs|examples|samples)/'
```

### Test Pre-Commit Hook

```bash
# Try to commit a file with a secret
echo "SECRET_KEY=sk_live_1234567890" > test.txt
git add test.txt

# Attempt commit (should be blocked)
git commit -m "test: add secret"

# Output (expected):
# [BLOCKED] Matched one or more prohibited patterns in 'test.txt'
# Please remove the secret before continuing.

# Clean up
rm test.txt
git reset HEAD
```

---

## Strategy 2: TruffleHog GitHub Action (Recommended for Public Repos)

### GitHub Actions Workflow Integration

Add to `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]

jobs:
  # ... existing jobs ...

  secrets-check:
    name: Scan for Secrets
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Fetch full history for scanning

      - name: TruffleHog Scan
        uses: trufflesecurity/trufflehog@main
        with:
          path: ./
          base: ${{ github.event.repository.default_branch }}
          head: HEAD
          extra_args: --debug --json
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: git-secrets Scan
        run: |
          # Install git-secrets
          sudo apt-get update && sudo apt-get install -y git-secrets || true
          
          # Install hooks
          git secrets --install
          
          # Add patterns
          git secrets --register-aws
          git secrets --add --literal 'MONGO_URI'
          git secrets --add --literal 'JWT_ACCESS_SECRET'
          git secrets --add --literal 'JWT_REFRESH_SECRET'
          git secrets --add --literal 'ADMIN_REGISTRATION_SECRET'
          
          # Scan
          git secrets --scan
```

### Create as New Workflow File (Alternative)

**File**: `.github/workflows/secrets-check.yml`

```yaml
name: Secrets Check

on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]

permissions:
  contents: read

jobs:
  trufflehog:
    name: TruffleHog Secrets Scan
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: TruffleHog Scan
        uses: trufflesecurity/trufflehog@main
        with:
          path: ./
          base: ${{ github.event.repository.default_branch }}
          head: HEAD
          extra_args: --json
          # Fail workflow if secrets found
          fail: true

  git-secrets:
    name: git-secrets Scan
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Install git-secrets
        run: |
          sudo apt-get update
          sudo apt-get install -y git-secrets

      - name: Configure Patterns
        run: |
          git secrets --install
          git secrets --register-aws
          git secrets --add --literal 'MONGO_URI'
          git secrets --add --literal 'JWT_ACCESS_SECRET'
          git secrets --add --literal 'JWT_REFRESH_SECRET'
          git secrets --add --literal 'ADMIN_REGISTRATION_SECRET'
          git secrets --add --literal 'WHATSAPP_ACCESS_TOKEN'
          git secrets --add 'mongodb\+srv:\/\/[^\/]+:.*@'
          git secrets --add '"password"\s*:\s*"[^"]*"'

      - name: Scan Repository
        run: git secrets --scan
```

---

## Strategy 3: Husky + Pre-Commit Hooks (Developer-Level Prevention)

### Setup Husky

```bash
npm install husky --save-dev
npx husky install
```

### Create Pre-Commit Hook

**File**: `.husky/pre-commit`

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

echo "🔐 Running secrets check..."

# Check for secrets using git-secrets
if ! git secrets --scan --cached; then
  echo "❌ Secret patterns detected! Commit aborted."
  echo "Run: git secrets --scan to see details"
  exit 1
fi

# Check for .env files
if git diff --cached --name-only | grep -E '\.env(\..*)?$'; then
  echo "❌ .env file detected in commit! This is not allowed."
  echo "Use environment variables instead."
  exit 1
fi

echo "✅ Secrets check passed"
```

### Create Pre-Push Hook

**File**: `.husky/pre-push`

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

echo "🔐 Running pre-push checks..."

# Scan all commits not yet pushed
current_branch=$(git rev-parse --abbrev-ref HEAD)
tracking_branch=$(git rev-parse --abbrev-ref --symbolic-full-name @{u})

if [ "$tracking_branch" != "@{u}" ]; then
  # Scan commits between local and remote
  if ! git secrets --scan $(git merge-base HEAD "$tracking_branch")..HEAD; then
    echo "❌ Secrets detected in commits to be pushed!"
    exit 1
  fi
fi

echo "✅ Pre-push checks passed"
```

### Install Hooks

```bash
chmod +x .husky/pre-commit
chmod +x .husky/pre-push

# Test pre-commit hook
echo "SECRET=value" > test.env
git add test.env
git commit -m "test"  # Should fail

rm test.env
git reset HEAD
```

---

## Manual Verification Procedure

Run these checks before any release:

```bash
#!/bin/bash
# security-audit.sh

echo "🔐 SECURITY AUDIT CHECKLIST"
echo "============================"
echo ""

echo "1. Checking for .env files..."
if find . -name ".env*" -type f | grep -v node_modules; then
  echo "❌ FAIL: .env files found"
  exit 1
fi
echo "✅ PASS"

echo ""
echo "2. Checking for hardcoded secrets..."
if grep -r "password\|secret\|key\|token" backend/src frontend/src --include="*.js" --include="*.jsx" | grep -v "node_modules\|test\|spec" | grep -iE "(=|:)\s*['\"].*['\"]" | head -5; then
  echo "⚠️  WARNING: Potential secrets found (review above)"
else
  echo "✅ PASS"
fi

echo ""
echo "3. Scanning with git-secrets..."
git secrets --scan

echo ""
echo "4. Checking git history..."
echo "⚠️  Run: git log -p | grep -i 'password\|secret\|key' | head -20"

echo ""
echo "🎉 AUDIT COMPLETE"
```

Run before production deployment:
```bash
bash security-audit.sh
```

---

## CI/CD Integration Testing

### Validate Workflow Blocks Bad Commits

```bash
# Test in a feature branch
git checkout -b test/secrets-detection

# Try to commit a secret
echo "API_KEY=sk_live_test1234567890" > backend/src/config/test.js
git add backend/src/config/test.js

# Attempt commit (should fail if hooked)
git commit -m "test: add api key" && echo "❌ SECURITY FAILURE: Commit succeeded!" || echo "✅ SECURITY SUCCESS: Commit blocked"

# Clean up
git checkout -- backend/src/config/test.js
git clean -fd
git checkout main
git branch -D test/secrets-detection
```

---

## GitHub Actions Configuration

### Add Branch Protection Rule

1. Go to **Settings → Branches → main**
2. Click **Add rule** for `main` branch
3. Enable:
   - ✅ **Require status checks to pass before merging**
   - ✅ **secrets-check** (or whatever workflow name)
   - ✅ **ci** (existing tests)
4. Save

Now PRs cannot merge if secrets are detected.

---

## Whitelisting & Exceptions

### Exclude Legitimate Patterns

Some files legitimately contain pattern-like strings:
- Documentation files (README.md, examples/)
- Sample configuration files
- Test fixtures
- Comments

Create `.gitignore-secrets`:
```
# Patterns to exclude from scanning
^examples/
^docs/
^samples/
.*\.example\.js$
.*\.test\.js$
.*\.spec\.js$
README.*
CHANGELOG.*
```

Then configure git-secrets:
```bash
git config secrets.allowed '^examples/'
git config secrets.allowed '^docs/'
git config secrets.allowed '.*\.example\.js$'
```

---

## Incident Response: If Secret Committed

### Immediate Actions (Within 1 hour)

1. **Identify**: What secret was exposed? For how long?
2. **Revoke**: Immediately rotate the credential (see Phase 14)
3. **Alert**: Notify security team and management
4. **Document**: Log incident in security log

### Short-Term (1-24 hours)

1. **Remove from git**: Use git-filter-repo (Phase 13)
2. **Audit logs**: Check who accessed the secret, when
3. **Communication**: Notify affected customers if necessary
4. **Update procedures**: Improve detection/prevention

### Long-Term (Days 1-7)

1. **Post-mortem**: Why did this happen? How to prevent?
2. **Enhanced monitoring**: Add alerts for future incidents
3. **Training**: Educate team on secret management
4. **Compliance**: Document incident for audit trail

---

## Success Criteria

✅ Phase 15 is complete when:

- [x] Working code contains no secrets (verified)
- [x] `.env` removed from production code (verified)
- [ ] git-secrets installed locally OR TruffleHog configured in CI
- [ ] Pre-commit hooks prevent secret commits
- [ ] CI workflow blocks PRs with detected secrets
- [ ] Branch protection rule enforces secrets check
- [ ] Team trained on secret management
- [ ] Incident response plan documented

---

## Verification Commands

```bash
# Verify no secrets in working code
grep -r "mongodb\+srv\|JWT_\|ADMIN_\|WHATSAPP_\|TEST_PASS" \
  backend/src frontend/src --include="*.js" --include="*.jsx" | grep -v node_modules

# Verify no .env files
find . -name ".env*" -type f | grep -v node_modules | grep -v "^\./.git"

# Verify git-secrets installed
git secrets --version

# Verify CI workflow configured
cat .github/workflows/ci.yml | grep -A 5 "secrets-check\|trufflehog"
```

---

## Documentation to Update

After Phase 15 implementation:

- [ ] `CONTRIBUTING.md` — Add "Secrets Prevention" section
- [ ] `SECURITY_REMEDIATION.md` — Update Phase 15 status
- [ ] `README.md` — Link to security guide
- [ ] Team wiki — Document secret management policy
- [ ] Onboarding guide — Train new developers

**Example CONTRIBUTING.md addition**:
```markdown
## Secrets & Credentials

### ⚠️ NEVER commit secrets
- .env files
- API keys
- Database passwords
- JWT secrets

### ✅ DO use environment variables
- Store secrets in deployment environment
- Use .env.example for non-secret defaults
- Reference: [SECURITY_REMEDIATION.md](../SECURITY_REMEDIATION.md)

### 🔒 Automated Protection
git-secrets will block commits containing patterns like:
- mongodb+srv:// URIs with passwords
- API keys (AWS, Stripe, etc.)
- Database credentials
- JWT secrets

If accidentally committed, contact security@example.com immediately.
```

---

## Ongoing Maintenance

### Weekly
- Monitor CI logs for failed secret scans
- Review PRs for attempted secret commits

### Monthly
- Review git-secrets patterns (new threat types?)
- Update TruffleHog rules
- Check for pattern false positives

### Quarterly
- Audit git history for missed secrets
- Review incident log
- Update team training materials

### Annually
- Third-party penetration test (includes secret detection)
- Compliance audit (SOC 2, ISO 27001)
- Disaster recovery drill

---

**Phase 15 Status**: ⏳ **READY FOR IMPLEMENTATION**

All workflows, scripts, and documentation prepared. Awaiting DevOps/GitHub admin to configure CI/CD checks.

**Estimated Implementation Time**: 45 minutes

---

**Document Generated**: May 9, 2026
