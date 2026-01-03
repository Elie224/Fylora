# Script PowerShell pour définir kouroumaelisee@gmail.com comme administrateur
# Usage: .\backend\scripts\setAdmin.ps1

Write-Host "🔍 Recherche de Node.js..." -ForegroundColor Cyan

# Chercher Node.js dans les emplacements communs
$nodePaths = @(
    "$env:ProgramFiles\nodejs\node.exe",
    "$env:ProgramFiles(x86)\nodejs\node.exe",
    "$env:LOCALAPPDATA\Programs\nodejs\node.exe",
    "C:\Program Files\nodejs\node.exe",
    "C:\Program Files (x86)\nodejs\node.exe"
)

$nodeExe = $null
foreach ($path in $nodePaths) {
    if (Test-Path $path) {
        $nodeExe = $path
        Write-Host "✅ Node.js trouvé: $nodeExe" -ForegroundColor Green
        break
    }
}

# Si pas trouvé, essayer via PATH
if (-not $nodeExe) {
    try {
        $nodeExe = Get-Command node -ErrorAction Stop | Select-Object -ExpandProperty Source
        Write-Host "✅ Node.js trouvé dans PATH: $nodeExe" -ForegroundColor Green
    } catch {
        Write-Host "❌ Node.js n'est pas installé ou n'est pas dans le PATH" -ForegroundColor Red
        Write-Host "   Veuillez installer Node.js depuis https://nodejs.org/" -ForegroundColor Yellow
        Write-Host "   Ou ajoutez Node.js au PATH de votre système" -ForegroundColor Yellow
        exit 1
    }
}

# Obtenir le répertoire du script
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Split-Path -Parent $scriptDir
$setAdminScript = Join-Path $scriptDir "setAdmin.js"

if (-not (Test-Path $setAdminScript)) {
    Write-Host "❌ Script setAdmin.js non trouvé: $setAdminScript" -ForegroundColor Red
    exit 1
}

Write-Host "🚀 Exécution du script setAdmin.js..." -ForegroundColor Cyan
Write-Host ""

# Changer vers le répertoire backend pour que les imports fonctionnent
Push-Location $backendDir

try {
    # Exécuter le script Node.js
    & $nodeExe $setAdminScript
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Script exécuté avec succès!" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "❌ Erreur lors de l'exécution du script (code: $LASTEXITCODE)" -ForegroundColor Red
        exit $LASTEXITCODE
    }
} catch {
    Write-Host ""
    Write-Host "❌ Erreur: $_" -ForegroundColor Red
    exit 1
} finally {
    Pop-Location
}

