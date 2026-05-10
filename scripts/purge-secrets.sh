#!/usr/bin/env bash
# Helper to purge a path from git history using git-filter-repo or BFG.
# THIS SCRIPT DOES NOT RUN AUTOMATICALLY - read and run with care.

set -euo pipefail

echo "This script prints the recommended commands to purge 'backend/.env' from git history."

cat <<'EOF'
=== Option A: git-filter-repo (recommended) ===
# Install: pip install git-filter-repo
# Mirror clone repository (safe):
git clone --mirror <REPO-URL> repo.git
cd repo.git
# Remove the file from all history:
git filter-repo --path backend/.env --invert-paths
# Push rewritten history back to origin (force):
git push --force --all
git push --force --tags

=== Option B: BFG Repo-Cleaner ===
# Install BFG (https://rtyley.github.io/bfg-repo-cleaner/)
git clone --mirror <REPO-URL> repo.git
cd repo.git
# Delete file from history:
bfg --delete-files backend/.env
git reflog expire --expire=now --all
git gc --prune=now --aggressive
git push --force --all
git push --force --tags

Important:
- These operations rewrite history and require coordination with all collaborators.
- Create backups before proceeding. Ensure you have permission to force-push.
EOF

echo
echo "Also: rotate all secrets (DB, JWT, admin/test passwords) before or immediately after pushing rewritten history."
