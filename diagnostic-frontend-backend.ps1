# Script de diagnostic pour la connexion frontend-backend

# Détecter si on est sur Linux (où PowerShell peut ne pas être disponible)
$isLinux = $IsLinux -or ($PSVersionTable.Platform -eq "Unix") -or (Test-Path "/proc/version")

# Si on est sur Linux et qu'on est en CI/CD, utiliser la version bash à la place
if ($isLinux -and ($env:CI -or $env:RENDER -or $env:GITHUB_ACTIONS -or $env:GITLAB_CI)) {
    if (Test-Path "diagnostic-frontend-backend.sh") {
        bash diagnostic-frontend-backend.sh
        exit $LASTEXITCODE
    } else {
        Write-Host "⚠ Environnement CI/CD Linux détecté - Script de diagnostic ignoré" -ForegroundColor Yellow
        exit 0
    }
}

Write-Host "=== DIAGNOSTIC FRONTEND-BACKEND ===" -ForegroundColor Cyan
Write-Host ""

# Détecter si on est dans un environnement CI/CD (Render, GitHub Actions, etc.)
$isCI = $env:CI -or $env:RENDER -or $env:GITHUB_ACTIONS -or $env:GITLAB_CI

# 1. Verifier le backend
Write-Host "1. Verification du backend sur le port 5001..." -ForegroundColor Yellow
try {
    $backendResponse = Invoke-WebRequest -Uri "http://localhost:5001/api/health" -UseBasicParsing -TimeoutSec 3
    Write-Host "   ✓ Backend accessible - Status: $($backendResponse.StatusCode)" -ForegroundColor Green
    Write-Host "   Reponse: $($backendResponse.Content)" -ForegroundColor Gray
} catch {
    Write-Host "   ✗ Backend NON ACCESSIBLE" -ForegroundColor Red
    Write-Host "   Erreur: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    
    if ($isCI) {
        Write-Host "   ⚠ Environnement CI/CD détecté - Backend non requis pour le build" -ForegroundColor Yellow
        Write-Host "   Le backend sera démarré séparément en production" -ForegroundColor Gray
    } else {
        Write-Host "   SOLUTION: Demarrer le backend avec:" -ForegroundColor Yellow
        Write-Host "   cd backend" -ForegroundColor White
        Write-Host "   npm run dev" -ForegroundColor White
        exit 1
    }
}

Write-Host ""

# 2. Verifier la configuration du frontend
Write-Host "2. Verification de la configuration du frontend..." -ForegroundColor Yellow
$configPath = "frontend-web\src\config.js"
if (Test-Path $configPath) {
    $configContent = Get-Content $configPath -Raw
    if ($configContent -match "localhost:5001") {
        Write-Host "   ✓ Configuration correcte (port 5001)" -ForegroundColor Green
    } elseif ($configContent -match "localhost:5000") {
        Write-Host "   ✗ Configuration INCORRECTE (port 5000)" -ForegroundColor Red
        Write-Host "   SOLUTION: Modifier frontend-web\src\config.js" -ForegroundColor Yellow
    } else {
        Write-Host "   ⚠ Configuration non trouvee" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ✗ Fichier config.js non trouve" -ForegroundColor Red
}

Write-Host ""

# 3. Verifier les processus Node.js
Write-Host "3. Verification des processus Node.js..." -ForegroundColor Yellow
$nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    Write-Host "   Processus Node.js trouves: $($nodeProcesses.Count)" -ForegroundColor White
    $nodeProcesses | ForEach-Object {
        Write-Host "     PID: $($_.Id) - Memoire: $([math]::Round($_.WorkingSet64/1MB, 2)) MB" -ForegroundColor Gray
    }
} else {
    Write-Host "   Aucun processus Node.js trouve" -ForegroundColor Yellow
}

Write-Host ""

# 4. Verifier les ports
Write-Host "4. Verification des ports..." -ForegroundColor Yellow
$port5001 = Get-NetTCPConnection -LocalPort 5001 -State Listen -ErrorAction SilentlyContinue
$port3001 = Get-NetTCPConnection -LocalPort 3001 -State Listen -ErrorAction SilentlyContinue

if ($port5001) {
    Write-Host "   ✓ Port 5001 (backend) en ecoute" -ForegroundColor Green
} else {
    Write-Host "   ✗ Port 5001 (backend) NON en ecoute" -ForegroundColor Red
}

if ($port3001) {
    Write-Host "   ✓ Port 3001 (frontend) en ecoute" -ForegroundColor Green
} else {
    Write-Host "   ✗ Port 3001 (frontend) NON en ecoute" -ForegroundColor Red
    Write-Host "   SOLUTION: Demarrer le frontend avec:" -ForegroundColor Yellow
    Write-Host "   cd frontend-web" -ForegroundColor White
    Write-Host "   npm run dev" -ForegroundColor White
}

Write-Host ""

# 5. Test de connexion depuis le frontend
Write-Host "5. Test de connexion frontend->backend..." -ForegroundColor Yellow
Write-Host "   Ouvrez la console du navigateur (F12) et verifiez:" -ForegroundColor White
Write-Host "   - Les requetes doivent aller vers http://localhost:5001/api/..." -ForegroundColor Gray
Write-Host "   - Il ne doit pas y avoir d'erreurs CORS" -ForegroundColor Gray

Write-Host ""
Write-Host "=== SOLUTIONS ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Si le frontend ne se connecte pas au backend:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Redemarrer le frontend (OBLIGATOIRE):" -ForegroundColor White
Write-Host "   - Arreter avec Ctrl+C" -ForegroundColor Gray
Write-Host "   - Redemarrer: cd frontend-web && npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Vider le cache du navigateur:" -ForegroundColor White
Write-Host "   - Appuyez sur Ctrl+Shift+R" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Verifier la console du navigateur (F12):" -ForegroundColor White
Write-Host "   - Onglet Network: verifier les URLs des requetes" -ForegroundColor Gray
Write-Host "   - Onglet Console: verifier les erreurs" -ForegroundColor Gray
Write-Host ""

