# 🔄 Guide de Migration des Utilisateurs vers Plan FREE

## 📋 Prérequis

1. ✅ MongoDB connecté
2. ✅ Variables d'environnement configurées (`MONGODB_URI`)
3. ✅ Accès au serveur backend (local ou Render)

---

## 🧪 Étape 1: Test en Mode Dry-Run

### 1.1 Exécuter le Script en Mode Test

```bash
# Depuis la racine du projet
node backend/scripts/migrateUsersToFreePlan.js --dry-run
```

### 1.2 Vérifier les Résultats

Le script affichera:
- ✅ Nombre d'utilisateurs à migrer
- ✅ Détails de chaque migration (simulée)
- ✅ Utilisateurs qui dépassent le quota FREE
- ⚠️ Avertissements si nécessaire

### 1.3 Exemple de Sortie

```
🔄 Starting migration to FREE plan...
Mode: DRY RUN
✅ Connected to MongoDB
📊 Found 150 users to migrate

[1/150] Processing: user@example.com
[DRY RUN] Would migrate: user@example.com
  Current plan: null → free
  Current quota: 1099.51 GB → 100.00 GB

[2/150] Processing: another@example.com
[DRY RUN] Would migrate: another@example.com
  Current plan: null → free
  Current quota: 1099.51 GB → 100.00 GB

...

📊 Migration Summary:
   Total users: 150
   Migrated: 0 (dry run)
   Already migrated: 0
   Errors: 0
   Users exceeding FREE quota: 5

⚠️  This was a DRY RUN. No users were actually migrated.
   Run without --dry-run to perform the actual migration.
```

---

## ✅ Étape 2: Migration Réelle

### 2.1 Exécuter la Migration

```bash
# Depuis la racine du projet
node backend/scripts/migrateUsersToFreePlan.js
```

### 2.2 Vérifier les Résultats

Le script affichera:
- ✅ Nombre d'utilisateurs migrés
- ✅ Utilisateurs déjà migrés
- ⚠️ Utilisateurs dépassant le quota
- ❌ Erreurs éventuelles

### 2.3 Exemple de Sortie

```
🔄 Starting migration to FREE plan...
Mode: LIVE
✅ Connected to MongoDB
📊 Found 150 users to migrate

[1/150] Processing: user@example.com
✅ Migrated: user@example.com
  Plan: null → free
  Quota: 1099.51 GB → 100.00 GB

...

📊 Migration Summary:
   Total users: 150
   Migrated: 145
   Already migrated: 3
   Errors: 0
   Users exceeding FREE quota: 5

✅ Migration completed!

⚠️  Warning: 5 users exceed the FREE quota limit.
   They will need to upgrade to continue using their files.
```

---

## 🔍 Étape 3: Migration d'un Utilisateur Spécifique

### 3.1 Migrer un Utilisateur Unique

```bash
# Remplacer USER_ID par l'ID MongoDB de l'utilisateur
node backend/scripts/migrateUsersToFreePlan.js --user-id=USER_ID
```

### 3.2 Trouver l'ID d'un Utilisateur

```javascript
// Dans MongoDB Compass ou mongo shell
db.users.find({ email: "user@example.com" }, { _id: 1 })
```

---

## ⚠️ Points d'Attention

### Utilisateurs Dépassant le Quota

Si un utilisateur utilise plus de 100 Go:
- ✅ Il sera quand même migré vers FREE
- ⚠️ Il ne pourra plus uploader de nouveaux fichiers
- 💡 Il devra upgrader pour continuer

### Utilisateurs Déjà Migrés

Le script détecte automatiquement:
- ✅ Utilisateurs avec `plan: 'free'`
- ✅ Utilisateurs avec `quota_limit: 100 Go`
- ✅ Ne les migre pas à nouveau

### Erreurs Possibles

- ❌ Connexion MongoDB échouée
- ❌ Utilisateur introuvable
- ❌ Erreur de sauvegarde

Le script continue même en cas d'erreur et affiche un résumé.

---

## 🔄 Étape 4: Vérification Post-Migration

### 4.1 Vérifier dans MongoDB

```javascript
// Compter les utilisateurs avec plan FREE
db.users.countDocuments({ plan: 'free' })

// Vérifier le quota
db.users.find({ plan: 'free' }, { email: 1, quota_limit: 1, quota_used: 1 })
```

### 4.2 Vérifier via l'API

```bash
# Récupérer le plan actuel d'un utilisateur
curl -X GET \
  https://votre-backend.onrender.com/api/plans/current \
  -H "Authorization: Bearer TOKEN"
```

---

## 📊 Statistiques Post-Migration

### Exemple de Requête MongoDB

```javascript
// Statistiques par plan
db.users.aggregate([
  {
    $group: {
      _id: "$plan",
      count: { $sum: 1 },
      avgQuotaUsed: { $avg: "$quota_used" },
      totalQuotaUsed: { $sum: "$quota_used" }
    }
  }
])
```

---

## 🚨 En Cas de Problème

### Rollback (si nécessaire)

Si vous devez annuler la migration:

```javascript
// Dans MongoDB
db.users.updateMany(
  { plan: 'free' },
  { 
    $set: { 
      plan: null,
      quota_limit: 1099511627776 // 1 To
    } 
  }
)
```

### Logs

Le script log toutes les actions dans la console. Conservez les logs pour référence.

---

## ✅ Checklist de Migration

- [ ] Backup de la base de données
- [ ] Test en mode dry-run
- [ ] Vérification des résultats du dry-run
- [ ] Migration réelle
- [ ] Vérification post-migration
- [ ] Notification des utilisateurs (optionnel)

---

**Une fois la migration terminée, tous les utilisateurs seront sur le plan FREE avec 100 Go ! 🎉**

