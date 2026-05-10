<#
PowerShell scan to list files containing common secret names. Non-destructive.
#>
$patterns = 'MONGO_URI','JWT_ACCESS_SECRET','JWT_REFRESH_SECRET','ADMIN_REGISTRATION_SECRET','TEST_ADMIN_PASS','TEST_CUSTOMER_PASS','WHATSAPP_ACCESS_TOKEN','API_KEY','SECRET','PASSWORD','ACCESS_KEY','SECRET_KEY','PRIVATE_KEY'
Write-Host "Scanning workspace for common secret names..."
Get-ChildItem -Path . -Recurse -File -ErrorAction SilentlyContinue | Where-Object { $_.FullName -notmatch "\.git" } | ForEach-Object {
    try {
        $res = Select-String -Path $_.FullName -Pattern $patterns -SimpleMatch -ErrorAction SilentlyContinue
        if ($res) {
            $res | ForEach-Object { Write-Host "$($_.Path):$($_.LineNumber): $($_.Line.Trim())" }
        }
    } catch {}
}
Write-Host "Scan complete. Review matches above."
