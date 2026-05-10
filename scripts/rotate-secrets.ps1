<#
Interactive helper to generate new secrets and print recommended steps for rotating them in CI/deploy.
Non-destructive: it does not change remote systems.
#>
param(
    [int]$Bytes = 48
)

Write-Host "Generating example secrets (non-persistent)"
$access = node -e "console.log(require('crypto').randomBytes($Bytes).toString('hex'))" 2>$null
$refresh = node -e "console.log(require('crypto').randomBytes($Bytes).toString('hex'))" 2>$null
$admin = node -e "console.log(require('crypto').randomBytes($Bytes).toString('hex'))" 2>$null

Write-Host "
New JWT_ACCESS_SECRET:"
Write-Host $access
Write-Host "
New JWT_REFRESH_SECRET:"
Write-Host $refresh
Write-Host "
New ADMIN_REGISTRATION_SECRET:"
Write-Host $admin

Write-Host "
Rotation checklist (manual steps):"
Write-Host "1) Add these values to your CI/CD secret store (GitHub Actions Secrets, Azure Key Vault, etc.)."
Write-Host "2) Update staging first and verify application starts and can connect to DB."
Write-Host "3) Update production secrets during maintenance window."
Write-Host "4) Revoke old DB user credentials after staging validation."
Write-Host "5) Notify team and consider forcing token revocation where needed."
