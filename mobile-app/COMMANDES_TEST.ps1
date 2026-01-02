# Commandes de Test - Application Mobile Fylora
# À exécuter une fois Flutter est reconnu

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  COMMANDES DE TEST - Fylora Mobile" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Vérifier que Flutter est reconnu
Write-Host "Vérification de Flutter..." -ForegroundColor Yellow
try {
    $flutterVersion = flutter --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Flutter est reconnu !" -ForegroundColor Green
        Write-Host ""
    } else {
        Write-Host "✗ Flutter n'est pas reconnu" -ForegroundColor Red
        Write-Host "Consultez RESOLUTION_PROBLEME_FLUTTER.md" -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Host "✗ Flutter n'est pas reconnu" -ForegroundColor Red
    Write-Host "Consultez RESOLUTION_PROBLEME_FLUTTER.md" -ForegroundColor Yellow
    exit 1
}

# Aller dans le dossier mobile-app
if (Test-Path "mobile-app") {
    Set-Location mobile-app
    Write-Host "Dossier mobile-app trouvé" -ForegroundColor Green
} else {
    Write-Host "✗ Dossier mobile-app non trouvé" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ÉTAPES DE TEST" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Étape 1 : Installer les dépendances
Write-Host "Étape 1 : Installation des dépendances..." -ForegroundColor Yellow
flutter pub get
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Dépendances installées" -ForegroundColor Green
} else {
    Write-Host "✗ Erreur lors de l'installation des dépendances" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Étape 2 : Vérifier les appareils
Write-Host "Étape 2 : Vérification des appareils..." -ForegroundColor Yellow
Write-Host "Appareils disponibles :" -ForegroundColor Gray
flutter devices
Write-Host ""

# Étape 3 : Options de test
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  OPTIONS DE TEST" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Tester sur un appareil connecté :" -ForegroundColor Yellow
Write-Host "   flutter run --dart-define=API_URL=https://fylora-1.onrender.com" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Tester sur un émulateur Android :" -ForegroundColor Yellow
Write-Host "   flutter run --dart-define=API_URL=http://10.0.2.2:5001" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Tester sur Chrome (Web) :" -ForegroundColor Yellow
Write-Host "   flutter run -d chrome --dart-define=API_URL=https://fylora-1.onrender.com" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Analyser le code :" -ForegroundColor Yellow
Write-Host "   flutter analyze" -ForegroundColor Gray
Write-Host ""
Write-Host "5. Vérifier la configuration :" -ForegroundColor Yellow
Write-Host "   flutter doctor" -ForegroundColor Gray
Write-Host ""

# Demander quelle action effectuer
$choice = Read-Host "Que voulez-vous faire ? (1-5, ou 'q' pour quitter)"
switch ($choice) {
    "1" {
        Write-Host "Lancement sur appareil connecté..." -ForegroundColor Yellow
        flutter run --dart-define=API_URL=https://fylora-1.onrender.com
    }
    "2" {
        Write-Host "Lancement sur émulateur Android..." -ForegroundColor Yellow
        flutter run --dart-define=API_URL=http://10.0.2.2:5001
    }
    "3" {
        Write-Host "Lancement sur Chrome..." -ForegroundColor Yellow
        flutter run -d chrome --dart-define=API_URL=https://fylora-1.onrender.com
    }
    "4" {
        Write-Host "Analyse du code..." -ForegroundColor Yellow
        flutter analyze
    }
    "5" {
        Write-Host "Vérification de la configuration..." -ForegroundColor Yellow
        flutter doctor
    }
    "q" {
        Write-Host "Au revoir !" -ForegroundColor Cyan
        exit 0
    }
    default {
        Write-Host "Option invalide" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Pour plus d'informations, consultez GUIDE_TEST_COMPLET.md" -ForegroundColor Cyan

