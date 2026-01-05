# Guide de Migration vers 100 Go

## Problème
Les utilisateurs existants peuvent avoir encore un quota de 1 To au lieu de 100 Go (plan FREE).

## Solution
Exécuter le script de migration pour mettre à jour tous les utilisateurs existants.

## Étapes

### 1. Test en mode DRY RUN (recommandé)
```bash
cd backend
node scripts/migrateUsersToFreePlan.js --dry-run
```

Cela affichera ce qui serait migré **sans modifier** la base de données.

### 2. Migration réelle
```bash
cd backend
node scripts/migrateUsersToFreePlan.js
```

### 3. Migration d'un utilisateur spécifique
```bash
cd backend
node scripts/migrateUsersToFreePlan.js --user-id=694c331313d80dd64b1df5ad
```

## Ce que fait le script
- Met à jour `plan` → `'free'` pour tous les utilisateurs
- Met à jour `quota_limit` → `100 Go` (107374182400 bytes) pour tous les utilisateurs
- Affiche un avertissement si un utilisateur utilise déjà plus de 100 Go

## Résultat attendu
```
🔄 Starting migration to FREE plan...
Mode: LIVE
✅ Connected to MongoDB
📊 Found 2 users to migrate

[1/2] Processing: user@example.com
✅ Migrated: user@example.com
  Plan: null → free
  Quota: 1024.00 GB → 100.00 GB

[2/2] Processing: another@example.com
✅ Migrated: another@example.com
  Plan: null → free
  Quota: 1024.00 GB → 100.00 GB

📊 Migration Summary:
   Total users: 2
   Migrated: 2
   Already migrated: 0
   Errors: 0
   Users exceeding FREE quota: 0

✅ Migration completed!
```

## Important
- Les utilisateurs qui utilisent déjà plus de 100 Go seront migrés quand même, mais devront upgrader pour continuer à utiliser leurs fichiers.
- Les nouveaux utilisateurs créés après cette migration auront automatiquement 100 Go (déjà configuré dans le code).

