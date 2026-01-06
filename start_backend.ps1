# Script PowerShell pour demarrer le serveur backend Fylora
# Ce script change vers le repertoire backend et demarre le serveur Node.js

# Détecter si on est dans un environnement CI/CD (Render, GitHub Actions, etc.)
$isCI = $env:CI -or $env:RENDER -or $env:GITHUB_ACTIONS -or $env:GITLAB_CI

if ($isCI) {
    Write-Host "⚠ Environnement CI/CD détecté - Le backend sera démarré séparément" -ForegroundColor Yellow
    Write-Host "Ce script est destiné au développement local uniquement" -ForegroundColor Gray
    exit 0
}

Write-Host "Demarrage du serveur backend Fylora..." -ForegroundColor Cyan

# Verifier si Node.js est installe
try {
    $nodeVersion = node --version
    Write-Host "Node.js detecte: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "Erreur: Node.js n'est pas installe ou n'est pas dans le PATH" -ForegroundColor Red
    exit 1
}

# Verifier si le dossier backend existe
if (-not (Test-Path "backend")) {
    Write-Host "Erreur: Le dossier 'backend' n'existe pas" -ForegroundColor Red
    exit 1
}

# Changer vers le repertoire backend
Set-Location backend

# Verifier si node_modules existe
if (-not (Test-Path "node_modules")) {
    Write-Host "Les dependances ne sont pas installees. Installation en cours..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Erreur lors de l'installation des dependances" -ForegroundColor Red
        Set-Location ..
        exit 1
    }
}

# Verifier si le fichier .env existe
if (-not (Test-Path ".env")) {
    Write-Host "Attention: Le fichier .env n'existe pas" -ForegroundColor Yellow
    Write-Host "Assurez-vous d'avoir configure les variables d'environnement" -ForegroundColor Yellow
}

# Demarrer le serveur
Write-Host ""
Write-Host "Demarrage du serveur..." -ForegroundColor Cyan
Write-Host "Appuyez sur Ctrl+C pour arreter le serveur" -ForegroundColor Gray
Write-Host ""

npm start

# Revenir au repertoire racine si le script se termine
Set-Location ..
