param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('dev', 'prod')]
  [string]$Environment,

  [switch]$Link,

  [switch]$ConfirmProduction
)

$ErrorActionPreference = 'Stop'

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$supabaseDir = Join-Path $repoRoot 'supabase'
$sourceConfig = Join-Path $supabaseDir "config.$Environment.toml"
$targetConfig = Join-Path $supabaseDir 'config.toml'

$projectRefs = Get-Content (Join-Path $supabaseDir 'targets.json') -Raw | ConvertFrom-Json
$projectRef = $projectRefs.$Environment

if ($Link -and [string]::IsNullOrWhiteSpace($projectRef)) {
  throw 'DEV fiscal ainda não provisionado. Registre a referência em supabase/targets.json antes de vincular.'
}

if ($Environment -eq 'prod' -and -not $ConfirmProduction) {
  throw 'Para selecionar PROD, rode novamente com -ConfirmProduction.'
}

if (-not (Test-Path $sourceConfig)) {
  throw "Config nao encontrada: $sourceConfig"
}

Copy-Item $sourceConfig $targetConfig -Force
Write-Host "Supabase config.toml atualizado para $Environment. Referência remota: $projectRef"

if ($Link) {
  Push-Location $repoRoot
  try {
    supabase link --project-ref $projectRef
    if ($LASTEXITCODE -ne 0) { throw 'Falha ao vincular o projeto Supabase.' }
  }
  finally {
    Pop-Location
  }
}
