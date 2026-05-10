<#
Safe PowerShell helper to purge `backend/.env` from git history using a mirror clone.
Run this on a trusted machine with network access to the remote repository.
This script DOES NOT push unless you confirm the final step.
#>
param(
    [Parameter(Mandatory=$true)]
    [string]$RepoUrl,
    [string]$WorkDir = "$env:TEMP\repo-purge",
    [switch]$UseBfg
)

Write-Host "Preparing mirror clone in: $WorkDir"
if (Test-Path $WorkDir) { Remove-Item -Recurse -Force $WorkDir }
New-Item -ItemType Directory -Path $WorkDir | Out-Null

Push-Location $WorkDir
try {
    Write-Host "Cloning mirror from $RepoUrl"
    git clone --mirror $RepoUrl repo.git
    Set-Location repo.git

    if (-not $UseBfg) {
        # prefer git-filter-repo
        if (Get-Command git-filter-repo -ErrorAction SilentlyContinue) {
            Write-Host "Running git-filter-repo to remove backend/.env from all refs"
            git filter-repo --path backend/.env --invert-paths
        } else {
            Write-Host "git-filter-repo not found. Falling back to BFG if available"
            $UseBfg = $true
        }
    }

    if ($UseBfg) {
        if (Get-Command bfg -ErrorAction SilentlyContinue) {
            Write-Host "Running BFG to delete backend/.env"
            bfg --delete-files backend/.env
            git reflog expire --expire=now --all
            git gc --prune=now --aggressive
        } else {
            throw "Neither git-filter-repo nor bfg found. Install git-filter-repo (recommended) or BFG and re-run."
        }
    }

    Write-Host "Repository rewrite complete. Inspect the repository locally before pushing."
    Write-Host "Local mirror path: $(Get-Location)"

    Write-Host "Do you want to force-push the cleaned history to origin?" -NoNewline
    $answer = Read-Host " (yes/no)"
    if ($answer -ne 'yes') {
        Write-Host "Abort: not pushing. You can inspect and push later manually."
        return
    }

    Write-Host "Pushing --force --all and --tags to origin (FINAL DESTRUCTIVE STEP)"
    git push --force --all
    git push --force --tags
    Write-Host "Push complete. IMPORTANT: inform all collaborators to re-clone."
}
finally {
    Pop-Location
}
