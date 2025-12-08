param(
  [string]$SourceDir = 'C:\dev\ENGLISH\Avatar',
  [string]$TargetDir = 'public/avatars'
)

Write-Host "Importing avatars from $SourceDir to $TargetDir"
if (-Not (Test-Path $SourceDir)) {
  Write-Error "Source directory does not exist: $SourceDir"
  exit 1
}

# Ensure target exists
New-Item -ItemType Directory -Path $TargetDir -Force | Out-Null

# Copy image files (png, jpg, svg, webp)
$exts = @('*.png','*.jpg','*.jpeg','*.svg','*.webp','*.gif')
foreach ($e in $exts) {
  Get-ChildItem -Path $SourceDir -Filter $e -File -Recurse | ForEach-Object {
    Copy-Item -Path $_.FullName -Destination (Join-Path $TargetDir $_.Name) -Force
    Write-Host "Copied: $($_.Name)"
  }
}

# Generate index.json listing available avatars
$avatars = Get-ChildItem -Path $TargetDir -File | Where-Object { $_.Extension -match '\.(png|jpg|jpeg|svg|webp|gif)$' } | ForEach-Object {
  [PSCustomObject]@{
    displayName = ($_.BaseName -replace '_',' ')
    filename = $_.Name
  }
}

$avatars | ConvertTo-Json -Depth 2 | Out-File -Encoding utf8 (Join-Path $TargetDir 'index.json')
Write-Host "Wrote index.json with $($avatars.Count) avatars."

Write-Host "Import complete. You can now run: npm run dev"
