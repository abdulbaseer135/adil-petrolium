# Purging committed secrets and rotating credentials — Action Plan

This document lists exact commands and a safe order to purge the previously committed `backend/.env`, rotate credentials, and push a cleaned history. Follow carefully; these steps rewrite history and require coordination with your team.

1) Verify working tree and commit the `.env` removal and supportive files

```powershell
# From repo root
git status --porcelain
git add backend/.env.example backend/SECURITY_REMEDIATION.md scripts/scan-secrets.sh scripts/purge-secrets.sh
git rm --cached backend/.env || true
git commit -m "chore(secrets): remove committed backend/.env and add remediation helpers"
git push origin HEAD
```

2) Rotate secrets (CRITICAL)

- Rotate DB credentials referenced by `MONGO_URI` (create new DB user/password and update connection strings in all environments).
- Generate new JWT secrets and admin secret. Example (PowerShell):

```powershell
# generate 48-byte hex secret
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

- Update secrets in CI/CD, deployments, and any secret managers before proceeding with history purge.

3) Purge `backend/.env` from git history (choose one)

Option A — git-filter-repo (recommended):

```bash
# make a mirror clone (do NOT run inside existing working repo)
git clone --mirror <REPO-URL> repo.git
cd repo.git
# remove the file from all refs
git filter-repo --path backend/.env --invert-paths
# push rewritten history back to origin (force)
git push --force --all
git push --force --tags
```

Option B — BFG Repo-Cleaner:

```bash
git clone --mirror <REPO-URL> repo.git
cd repo.git
bfg --delete-files backend/.env
git reflog expire --expire=now --all
git gc --prune=now --aggressive
git push --force --all
git push --force --tags
```

4) Post-purge checklist

- Inform collaborators to re-clone or to run recommended steps to realign their local clones.
- Verify no remaining secrets: run `scripts/scan-secrets.sh` or tools like `trufflehog` on the cleaned mirror.
- Ensure all CI and production services use rotated secrets before disabling old ones.

5) Restore safety measures

- Add/additional git hooks (e.g., `git-secrets`) and CI checks to prevent future leaks.

If you want, I can prepare the exact `git filter-repo` commands replacing `<REPO-URL>` with your remote and optionally produce a branch/PR with the `.env` removal commit already prepared (you'll still need to push it). Tell me your preferred next step.
