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

$projectRefs = @{
  dev = 'lvsocwetuhhqxlwyfdrw'
  prod = 'eukazzizamxratkavcap'
}

if ($Environment -eq 'prod' -and -not $ConfirmProduction) {
  throw 'Para selecionar PROD, rode novamente com -ConfirmProduction.'
}

if (-not (Test-Path $sourceConfig)) {
  throw "Config nao encontrada: $sourceConfig"
}

Copy-Item $sourceConfig $targetConfig -Force
Write-Host "Supabase config.toml atualizado para $Environment ($($projectRefs[$Environment]))."

if ($Link) {
  Push-Location $repoRoot
  try {
    supabase link --project-ref $projectRefs[$Environment]
  }
  finally {
    Pop-Location
  }
}