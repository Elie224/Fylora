# Script de Test Rapide - Application Mobile Fylora
# PowerShell Script pour vérifier la configuration avant les tests

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  TEST RAPIDE - Fylora Mobile App" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Vérifier Flutter
Write-Host "1. Vérification de Flutter..." -ForegroundColor Yellow
$flutterVersion = flutter --version 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✓ Flutter installé" -ForegroundColor Green
    $version = ($flutterVersion | Select-String "Flutter (\d+\.\d+\.\d+)").Matches.Groups[1].Value
    Write-Host "   Version: $version" -ForegroundColor Gray
} else {
    Write-Host "   ✗ Flutter non trouvé" -ForegroundColor Red
    Write-Host "   Installez Flutter: https://docs.flutter.dev/get-started/install" -ForegroundColor Yellow
    exit 1
}
Write-Host ""

# 2. Vérifier Flutter Doctor
Write-Host "2. Vérification Flutter Doctor..." -ForegroundColor Yellow
flutter doctor --android-licenses 2>&1 | Out-Null
$doctor = flutter doctor 2>&1
$issues = ($doctor | Select-String "✗").Count
if ($issues -eq 0) {
    Write-Host "   ✓ Flutter Doctor: Aucun problème" -ForegroundColor Green
} else {
    Write-Host "   ⚠ Flutter Doctor: $issues problème(s) détecté(s)" -ForegroundColor Yellow
    Write-Host "   Exécutez 'flutter doctor' pour plus de détails" -ForegroundColor Gray
}
Write-Host ""

# 3. Vérifier les dépendances
Write-Host "3. Vérification des dépendances..." -ForegroundColor Yellow
if (Test-Path "mobile-app/pubspec.yaml") {
    Set-Location mobile-app
    Write-Host "   Installation des dépendances..." -ForegroundColor Gray
    flutter pub get 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✓ Dépendances installées" -ForegroundColor Green
    } else {
        Write-Host "   ✗ Erreur lors de l'installation des dépendances" -ForegroundColor Red
        exit 1
    }
    Set-Location ..
} else {
    Write-Host "   ✗ Dossier mobile-app non trouvé" -ForegroundColor Red
    exit 1
}
Write-Host ""

# 4. Vérifier les appareils
Write-Host "4. Vérification des appareils disponibles..." -ForegroundColor Yellow
Set-Location mobile-app
$devices = flutter devices 2>&1
$deviceCount = ($devices | Select-String "•").Count
if ($deviceCount -gt 0) {
    Write-Host "   ✓ $deviceCount appareil(s) détecté(s)" -ForegroundColor Green
    $devices | Select-String "•" | ForEach-Object {
        Write-Host "   - $_" -ForegroundColor Gray
    }
} else {
    Write-Host "   ⚠ Aucun appareil détecté" -ForegroundColor Yellow
    Write-Host "   Connectez un appareil ou démarrez un émulateur" -ForegroundColor Gray
}
Set-Location ..
Write-Host ""

# 5. Vérifier la configuration API
Write-Host "5. Vérification de la configuration API..." -ForegroundColor Yellow
if (Test-Path "mobile-app/lib/utils/constants.dart") {
    $constants = Get-Content "mobile-app/lib/utils/constants.dart" -Raw
    if ($constants -match "defaultValue: '(.+)'") {
        $apiUrl = $matches[1]
        Write-Host "   URL API par défaut: $apiUrl" -ForegroundColor Gray
        Write-Host "   ✓ Configuration API trouvée" -ForegroundColor Green
    } else {
        Write-Host "   ⚠ URL API par défaut non trouvée" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ✗ Fichier constants.dart non trouvé" -ForegroundColor Red
}
Write-Host ""

# 6. Vérifier les fichiers critiques
Write-Host "6. Vérification des fichiers critiques..." -ForegroundColor Yellow
$criticalFiles = @(
    "mobile-app/lib/main.dart",
    "mobile-app/lib/services/auth_service.dart",
    "mobile-app/lib/services/oauth_service.dart",
    "mobile-app/lib/providers/auth_provider.dart",
    "mobile-app/lib/screens/auth/login_screen.dart",
    "mobile-app/lib/screens/auth/signup_screen.dart"
)

$allFilesExist = $true
foreach ($file in $criticalFiles) {
    if (Test-Path $file) {
        Write-Host "   ✓ $file" -ForegroundColor Green
    } else {
        Write-Host "   ✗ $file manquant" -ForegroundColor Red
        $allFilesExist = $false
    }
}

if (-not $allFilesExist) {
    Write-Host "   ⚠ Certains fichiers critiques sont manquants" -ForegroundColor Yellow
}
Write-Host ""

# 7. Résumé
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  RÉSUMÉ" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if ($LASTEXITCODE -eq 0 -and $allFilesExist) {
    Write-Host "✓ Configuration prête pour les tests !" -ForegroundColor Green
    Write-Host ""
    Write-Host "Prochaines étapes:" -ForegroundColor Yellow
    Write-Host "1. Connectez un appareil ou démarrez un émulateur" -ForegroundColor Gray
    Write-Host "2. Exécutez: flutter run --dart-define=API_URL=https://fylora-1.onrender.com" -ForegroundColor Gray
    Write-Host "3. Suivez le guide de test: GUIDE_TEST_COMPLET.md" -ForegroundColor Gray
} else {
    Write-Host "✗ Des problèmes ont été détectés" -ForegroundColor Red
    Write-Host "Corrigez les problèmes ci-dessus avant de continuer" -ForegroundColor Yellow
}

Write-Host ""

