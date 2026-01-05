# Instructions pour Exécuter la Migration Localement

## Problème
Le script `migrateUsersToFreePlan.js` nécessite la variable d'environnement `MONGODB_URI`.

## Solution 1 : Utiliser un fichier `.env` (Recommandé)

### Étape 1 : Créer ou modifier `backend/.env`

Ajoutez cette ligne dans `backend/.env` :

```env
MONGODB_URI=mongodb+srv://nema_fylora:VOTRE_MOT_DE_PASSE@cluster0.u3cxqhm.mongodb.net/Fylora?retryWrites=true&w=majority
```

**⚠️ Remplacez `VOTRE_MOT_DE_PASSE` par votre vrai mot de passe MongoDB Atlas.**

### Étape 2 : Exécuter le script

```powershell
cd backend
node scripts/migrateUsersToFreePlan.js --dry-run
```

---

## Solution 2 : Utiliser une variable d'environnement PowerShell (Alternative)

### Exécuter directement avec la variable :

```powershell
cd backend
$env:MONGODB_URI="mongodb+srv://nema_fylora:VOTRE_MOT_DE_PASSE@cluster0.u3cxqhm.mongodb.net/Fylora?retryWrites=true&w=majority"
node scripts/migrateUsersToFreePlan.js --dry-run
```

**⚠️ Remplacez `VOTRE_MOT_DE_PASSE` par votre vrai mot de passe MongoDB Atlas.**

---

## Solution 3 : Exécuter sur Render (Production)

### Via Render Shell (SSH)

1. Allez sur https://dashboard.render.com
2. Sélectionnez votre service `fylora-backend`
3. Cliquez sur "Shell" dans le menu
4. Exécutez :

```bash
cd backend
node scripts/migrateUsersToFreePlan.js --dry-run
```

Puis sans `--dry-run` pour la migration réelle :

```bash
node scripts/migrateUsersToFreePlan.js
```

---

## Où trouver MONGODB_URI ?

1. Allez sur https://cloud.mongodb.com
2. Connectez-vous
3. Sélectionnez votre cluster
4. Cliquez sur "Connect"
5. Choisissez "Connect your application"
6. Copiez la chaîne de connexion (elle ressemble à `mongodb+srv://...`)

---

## Sécurité

⚠️ **NE COMMITTEZ JAMAIS** le fichier `.env` dans Git. Il est déjà dans `.gitignore`.

