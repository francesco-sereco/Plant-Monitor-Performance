$ErrorActionPreference = "Stop"

param(
  [string]$Message = "",
  [switch]$AutoCommit,
  [switch]$AutoPush
)

function Exec($cmd) {
  Write-Host ""
  Write-Host "==> $cmd"
  iex $cmd
}

function Fail($msg) {
  Write-Error $msg
  exit 1
}

Exec "git status --porcelain"

$status = (git status --porcelain)
if ($status -match "\.db(\s|$)") {
  Fail "Trovato file *.db in working tree. Non committare DB locali (es. apps/api/prisma/prisma/dev.db). Aggiungilo a .gitignore o rimuovilo prima di procedere."
}

if ($status -match "\.env(\s|$)" -or $status -match "\.env\.") {
  Fail "Trovato file .env modificato/nuovo. Non committare segreti. Rimuovi dal commit e riprova."
}

if (Test-Path "apps/api/prisma/schema.prisma") {
  $schema = Get-Content "apps/api/prisma/schema.prisma" -Raw
  if ($schema -match 'datasource\s+db\s*\{[\s\S]*?provider\s*=\s*"(.*?)"') {
    $provider = $Matches[1]
    if (Test-Path ".env") {
      $envContent = Get-Content ".env" -Raw
      if ($envContent -match 'DATABASE_URL\s*=\s*"?postgresql://') {
        if ($provider -ne "postgresql") {
          Fail "Incoerenza DB: DATABASE_URL è postgresql ma Prisma provider è '$provider'. Allinea schema.prisma prima di migrare/committare."
        }
      }
    }
  }
}

Exec "npm run db:up"
Exec "npm run db:generate -w @pmp/api"
Exec "npm run db:migrate -w @pmp/api"

Exec "npm run test -w @pmp/api"
Exec "npm run build -w @pmp/api"
Exec "npm run build -w @pmp/web"

if (Test-Path "apps/web/package.json") {
  try {
    Exec "npm run lint -w @pmp/web"
  } catch {
    Write-Host "Lint web fallito o non configurato. Continua." -ForegroundColor Yellow
  }
}

Exec "git status"

if ($AutoCommit) {
  if ([string]::IsNullOrWhiteSpace($Message)) {
    Fail "AutoCommit richiesto ma -Message è vuoto."
  }
  Exec "git add -A"
  Exec "git commit -m `"$Message`""
}

if ($AutoPush) {
  Exec "git push"
}

Write-Host ""
Write-Host "OK: push-com completato." -ForegroundColor Green

