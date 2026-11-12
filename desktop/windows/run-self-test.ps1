# DraftCraft Pro — native self-test of a packaged Windows build (used by .github/workflows/windows.yml).
# Starts the app with its own profile and DRAFTCRAFT_SELF_TEST; the app checks itself (Start Window, recent
# projects, menus, spelling, emoji picker, Getting Started, accessibility, Return latency, ...), writes report.json
# and window captures next to it, and quits. Exits 1 if any check failed or the report never appeared.
param(
  [Parameter(Mandatory = $true)][string]$Exe,
  [Parameter(Mandatory = $true)][string]$Out,
  [int]$TimeoutSeconds = 600
)
$ErrorActionPreference = 'Stop'
$Exe = (Resolve-Path $Exe).Path
New-Item -ItemType Directory -Force -Path "$Out\profile", "$Out\out" | Out-Null
$report = Join-Path $Out 'out\report.json'
Remove-Item -Force -ErrorAction SilentlyContinue $report

$env:DRAFTCRAFT_TEST_PROFILE = (Resolve-Path "$Out\profile").Path
$env:DRAFTCRAFT_SELF_TEST = $report
Write-Host "Starting $Exe (profile $env:DRAFTCRAFT_TEST_PROFILE)"
$proc = Start-Process -FilePath $Exe -PassThru
$deadline = (Get-Date).AddSeconds($TimeoutSeconds)
while (-not (Test-Path $report) -and (Get-Date) -lt $deadline) { Start-Sleep -Seconds 2 }
$quitDeadline = (Get-Date).AddSeconds(30)
while (-not $proc.HasExited -and (Get-Date) -lt $quitDeadline) { Start-Sleep -Seconds 1 }
if (-not $proc.HasExited) { Write-Host 'The app did not quit by itself; stopping it.'; Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue }
Get-Process -Name 'DraftCraft Pro' -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

if (-not (Test-Path $report)) { Write-Host "::error::No self-test report after $TimeoutSeconds s."; exit 1 }
$r = Get-Content -Raw -Encoding utf8 $report | ConvertFrom-Json
$lines = @("### DraftCraft Pro self-test on Windows", "", "Version $($r.version): $($r.passed) passed, $(@($r.failed).Count) failed", "", "| Step | Result | ms | Note |", "|---|---|---|---|")
foreach ($p in $r.checks.PSObject.Properties) {
  $c = $p.Value
  $note = if ($c.error) { ($c.error -replace '\|', '/' -replace "`r?`n", ' ') } else { '' }
  if ($note.Length -gt 160) { $note = $note.Substring(0, 160) + '…' }
  $lines += "| $($p.Name) | $(if ($c.ok) { 'pass' } else { 'FAIL' }) | $($c.ms) | $note |"
}
$lines | ForEach-Object { Write-Host $_ }
if ($env:GITHUB_STEP_SUMMARY) { $lines | Out-File -Append -Encoding utf8 $env:GITHUB_STEP_SUMMARY }
if (@($r.failed).Count -gt 0) { Write-Host "::error::Self-test failed: $($r.failed -join ', ')"; exit 1 }
Write-Host 'Self-test passed.'
