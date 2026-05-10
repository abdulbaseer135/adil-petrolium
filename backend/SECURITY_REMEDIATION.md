Security remediation steps for committed secrets

Summary
-------
`backend/.env` contained high-value secrets (database URI, JWT secrets, admin/test passwords). I removed the file from the working tree and added `.env.example` with placeholders. Complete remediation requires rotating secrets and purging the file from git history.

Immediate actions (recommended, run now)
-------------------------------------
1. Rotate any credentials referenced by the old `MONGO_URI` (create new DB user/password or database, update connection string).
2. Generate new JWT secrets and admin secrets. Example (cross-platform):

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

3. Update all deployment, CI, and local environments to use the new secrets (secrets manager, CI variables, or OS environment variables).

4. Commit the removal (if not committed yet) and push. Example git steps:

```powershell
git add backend/.env.example backend/SECURITY_REMEDIATION.md
git rm --cached backend/.env || true
git commit -m "chore(secrets): remove committed backend/.env and add example"
git push origin <branch>
```

Git history purge (optional, destructive)
--------------------------------------
Removing the file from the working tree does NOT remove it from commit history. To purge previous commits you can use `git-filter-repo` (recommended) or BFG Repo-Cleaner.

git-filter-repo example:

```bash
pip install git-filter-repo
git clone --mirror <repo-url> repo.git
cd repo.git
git filter-repo --path backend/.env --invert-paths
git push --force
```

BFG example:

```bash
bfg --delete-files backend/.env
git reflog expire --expire=now --all && git gc --prune=now --aggressive
git push --force
```

Warning: Purging git history and force-pushing will rewrite repository history and affect all collaborators. Coordinate with your team and backups before proceeding.

Follow-ups
----------
- Scan repository and CI for any remaining secrets (grep for common keys, or use `git-secrets`, `truffleHog`, or `repo-supervisor`).
- Replace any test fallbacks that leak production secrets; prefer using CI-provided secrets.
- Verify frontend build artifacts do not expose secrets: `grep -R "JWT_" frontend/build || true`.
