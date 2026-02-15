param(
  [string]$Origin = "http://localhost:5173"
)
$ErrorActionPreference = "Stop"
$repoDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location (Join-Path $repoDir "..")
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  Write-Error "npm not found in PATH"
  exit 1
}
$env:WEB_ORIGIN = $Origin
$job = Start-Job -ScriptBlock {
  param($url)
  $maxTries = 120
  for ($i=0; $i -lt $maxTries; $i++) {
    try {
      $resp = Invoke-WebRequest -Uri $url -Method Head -UseBasicParsing -TimeoutSec 2
      if ($resp.StatusCode -lt 500) {
        Start-Process $url
        break
      }
    } catch {}
    Start-Sleep -Seconds 1
  }
} -ArgumentList $Origin
try {
  npm start
} finally {
  if ($job) {
    try { Stop-Job $job -Force } catch {}
    try { Remove-Job $job -Force } catch {}
  }
}
