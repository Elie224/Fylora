# Script PowerShell pour demarrer le frontend web Fylora
# Ce script change vers le repertoire frontend-web et demarre le serveur de developpement

# Détecter si on est sur Render (déploiement)
if ($env:RENDER) {
    Write-Host "⚠ Environnement Render détecté - Le frontend sera buildé par Render" -ForegroundColor Yellow
    Write-Host "Ce script est destiné au développement local uniquement" -ForegroundColor Gray
    exit 0
}

Write-Host "Demarrage du frontend web Fylora..." -ForegroundColor Cyan

# Verifier si Node.js est installe
try {
    $nodeVersion = node --version
    Write-Host "Node.js detecte: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "Erreur: Node.js n'est pas installe ou n'est pas dans le PATH" -ForegroundColor Red
    exit 1
}

# Verifier si le dossier frontend-web existe
if (-not (Test-Path "frontend-web")) {
    Write-Host "Erreur: Le dossier 'frontend-web' n'existe pas" -ForegroundColor Red
    exit 1
}

# Changer vers le repertoire frontend-web
Set-Location frontend-web

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

# Demarrer le serveur de developpement
Write-Host ""
Write-Host "Demarrage du serveur de developpement..." -ForegroundColor Cyan
Write-Host "Appuyez sur Ctrl+C pour arreter le serveur" -ForegroundColor Gray
Write-Host ""

npm run dev

# Revenir au repertoire racine si le script se termine
Set-Location ..


