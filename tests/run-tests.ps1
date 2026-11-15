# Runs the Jack of All test suite in headless Microsoft Edge and prints the result.
# Usage (from the jack-of-all folder):  powershell -ExecutionPolicy Bypass -File tests\run-tests.ps1
# Starts a temporary local web server, runs /tests/, and exits with 0 (all passed) or 1.
param([int]$Port = 5199)

$root = Split-Path $PSScriptRoot -Parent
$edge = @("${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe", "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe") | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $edge) { Write-Error 'Microsoft Edge not found.'; exit 2 }

$server = Start-Process -FilePath python -ArgumentList @('-m', 'http.server', $Port, '--bind', '127.0.0.1', '--directory', $root) -PassThru -WindowStyle Hidden
try {
  Start-Sleep -Seconds 1
  $profileDir = Join-Path $env:TEMP "joa-test-profile-$Port"
  # Virtual time lets async tests finish before the page is captured. (The
  # background-worker test is skipped here; it runs when /tests/ is opened normally.)
  $html = & $edge --headless=new --disable-gpu --no-first-run "--user-data-dir=$profileDir" --virtual-time-budget=120000 --dump-dom "http://127.0.0.1:$Port/tests/?headless=1" 2>$null | Out-String
  $summary = [regex]::Match($html, 'RESULT: \d+ passed, \d+ failed(, \d+ skipped)?').Value
  $failures = [regex]::Matches($html, 'FAILED: [^\n<]+') | ForEach-Object { $_.Value }
  if (-not $summary) { Write-Host 'Tests did not finish (no RESULT line found).'; exit 1 }
  Write-Host $summary
  $failures | ForEach-Object { Write-Host $_ }
  if ($summary -match ', 0 failed') { exit 0 } else { exit 1 }
}
finally {
  Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue
}
