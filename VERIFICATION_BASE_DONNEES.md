# Vérification de la Base de Données - Fylora

## 🔍 Problème Identifié

L'application peut se connecter à différentes bases de données MongoDB selon la configuration de `MONGO_URI`. Il est important de s'assurer qu'elle utilise toujours la base **"Fylora"** et jamais **"supfile"**.

## ✅ Protection Ajoutée

### Fichier Modifié : `backend/models/db.js`

Une fonction `garantirBaseFylora()` a été ajoutée qui :

1. ✅ **Détecte automatiquement** toute référence à "supfile" dans l'URI
2. ✅ **Redirige automatiquement** vers "Fylora" si "supfile" est détecté
3. ✅ **Remplace** toute autre base de données par "Fylora"
4. ✅ **Ajoute "/Fylora"** si aucune base n'est spécifiée dans l'URI
5. ✅ **Vérifie après connexion** que la base est bien "Fylora"
6. ✅ **Ferme la connexion** si "supfile" est détectée (protection stricte)

## 📋 Configuration Actuelle

### Variables d'Environnement

L'application utilise la variable `MONGO_URI` pour se connecter à MongoDB. Cette variable peut être définie dans :

1. **Fichier `.env`** dans le dossier `backend/` (recommandé pour le développement)
2. **Variables d'environnement système**
3. **Docker Compose** (fichier `.env` à la racine)

### Format de l'URI MongoDB

```
mongodb://[username:password@]host:port/database[?options]
```

**Exemples :**
- `mongodb://localhost:27017/Fylora` ✅ (correct)
- `mongodb://localhost:27017/supfile` ⚠️ (sera automatiquement changé en Fylora)
- `mongodb://localhost:27017` ⚠️ (sera automatiquement changé en mongodb://localhost:27017/Fylora)

## 🔍 Comment Vérifier la Base de Données Utilisée

### Méthode 1 : Vérifier les Logs du Backend

Au démarrage du backend, vous devriez voir :
```
🔄 Attempting to connect to MongoDB...
📍 Connection URI: mongodb://localhost:27017/Fylora
✓ Connected to MongoDB - Base de données: "Fylora"
```

### Méthode 2 : Script de Vérification

Exécutez le script de vérification :
```powershell
cd backend
node scripts/check-fylora-only.js
```

Ce script affichera :
- La base de données actuellement connectée
- Les collections présentes
- Un avertissement si ce n'est pas "Fylora"

### Méthode 3 : Vérifier dans MongoDB

Connectez-vous à MongoDB et listez les bases :
```powershell
mongosh
show dbs
use Fylora
show collections
```

## ⚙️ Configuration Recommandée

### Pour le Développement Local

Créez un fichier `backend/.env` avec :
```env
MONGO_URI=mongodb://localhost:27017/Fylora
NODE_ENV=development
SERVER_PORT=5001
JWT_SECRET=votre_secret_jwt
JWT_REFRESH_SECRET=votre_refresh_secret
```

### Pour Docker

Dans le fichier `.env` à la racine :
```env
MONGO_INITDB_DATABASE=Fylora
MONGO_URI=mongodb://user:password@db:27017/Fylora?authSource=admin
```

## 🚨 Protection Active

Si l'application détecte une tentative de connexion à "supfile", elle :

1. ⚠️ Affiche un avertissement dans les logs
2. 🔄 Redirige automatiquement vers "Fylora"
3. ❌ **Ferme la connexion** si "supfile" est toujours détectée après connexion
4. 🛑 **Arrête le serveur** pour éviter toute corruption de données

## ✅ Vérification Après Redémarrage

Après avoir modifié la configuration ou redémarré le serveur :

1. **Vérifier les logs** du backend au démarrage
2. **Exécuter** `node backend/scripts/check-fylora-only.js`
3. **Confirmer** que la base est bien "Fylora"

## 📝 Notes Importantes

- ⚠️ La protection est **active par défaut** dans le code
- ✅ Aucune action supplémentaire n'est nécessaire si vous utilisez l'URI correcte
- 🔒 La base "supfile" est **protégée** contre toute connexion accidentelle
- 📊 Toutes les données de l'application sont stockées dans **"Fylora"**

## 🐛 Dépannage

### Si l'application se connecte à la mauvaise base :

1. **Vérifier** la variable `MONGO_URI` dans `.env`
2. **Vérifier** les variables d'environnement système
3. **Redémarrer** le serveur backend
4. **Vérifier** les logs pour voir quelle base est utilisée

### Si vous voyez un avertissement :

```
⚠️  Détection de référence à "supfile" dans l'URI MongoDB
   Redirection automatique vers "Fylora" (protection active)...
```

Cela signifie que la protection fonctionne et que l'URI a été corrigée automatiquement. Vous pouvez ignorer cet avertissement ou corriger votre configuration pour éviter qu'il apparaisse.





