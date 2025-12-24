# 🚀 Guide de Déploiement sur Render

Ce guide vous explique comment déployer l'application Fylora (backend + frontend) sur Render.

## 📋 Prérequis

1. Un compte Render (gratuit) : https://render.com
2. Un compte MongoDB Atlas (gratuit) : https://www.mongodb.com/cloud/atlas
3. Les identifiants OAuth Google et GitHub configurés

---

## 🔧 Partie 1 : Préparation MongoDB Atlas

### 1.1 Créer un cluster MongoDB Atlas

1. Allez sur https://www.mongodb.com/cloud/atlas
2. Créez un compte gratuit
3. Créez un nouveau cluster (gratuit M0)
4. Configurez un utilisateur de base de données :
   - Username : `fylora_admin`
   - Password : (générez un mot de passe fort)
5. Configurez le réseau :
   - Ajoutez `0.0.0.0/0` pour autoriser toutes les IPs (ou l'IP de Render)
6. Récupérez votre connection string :
   - Cliquez sur "Connect" > "Connect your application"
   - Copiez la chaîne de connexion (elle ressemble à : `mongodb+srv://fylora_admin:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`)

---

## 🔧 Partie 2 : Déploiement du Backend

### 2.1 Créer un nouveau Web Service sur Render

1. Allez sur https://dashboard.render.com
2. Cliquez sur "New +" > "Web Service"
3. Connectez votre repository GitHub `Elie224/Fylora`
4. Configurez le service :
   - **Name** : `fylora-backend`
   - **Region** : Choisissez la région la plus proche (ex: Frankfurt)
   - **Branch** : `main`
   - **Root Directory** : `backend`
   - **Runtime** : `Node`
   - **Build Command** : `npm install`
   - **Start Command** : `npm start`

### 2.2 Configurer les Variables d'Environnement

Dans la section "Environment Variables" de Render, ajoutez :

```env
# MongoDB - Utilisez votre connection string MongoDB Atlas
MONGODB_URI=mongodb+srv://nema_fylora:huEtXacXPwGZFMmz@cluster0.u3cxqhm.mongodb.net/Fylora?retryWrites=true&w=majority

# JWT
JWT_SECRET=<GÉNÉREZ_UN_SECRET_ALÉATOIRE_FORT>
JWT_REFRESH_SECRET=<GÉNÉREZ_UN_AUTRE_SECRET_ALÉATOIRE_FORT>

# Server
NODE_ENV=production
# ⚠️ NE PAS définir PORT - Render le définit automatiquement
SERVER_HOST=0.0.0.0

# CORS - Remplacez par votre URL Render frontend (SANS slash final)
CORS_ORIGIN=https://fylora-frontend.onrender.com

# OAuth Google
GOOGLE_CLIENT_ID=<VOTRE_CLIENT_ID_GOOGLE>
GOOGLE_CLIENT_SECRET=<VOTRE_CLIENT_SECRET_GOOGLE>
GOOGLE_REDIRECT_URI=https://fylora-backend.onrender.com/api/auth/google/callback

# OAuth GitHub
GITHUB_CLIENT_ID=<VOTRE_CLIENT_ID_GITHUB>
GITHUB_CLIENT_SECRET=<VOTRE_CLIENT_SECRET_GITHUB>
GITHUB_REDIRECT_URI=https://fylora-backend.onrender.com/api/auth/github/callback

# Redis (optionnel - pour le cache)
REDIS_URL=<URL_REDIS_SI_VOUS_EN_AVEZ_UN>
# Ou laissez vide si vous n'utilisez pas Redis

# Uploads
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10737418240
```

**⚠️ IMPORTANT** :
- **NE PAS définir PORT** : Render définit automatiquement la variable `PORT`. Ne l'ajoutez pas dans les variables d'environnement.
- Remplacez `<VOTRE_MOT_DE_PASSE>` dans MONGODB_URI par le mot de passe MongoDB
- Remplacez `cluster0.xxxxx` par votre vrai cluster MongoDB
- Générez des secrets JWT forts (utilisez `openssl rand -hex 32` ou un générateur en ligne)
- Les URLs Render seront au format `https://fylora-backend.onrender.com` (vous obtiendrez l'URL exacte après le déploiement)
- **CORS_ORIGIN** : Utilisez l'URL exacte du frontend SANS slash final (ex: `https://fylora-frontend.onrender.com` et NON `https://fylora-frontend.onrender.com/`)

### 2.3 Mettre à jour les Redirect URIs OAuth

**Google Cloud Console** :
1. Allez sur https://console.cloud.google.com/apis/credentials
2. Modifiez votre OAuth Client
3. Ajoutez dans "Authorized redirect URIs" :
   ```
   https://fylora-backend.onrender.com/api/auth/google/callback
   ```
4. Ajoutez dans "Authorized JavaScript origins" :
   ```
   https://fylora-backend.onrender.com
   ```

**GitHub Settings** :
1. Allez sur https://github.com/settings/developers
2. Modifiez votre OAuth App
3. Mettez à jour "Authorization callback URL" :
   ```
   https://fylora-backend.onrender.com/api/auth/github/callback
   ```
4. Mettez à jour "Homepage URL" :
   ```
   https://fylora-frontend.onrender.com
   ```

### 2.4 Vérifier le package.json du Backend

Assurez-vous que `backend/package.json` contient :

```json
{
  "scripts": {
    "start": "node app.js",
    "dev": "nodemon app.js"
  }
}
```

### 2.5 Créer le fichier render.yaml (optionnel mais recommandé)

Créez `render.yaml` à la racine du projet :

```yaml
services:
  - type: web
    name: fylora-backend
    env: node
    region: frankfurt
    plan: free
    buildCommand: cd backend && npm install
    startCommand: cd backend && npm start
    envVars:
      - key: NODE_ENV
        value: production
      # ⚠️ NE PAS définir PORT - Render le définit automatiquement
      - key: SERVER_HOST
        value: 0.0.0.0
    healthCheckPath: /health
```

---

## 🎨 Partie 3 : Déploiement du Frontend

### 3.1 Créer un nouveau Static Site sur Render

1. Allez sur https://dashboard.render.com
2. Cliquez sur "New +" > "Static Site"
3. Connectez votre repository GitHub `Elie224/Fylora`
4. Configurez le site :
   - **Name** : `fylora-frontend`
   - **Branch** : `main`
   - **Root Directory** : `frontend-web`
   - **Build Command** : `npm install && npm run build`
   - **Publish Directory** : `dist`

### 3.2 Configurer les Variables d'Environnement du Frontend

Dans la section "Environment Variables", ajoutez :

```env
VITE_API_URL=https://fylora-backend.onrender.com
```

**⚠️ Remplacez `fylora-backend.onrender.com` par l'URL exacte de votre backend Render**

### 3.3 Vérifier le fichier config.js du Frontend

Assurez-vous que `frontend-web/src/config.js` utilise :

```javascript
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
```

---

## 🔄 Partie 4 : Mise à jour des URLs après Déploiement

### 4.1 Mettre à jour CORS_ORIGIN dans le Backend

Une fois le frontend déployé, mettez à jour `CORS_ORIGIN` dans les variables d'environnement du backend avec l'URL exacte du frontend.

### 4.2 Mettre à jour les Redirect URIs OAuth

Mettez à jour les Redirect URIs dans Google Cloud Console et GitHub Settings avec les URLs Render exactes.

---

## 🧪 Partie 5 : Vérification et Tests

### 5.1 Vérifier le Backend

1. **Health check simple** : Allez sur `https://fylora-backend.onrender.com/health`
   - Vous devriez voir : `{"status":"OK","message":"Fylora API is running"}`
2. **Health check détaillé** : Allez sur `https://fylora-backend.onrender.com/api/health`
   - Vous devriez voir une réponse JSON avec le statut MongoDB, mémoire, etc.
3. **Page d'accueil API** : Allez sur `https://fylora-backend.onrender.com/`
   - Vous devriez voir la documentation JSON de l'API

### 5.2 Vérifier le Frontend

1. Allez sur `https://fylora-frontend.onrender.com`
2. Testez la connexion
3. Testez l'authentification OAuth

### 5.3 Vérifier les Logs

Dans Render Dashboard :
- Allez dans votre service backend
- Cliquez sur "Logs" pour voir les logs en temps réel
- Vérifiez qu'il n'y a pas d'erreurs

---

## 📝 Checklist de Déploiement

### Backend
- [ ] Cluster MongoDB Atlas créé et configuré
- [ ] Web Service Render créé
- [ ] Toutes les variables d'environnement configurées
- [ ] Redirect URIs OAuth mis à jour avec l'URL Render
- [ ] Backend déployé et accessible
- [ ] Health check fonctionne (`/api/health`)

### Frontend
- [ ] Static Site Render créé
- [ ] Variable d'environnement `VITE_API_URL` configurée
- [ ] Frontend déployé et accessible
- [ ] Connexion au backend fonctionne

### OAuth
- [ ] Google OAuth : Redirect URI mis à jour dans Google Cloud Console
- [ ] GitHub OAuth : Redirect URI mis à jour dans GitHub Settings
- [ ] Test de connexion Google réussi
- [ ] Test de connexion GitHub réussi

---

## 🐛 Résolution de Problèmes

### Backend ne démarre pas

1. **Vérifiez les logs dans Render Dashboard** : Allez dans votre service > "Logs" pour voir les erreurs détaillées
2. **Variables d'environnement** :
   - ✅ Vérifiez que `MONGODB_URI` est correct (avec le mot de passe remplacé)
   - ✅ Vérifiez que `JWT_SECRET` et `JWT_REFRESH_SECRET` sont définis
   - ✅ **NE PAS définir `PORT`** - Render le gère automatiquement
   - ✅ Vérifiez que `NODE_ENV=production`
3. **Erreur MongoDB** : Si vous voyez "MongoDB connection timeout" :
   - Vérifiez que votre cluster MongoDB Atlas autorise les connexions depuis `0.0.0.0/0`
   - Vérifiez que le mot de passe dans `MONGODB_URI` est correct
   - Vérifiez que le nom de la base de données dans l'URI est correct
4. **Erreur de port** : Si vous voyez "EADDRINUSE" ou "port already in use" :
   - Supprimez la variable `PORT` des variables d'environnement (Render la définit automatiquement)
5. **Build échoue** : Vérifiez que `Root Directory` est bien défini sur `backend`

### Erreur CORS

1. **Vérifiez que `CORS_ORIGIN` correspond exactement** :
   - URL du frontend SANS slash final : `https://fylora-frontend.onrender.com` (et NON `https://fylora-frontend.onrender.com/`)
   - Vérifiez dans la console du navigateur l'erreur exacte (elle indiquera l'origine bloquée)
2. **Si plusieurs origines** : Séparez par des virgules : `https://fylora-frontend.onrender.com,https://autre-domaine.com`
3. **Redéployez le backend** après modification de `CORS_ORIGIN` pour appliquer les changements
4. **Vérifiez les logs backend** : Les logs afficheront "CORS blocked origin: ..." si une origine est bloquée

### OAuth ne fonctionne pas

1. Vérifiez que les Redirect URIs dans Google/GitHub correspondent exactement aux URLs Render
2. Vérifiez que les variables d'environnement OAuth sont correctes dans Render
3. Attendez quelques minutes après la modification (propagation)

### Frontend ne se connecte pas au backend

1. **Variable d'environnement** : Vérifiez que `VITE_API_URL` est bien configuré dans Render (section "Environment Variables")
   - Format : `https://fylora-backend.onrender.com` (SANS slash final)
   - ⚠️ Après modification, vous devez **redéployer** le frontend pour que la variable soit prise en compte
2. **URL du backend** : Vérifiez que l'URL du backend est correcte et accessible
   - Testez : `https://fylora-backend.onrender.com/health` dans votre navigateur
   - Vous devriez voir : `{"status":"OK","message":"Fylora API is running"}`
3. **Console du navigateur** : Ouvrez les outils de développement (F12) > Console
   - Cherchez les erreurs CORS, 404, ou de connexion
   - Les erreurs indiqueront l'URL exacte utilisée
4. **Build du frontend** : Vérifiez que le build s'est bien terminé sans erreur

---

## 🔗 URLs de Production

Après déploiement, vous obtiendrez :

- **Backend** : `https://fylora-backend.onrender.com`
- **Frontend** : `https://fylora-frontend.onrender.com`

Vous pouvez également configurer des domaines personnalisés dans Render Dashboard > Settings > Custom Domains.

---

## 💡 Astuces

1. **Plan Gratuit** : Render offre un plan gratuit mais les services "s'endorment" après 15 minutes d'inactivité. Le premier démarrage peut prendre 30-60 secondes.

2. **Variables d'Environnement** : Utilisez les variables d'environnement dans Render plutôt que de hardcoder les valeurs.

3. **Logs** : Surveillez les logs régulièrement pour détecter les problèmes.

4. **Health Checks** : Configurez un health check pour que Render redémarre automatiquement en cas de problème.

5. **MongoDB Atlas** : Le plan gratuit M0 est suffisant pour commencer mais a des limitations (512 MB de stockage).

---

## 📚 Ressources

- [Documentation Render](https://render.com/docs)
- [Documentation MongoDB Atlas](https://docs.atlas.mongodb.com/)
- [Google OAuth Setup](https://developers.google.com/identity/protocols/oauth2)
- [GitHub OAuth Setup](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps)

---

**Bon déploiement ! 🚀**

