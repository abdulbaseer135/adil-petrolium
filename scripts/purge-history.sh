#!/usr/bin/env bash
# Safe helper to purge backend/.env from git history using a mirror clone.
# Run on a Linux/macOS machine with git-filter-repo or BFG installed.
set -euo pipefail

if [ "$#" -lt 1 ]; then
  echo "Usage: $0 <REPO-URL> [workdir]"
  exit 2
fi
REPO_URL="$1"
WORKDIR="${2:-/tmp/repo-purge}"

echo "Preparing mirror clone in: $WORKDIR"
rm -rf "$WORKDIR"
mkdir -p "$WORKDIR"
cd "$WORKDIR"

echo "Cloning mirror from $REPO_URL"
git clone --mirror "$REPO_URL" repo.git
cd repo.git

if command -v git-filter-repo >/dev/null 2>&1; then
  echo "Using git-filter-repo to remove backend/.env"
  git filter-repo --path backend/.env --invert-paths
else
  if command -v bfg >/dev/null 2>&1; then
    echo "git-filter-repo not found; using BFG"
    bfg --delete-files backend/.env
    git reflog expire --expire=now --all
    git gc --prune=now --aggressive
  else
    echo "Error: neither git-filter-repo nor bfg is installed. Install one and retry." >&2
    exit 3
  fi
fi

echo "Rewrite complete. Inspect the mirror under $(pwd) before pushing."
read -p "Force-push cleaned history to origin? (yes/no) " ans
if [ "$ans" = "yes" ]; then
  git push --force --all
  git push --force --tags
  echo "Push complete. Inform collaborators to re-clone."
else
  echo "Aborted push. You can push manually when ready."
fi
