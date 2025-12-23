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
# MongoDB
MONGODB_URI=mongodb+srv://fylora_admin:<VOTRE_MOT_DE_PASSE>@cluster0.xxxxx.mongodb.net/Fylora?retryWrites=true&w=majority

# JWT
JWT_SECRET=<GÉNÉREZ_UN_SECRET_ALÉATOIRE_FORT>
JWT_REFRESH_SECRET=<GÉNÉREZ_UN_AUTRE_SECRET_ALÉATOIRE_FORT>

# Server
NODE_ENV=production
PORT=5001

# CORS - Remplacez par votre URL Render frontend
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
- Remplacez `<VOTRE_MOT_DE_PASSE>` dans MONGODB_URI par le mot de passe MongoDB
- Remplacez `cluster0.xxxxx` par votre vrai cluster MongoDB
- Générez des secrets JWT forts (utilisez `openssl rand -hex 32` ou un générateur en ligne)
- Les URLs Render seront au format `https://fylora-backend.onrender.com` (vous obtiendrez l'URL exacte après le déploiement)

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
      - key: PORT
        value: 5001
    healthCheckPath: /api/health
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

1. Allez sur `https://fylora-backend.onrender.com/api/health`
2. Vous devriez voir une réponse JSON avec le statut

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

1. Vérifiez les logs dans Render Dashboard
2. Vérifiez que toutes les variables d'environnement sont définies
3. Vérifiez que `MONGODB_URI` est correct (avec le mot de passe)
4. Vérifiez que le port est bien `5001` ou laissez Render gérer automatiquement

### Erreur CORS

1. Vérifiez que `CORS_ORIGIN` dans le backend correspond exactement à l'URL du frontend
2. Vérifiez qu'il n'y a pas de slash final dans l'URL

### OAuth ne fonctionne pas

1. Vérifiez que les Redirect URIs dans Google/GitHub correspondent exactement aux URLs Render
2. Vérifiez que les variables d'environnement OAuth sont correctes dans Render
3. Attendez quelques minutes après la modification (propagation)

### Frontend ne se connecte pas au backend

1. Vérifiez que `VITE_API_URL` est bien configuré dans Render
2. Vérifiez que l'URL du backend est correcte
3. Vérifiez la console du navigateur pour les erreurs CORS

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

