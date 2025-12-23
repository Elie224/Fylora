# Script pour corriger le fichier .env.local

Write-Host "=== CORRECTION DU FICHIER .env.local ===" -ForegroundColor Cyan
Write-Host ""

Set-Location frontend-web

if (Test-Path ".env.local") {
    Write-Host "Fichier .env.local trouve" -ForegroundColor Yellow
    
    # Lire le contenu
    $content = Get-Content ".env.local" -Raw
    
    # Remplacer le port 5000 par 5001
    $newContent = $content -replace "localhost:5000", "localhost:5001"
    
    # Sauvegarder
    Set-Content -Path ".env.local" -Value $newContent -NoNewline
    
    Write-Host "OK Fichier .env.local corrige (port 5001)" -ForegroundColor Green
    Write-Host ""
    Write-Host "Contenu du fichier:" -ForegroundColor Yellow
    Get-Content ".env.local"
} else {
    Write-Host "Aucun fichier .env.local trouve" -ForegroundColor Green
}

Write-Host ""
Write-Host "IMPORTANT: Redemarrez le serveur Vite pour que les changements soient pris en compte!" -ForegroundColor Yellow
Write-Host ""

Set-Location ..

