$token = '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'
$repo = 'friendiiztx3-ux/mc-daily-follow-up'
$commitMessage = 'Auto-sync: Add registration success popup modal and keyed date-time column'

$headers = @{
    'Authorization' = "Bearer $token"
    'Accept' = 'application/vnd.github+json'
    'User-Agent' = 'Antigravity-AutoSync'
}

Write-Host "Starting Auto-Sync to GitHub repo: $repo ..."

# 1. Get current commit on main
$ref = Invoke-RestMethod -Uri "https://api.github.com/repos/$repo/git/refs/heads/main" -Headers $headers -Method Get
$parentCommitSha = $ref.object.sha
Write-Host "Current commit on main: $parentCommitSha"

# 2. Get base tree
$commitData = Invoke-RestMethod -Uri "https://api.github.com/repos/$repo/git/commits/$parentCommitSha" -Headers $headers -Method Get
$baseTreeSha = $commitData.tree.sha
Write-Host "Base tree SHA: $baseTreeSha"

# 3. Read our local updated HTML content as pure raw bytes and Base64 encode
$sourceHtmlPath = "A:\MC Daily Follow Up-20260907T074424Z-1-001\MC Daily Follow Up\public\index.html"
$bytes = [System.IO.File]::ReadAllBytes($sourceHtmlPath)
$base64Content = [System.Convert]::ToBase64String($bytes)

# 4. Create blob for index.html (and route aliases) using base64 encoding (100% preserves UTF-8 Thai text)
$blobBody = @{
    content = $base64Content
    encoding = 'base64'
} | ConvertTo-Json -Compress

$blobRes = Invoke-RestMethod -Uri "https://api.github.com/repos/$repo/git/blobs" -Headers $headers -Method Post -Body $blobBody -ContentType "application/json; charset=utf-8"
$htmlBlobSha = $blobRes.sha
Write-Host "Created GitHub blob SHA (base64 UTF-8): $htmlBlobSha"

# 5. Define all files that should be updated with this new HTML
$filesToUpdate = @(
    "index.html",
    "new-customer.html",
    "agent.html",
    "supervisor.html",
    "reports.html",
    "audit.html",
    "backoffice.html",
    "audit-logs.html",
    "upload-deposits.html",
    "404.html"
)

$treeEntries = @()
foreach ($file in $filesToUpdate) {
    $treeEntries += @{
        path = $file
        mode = "100644"
        type = "blob"
        sha = $htmlBlobSha
    }
}

# 6. Create new tree
$treeBody = @{
    base_tree = $baseTreeSha
    tree = $treeEntries
} | ConvertTo-Json -Depth 5 -Compress

$newTree = Invoke-RestMethod -Uri "https://api.github.com/repos/$repo/git/trees" -Headers $headers -Method Post -Body $treeBody
$newTreeSha = $newTree.sha
Write-Host "Created new tree SHA: $newTreeSha"

# 7. Create commit
$commitBody = @{
    message = $commitMessage
    tree = $newTreeSha
    parents = @($parentCommitSha)
} | ConvertTo-Json -Depth 5 -Compress

$newCommit = Invoke-RestMethod -Uri "https://api.github.com/repos/$repo/git/commits" -Headers $headers -Method Post -Body $commitBody
$newCommitSha = $newCommit.sha
Write-Host "Created new commit SHA: $newCommitSha"

# 8. Update main branch reference
$refUpdateBody = @{
    sha = $newCommitSha
    force = $false
} | ConvertTo-Json -Compress

$updatedRef = Invoke-RestMethod -Uri "https://api.github.com/repos/$repo/git/refs/heads/main" -Headers $headers -Method Patch -Body $refUpdateBody
Write-Host "SUCCESS! Main branch updated to commit: $($updatedRef.object.sha)" -ForegroundColor Green
Write-Host "Vercel will now automatically build and deploy the update!" -ForegroundColor Green
