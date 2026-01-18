# Script de build APK pour Production Fylora Mobile
# Usage: .\build-apk-production.ps1

param(
    [string]$ApiUrl = "https://fylora-1.onrender.com",
    [switch]$Clean = $true
)

Write-Host "========================================" -ForegroundColor Green
Write-Host "Fylora Mobile - Build APK Production" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Afficher la configuration
Write-Host "Configuration:" -ForegroundColor Cyan
Write-Host "   API URL: $ApiUrl" -ForegroundColor White
Write-Host "   Clean Build: $Clean" -ForegroundColor White
Write-Host ""

# Vérifier que Flutter est installé
Write-Host "Vérification de Flutter..." -ForegroundColor Yellow
$flutterVersion = flutter --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERREUR: Flutter n'est pas installé ou pas dans le PATH" -ForegroundColor Red
    Write-Host "Installez Flutter depuis: https://flutter.dev/docs/get-started/install" -ForegroundColor Red
    exit 1
}
Write-Host "Flutter détecté ✓" -ForegroundColor Green
Write-Host ""

# Nettoyer si demandé
if ($Clean) {
    Write-Host "Nettoyage des builds précédents..." -ForegroundColor Yellow
    flutter clean
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Erreur lors du nettoyage" -ForegroundColor Red
        exit 1
    }
    Write-Host "Nettoyage terminé ✓" -ForegroundColor Green
    Write-Host ""
}

# Récupérer les dépendances
Write-Host "Installation des dépendances..." -ForegroundColor Yellow
flutter pub get
if ($LASTEXITCODE -ne 0) {
    Write-Host "Erreur lors de l'installation des dépendances" -ForegroundColor Red
    exit 1
}
Write-Host "Dépendances installées ✓" -ForegroundColor Green
Write-Host ""

# Vérifier les médecins Flutter
Write-Host "Vérification de l'environnement Flutter..." -ForegroundColor Yellow
flutter doctor
Write-Host ""

# Build Android APK Release
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Build Android APK (Release)..." -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$buildCommand = "flutter build apk --release --dart-define=API_URL=$ApiUrl"
Write-Host "Commande: $buildCommand" -ForegroundColor Gray
Write-Host ""

flutter build apk --release --dart-define=API_URL=$ApiUrl

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "ERREUR: Le build Android a échoué" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    exit 1
}

# Vérifier que l'APK a été créé
$apkPath = "build\app\outputs\flutter-apk\app-release.apk"
if (Test-Path $apkPath) {
    $apkSize = (Get-Item $apkPath).Length / 1MB
    $apkFullPath = (Resolve-Path $apkPath).Path
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "✓ BUILD RÉUSSI !" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Fichier APK:" -ForegroundColor Cyan
    Write-Host "   Chemin: $apkFullPath" -ForegroundColor White
    Write-Host "   Taille: $([math]::Round($apkSize, 2)) MB" -ForegroundColor White
    Write-Host ""
    Write-Host "Prochaines étapes:" -ForegroundColor Cyan
    Write-Host "   1. Transférez l'APK sur votre appareil Android" -ForegroundColor White
    Write-Host "   2. Activez 'Sources inconnues' dans les paramètres de sécurité" -ForegroundColor White
    Write-Host "   3. Installez l'APK depuis l'application Fichiers" -ForegroundColor White
    Write-Host ""
    Write-Host "Pour ouvrir le dossier:" -ForegroundColor Gray
    Write-Host "   explorer build\app\outputs\flutter-apk\" -ForegroundColor Gray
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "ERREUR: L'APK n'a pas été trouvé à l'emplacement attendu" -ForegroundColor Red
    Write-Host "Chemin attendu: $apkPath" -ForegroundColor Red
    exit 1
}
