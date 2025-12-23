# Script de nettoyage de la racine du projet Fylora
# Garde uniquement: backend/, frontend-web/, mobile-app/, README.md, docker-compose.yml

Write-Host "Nettoyage de la racine du projet..." -ForegroundColor Cyan

# Supprimer tous les fichiers .md sauf README.md
Get-ChildItem -Path . -File -Filter "*.md" | Where-Object { $_.Name -ne "README.md" } | ForEach-Object {
    Write-Host "  Suppression: $($_.Name)" -ForegroundColor Yellow
    Remove-Item $_.FullName -Force
}

# Supprimer tous les fichiers .ps1 a la racine
Get-ChildItem -Path . -File -Filter "*.ps1" | ForEach-Object {
    Write-Host "  Suppression: $($_.Name)" -ForegroundColor Yellow
    Remove-Item $_.FullName -Force
}

# Supprimer tous les fichiers .txt
Get-ChildItem -Path . -File -Filter "*.txt" | ForEach-Object {
    Write-Host "  Suppression: $($_.Name)" -ForegroundColor Yellow
    Remove-Item $_.FullName -Force
}

# Supprimer render.yaml
if (Test-Path "render.yaml") {
    Write-Host "  Suppression: render.yaml" -ForegroundColor Yellow
    Remove-Item "render.yaml" -Force
}

# Supprimer Dockerfile a la racine
if (Test-Path "Dockerfile") {
    Write-Host "  Suppression: Dockerfile (racine)" -ForegroundColor Yellow
    Remove-Item "Dockerfile" -Force
}

# Supprimer le dossier docs/ a la racine
if (Test-Path "docs") {
    Write-Host "  Suppression: dossier docs/" -ForegroundColor Yellow
    Remove-Item "docs" -Recurse -Force
}

Write-Host ""
Write-Host "Nettoyage termine!" -ForegroundColor Green
Write-Host ""
Write-Host "Structure restante:" -ForegroundColor Cyan
Write-Host "   - backend/" -ForegroundColor White
Write-Host "   - frontend-web/" -ForegroundColor White
Write-Host "   - mobile-app/" -ForegroundColor White
Write-Host "   - README.md" -ForegroundColor White
Write-Host "   - docker-compose.yml" -ForegroundColor White
