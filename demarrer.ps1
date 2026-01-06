# Script PowerShell pour démarrer l'application Fylora complète
# Ce script démarre le backend et le frontend en parallèle

# Détecter si on est dans un environnement CI/CD (Render, GitHub Actions, etc.)
$isCI = $env:CI -or $env:RENDER -or $env:GITHUB_ACTIONS -or $env:GITLAB_CI

if ($isCI) {
    Write-Host "⚠ Environnement CI/CD détecté - Les services seront démarrés séparément" -ForegroundColor Yellow
    Write-Host "Ce script est destiné au développement local uniquement" -ForegroundColor Gray
    exit 0
}

Write-Host "=== DÉMARRAGE DE FYLORA ===" -ForegroundColor Cyan
Write-Host ""

# Vérifier si Node.js est installé
try {
    $nodeVersion = node --version
    Write-Host "Node.js détecté: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "Erreur: Node.js n'est pas installé ou n'est pas dans le PATH" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Ce script démarre le backend et le frontend." -ForegroundColor Yellow
Write-Host "Pour démarrer séparément, utilisez:" -ForegroundColor Yellow
Write-Host "  - start_backend.ps1 pour le backend" -ForegroundColor Gray
Write-Host "  - start_frontend.ps1 pour le frontend" -ForegroundColor Gray
Write-Host ""

# Démarrer le backend dans une nouvelle fenêtre PowerShell
Write-Host "Démarrage du backend..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-File", "start_backend.ps1"

# Attendre un peu pour que le backend démarre
Start-Sleep -Seconds 3

# Démarrer le frontend dans une nouvelle fenêtre PowerShell
Write-Host "Démarrage du frontend..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-File", "start_frontend.ps1"

Write-Host ""
Write-Host "✓ Backend et frontend démarrés dans des fenêtres séparées" -ForegroundColor Green
Write-Host ""
Write-Host "Backend: http://localhost:5001" -ForegroundColor White
Write-Host "Frontend: http://localhost:3001" -ForegroundColor White
Write-Host ""
