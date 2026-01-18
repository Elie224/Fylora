# Script PowerShell pour générer une icône Fylora simple
# Nécessite ImageMagick : https://imagemagick.org/script/download.php

$ErrorActionPreference = "Stop"

Write-Host "🎨 Génération de l'icône Fylora..." -ForegroundColor Cyan

# Vérifier si ImageMagick est installé
$magickCmd = Get-Command magick -ErrorAction SilentlyContinue
if (-not $magickCmd) {
    Write-Host "❌ ImageMagick n'est pas installé." -ForegroundColor Red
    Write-Host "📥 Installez ImageMagick depuis : https://imagemagick.org/script/download.php" -ForegroundColor Yellow
    Write-Host "📝 Ou créez l'icône manuellement avec un outil graphique." -ForegroundColor Yellow
    exit 1
}

# Créer le dossier si nécessaire
$iconDir = "assets\icon"
if (-not (Test-Path $iconDir)) {
    New-Item -ItemType Directory -Path $iconDir -Force | Out-Null
    Write-Host "✅ Dossier $iconDir créé" -ForegroundColor Green
}

# Couleurs Fylora
$bgColor = "#2196F3"  # Bleu Fylora
$textColor = "#FFFFFF" # Blanc
$size = 1024

# Créer une icône simple avec texte "F"
Write-Host "📐 Création de l'icône principale (${size}x${size})..." -ForegroundColor Cyan

# Créer un cercle bleu avec texte "F" au centre
magick -size ${size}x${size} xc:"$bgColor" `
    -fill "$textColor" `
    -gravity center `
    -pointsize 600 `
    -font Arial-Bold `
    -draw "text 0,0 'F'" `
    "$iconDir\fylora_icon.png"

if (Test-Path "$iconDir\fylora_icon.png") {
    Write-Host "✅ Icône principale créée : $iconDir\fylora_icon.png" -ForegroundColor Green
} else {
    Write-Host "❌ Erreur lors de la création de l'icône" -ForegroundColor Red
    exit 1
}

# Créer l'icône foreground (sans fond, pour Android adaptive icons)
Write-Host "📐 Création de l'icône foreground (${size}x${size})..." -ForegroundColor Cyan

magick -size ${size}x${size} xc:none `
    -fill "$textColor" `
    -gravity center `
    -pointsize 600 `
    -font Arial-Bold `
    -draw "text 0,0 'F'" `
    "$iconDir\fylora_icon_foreground.png"

if (Test-Path "$iconDir\fylora_icon_foreground.png") {
    Write-Host "✅ Icône foreground créée : $iconDir\fylora_icon_foreground.png" -ForegroundColor Green
} else {
    Write-Host "⚠️  Erreur lors de la création de l'icône foreground" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "✅ Icônes Fylora générées avec succès !" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Prochaines étapes :" -ForegroundColor Cyan
Write-Host "   1. flutter pub get" -ForegroundColor White
Write-Host "   2. flutter pub run flutter_launcher_icons" -ForegroundColor White
Write-Host "   3. flutter build apk --release" -ForegroundColor White
Write-Host ""
