# 🔧 Configuration MongoDB pour Render

## ✅ Informations MongoDB Atlas

Votre cluster MongoDB Atlas est déjà configuré :

- **Cluster** : `cluster0.u3cxqhm.mongodb.net`
- **Username** : `nema_fylora`
- **Password** : `huEtXacXPwGZFMmz`
- **Database** : `Fylora`

## 📝 Connection String Complète

Pour Render, utilisez cette connection string complète :

```
mongodb+srv://nema_fylora:huEtXacXPwGZFMmz@cluster0.u3cxqhm.mongodb.net/Fylora?retryWrites=true&w=majority
```

## 🔐 Configuration dans Render

### Étape 1 : Ajouter la Variable d'Environnement

1. Allez dans votre service backend sur Render Dashboard
2. Cliquez sur "Environment" dans le menu de gauche
3. Ajoutez une nouvelle variable :
   - **Key** : `MONGODB_URI`
   - **Value** : `mongodb+srv://nema_fylora:huEtXacXPwGZFMmz@cluster0.u3cxqhm.mongodb.net/Fylora?retryWrites=true&w=majority`

### Étape 2 : Vérifier l'Accès Réseau MongoDB Atlas

1. Allez sur https://cloud.mongodb.com
2. Connectez-vous à votre compte
3. Sélectionnez votre cluster `Cluster0`
4. Cliquez sur "Network Access" dans le menu de gauche
5. Assurez-vous que l'IP `0.0.0.0/0` est autorisée (pour permettre l'accès depuis Render)
   - Si ce n'est pas le cas, cliquez sur "Add IP Address"
   - Ajoutez `0.0.0.0/0` pour autoriser toutes les IPs

### Étape 3 : Vérifier l'Utilisateur de Base de Données

1. Dans MongoDB Atlas, allez dans "Database Access"
2. Vérifiez que l'utilisateur `nema_fylora` existe et a les permissions nécessaires
3. Le mot de passe doit être : `huEtXacXPwGZFMmz`

## 🧪 Test de Connexion

Après avoir configuré la variable d'environnement dans Render :

1. Redéployez votre service backend
2. Vérifiez les logs dans Render Dashboard
3. Vous devriez voir : `✅ MongoDB connected` ou `✅ MongoDB ready`

## ⚠️ Sécurité

**IMPORTANT** : 
- Cette connection string contient des identifiants sensibles
- Ne la commitez JAMAIS dans Git
- Utilisez uniquement les variables d'environnement dans Render
- Le fichier `.env` est déjà dans `.gitignore` pour éviter les commits accidentels

## 🔄 Variables d'Environnement Complètes pour Render

Voici toutes les variables nécessaires pour Render :

```env
# MongoDB (OBLIGATOIRE)
MONGODB_URI=mongodb+srv://nema_fylora:huEtXacXPwGZFMmz@cluster0.u3cxqhm.mongodb.net/Fylora?retryWrites=true&w=majority

# JWT Secrets (Générez avec: openssl rand -hex 32)
JWT_SECRET=<générez_un_secret_fort>
JWT_REFRESH_SECRET=<générez_un_autre_secret_fort>

# Server
NODE_ENV=production
PORT=5001

# CORS (remplacez par votre URL frontend Render)
CORS_ORIGIN=https://fylora-frontend.onrender.com

# OAuth Google
GOOGLE_CLIENT_ID=<votre_client_id_google>
GOOGLE_CLIENT_SECRET=<votre_client_secret_google>
GOOGLE_REDIRECT_URI=https://fylora-backend.onrender.com/api/auth/google/callback

# OAuth GitHub
GITHUB_CLIENT_ID=<votre_client_id_github>
GITHUB_CLIENT_SECRET=<votre_client_secret_github>
GITHUB_REDIRECT_URI=https://fylora-backend.onrender.com/api/auth/github/callback
```

## 📚 Ressources

- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)
- [Render Environment Variables](https://render.com/docs/environment-variables)




