Param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$Args
)

$RootDir = Resolve-Path (Join-Path $PSScriptRoot "..\\..\\..")
Set-Location $RootDir

if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
  Write-Error "pnpm is required."
  exit 1
}

pnpm tsx src/pipeline/run.ts @Args
