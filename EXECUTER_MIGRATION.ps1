# Script PowerShell pour exécuter la migration
# Remplacez VOTRE_MOT_DE_PASSE par votre vrai mot de passe MongoDB

$env:MONGODB_URI = "mongodb+srv://nema_fylora:VOTRE_MOT_DE_PASSE@cluster0.u3cxqhm.mongodb.net/Fylora?retryWrites=true&w=majority"

cd backend
Write-Host "🔄 Exécution du script de migration en mode DRY RUN..." -ForegroundColor Yellow
node scripts/migrateUsersToFreePlan.js --dry-run

Write-Host "`n✅ Si le résultat vous convient, exécutez sans --dry-run pour la migration réelle :" -ForegroundColor Green
Write-Host "   node scripts/migrateUsersToFreePlan.js" -ForegroundColor Cyan

