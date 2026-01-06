# Script PowerShell pour demarrer MongoDB
# Ce script tente de demarrer MongoDB sur Windows

# Détecter si on est dans un environnement CI/CD (Render, GitHub Actions, etc.)
$isCI = $env:CI -or $env:RENDER -or $env:GITHUB_ACTIONS -or $env:GITLAB_CI

if ($isCI) {
    Write-Host "⚠ Environnement CI/CD détecté - MongoDB sera géré par l'infrastructure" -ForegroundColor Yellow
    Write-Host "Ce script est destiné au développement local uniquement" -ForegroundColor Gray
    exit 0
}

Write-Host "Demarrage de MongoDB..." -ForegroundColor Cyan

# Verifier si MongoDB est deja en cours d'execution
$mongoProcess = Get-Process -Name "mongod" -ErrorAction SilentlyContinue
if ($mongoProcess) {
    Write-Host "MongoDB est deja en cours d'execution (PID: $($mongoProcess.Id))" -ForegroundColor Green
    exit 0
}

# Chemins communs pour MongoDB sur Windows
$mongoPaths = @(
    "C:\Program Files\MongoDB\Server\*\bin\mongod.exe",
    "C:\mongodb\bin\mongod.exe",
    "$env:ProgramFiles\MongoDB\Server\*\bin\mongod.exe",
    "$env:LOCALAPPDATA\Programs\MongoDB\Server\*\bin\mongod.exe"
)

$mongodPath = $null
foreach ($path in $mongoPaths) {
    $found = Get-ChildItem -Path $path -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($found) {
        $mongodPath = $found.FullName
        break
    }
}

if (-not $mongodPath) {
    Write-Host "Erreur: MongoDB n'est pas trouve dans les chemins standards" -ForegroundColor Red
    Write-Host ""
    Write-Host "Options pour installer MongoDB:" -ForegroundColor Yellow
    Write-Host "1. Telecharger depuis: https://www.mongodb.com/try/download/community" -ForegroundColor Yellow
    Write-Host "2. Installer via Chocolatey: choco install mongodb" -ForegroundColor Yellow
    Write-Host "3. Utiliser MongoDB Atlas (cloud): https://www.mongodb.com/cloud/atlas" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Ou demarrer MongoDB manuellement avec:" -ForegroundColor Yellow
    Write-Host "  mongod --dbpath C:\data\db" -ForegroundColor Gray
    exit 1
}

Write-Host "MongoDB trouve: $mongodPath" -ForegroundColor Green

# Creer le repertoire de donnees s'il n'existe pas
$dataPath = "C:\data\db"
if (-not (Test-Path $dataPath)) {
    Write-Host "Creation du repertoire de donnees: $dataPath" -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $dataPath -Force | Out-Null
}

# Demarrer MongoDB en arriere-plan
Write-Host "Demarrage de MongoDB..." -ForegroundColor Cyan
try {
    Start-Process -FilePath $mongodPath -ArgumentList "--dbpath", $dataPath -WindowStyle Hidden
    Start-Sleep -Seconds 3
    
    # Verifier si MongoDB a demarre
    $mongoProcess = Get-Process -Name "mongod" -ErrorAction SilentlyContinue
    if ($mongoProcess) {
        Write-Host "MongoDB demarre avec succes (PID: $($mongoProcess.Id))" -ForegroundColor Green
        Write-Host "MongoDB est accessible sur mongodb://localhost:27017" -ForegroundColor Green
    } else {
        Write-Host "Attention: Le processus MongoDB n'a pas ete detecte" -ForegroundColor Yellow
        Write-Host "Verifiez les logs pour plus d'informations" -ForegroundColor Yellow
    }
} catch {
    Write-Host "Erreur lors du demarrage de MongoDB: $_" -ForegroundColor Red
    exit 1
}


