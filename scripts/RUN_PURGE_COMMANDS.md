Repository history purge — copy-paste commands (REVIEW before running)

Replace <REPO-URL> with your remote (e.g. git@github.com:org/repo.git) and run on a trusted machine.

PowerShell (recommended with `git-filter-repo`):

```powershell
# 1) Mirror-clone the repo (do NOT run inside working repo)
$REPO = '<REPO-URL>'
$WORKDIR = "$env:TEMP\repo-purge"
Remove-Item -Recurse -Force $WORKDIR -ErrorAction SilentlyContinue
git clone --mirror $REPO $WORKDIR\repo.git
Set-Location $WORKDIR\repo.git

# 2) Run git-filter-repo to remove backend/.env
# Install: pip install git-filter-repo (or use package manager)
git filter-repo --path backend/.env --invert-paths

# 3) Inspect changes locally. If OK, force-push cleaned history
# WARNING: destructive. All collaborators must re-clone after this.
# If you are ready:
# git push --force --all
# git push --force --tags

# 4) Optional: expire reflog and gc
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

Bash (Linux/macOS) with `git-filter-repo`:

```bash
REPO_URL="<REPO-URL>"
WORKDIR="/tmp/repo-purge"
rm -rf "$WORKDIR"
mkdir -p "$WORKDIR"
cd "$WORKDIR"

git clone --mirror "$REPO_URL" repo.git
cd repo.git

# prefer git-filter-repo
if command -v git-filter-repo >/dev/null 2>&1; then
  git filter-repo --path backend/.env --invert-paths
else
  echo "git-filter-repo not installed. Install it or use BFG."
  exit 1
fi

# Inspect the cleaned mirror now. When ready to push (REQUIRES CONFIRMATION):
# git push --force --all
# git push --force --tags

# Cleanup (optional):
# git reflog expire --expire=now --all
# git gc --prune=now --aggressive
```

Notes & safeguards:
- DO NOT run the force-push lines until you have rotated secrets and coordinated with the team.
- After pushing, every collaborator must re-clone or follow the repo-rewrite recovery steps.
- If you prefer BFG instead of git-filter-repo, replace the filter step with `bfg --delete-files backend/.env` and run reflog/gc.

If you want, I can run these steps from here using your remote URL — I will prompt for final confirmation before any `git push --force`.
