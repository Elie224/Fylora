# 🚀 Guide de Déploiement Fylora sur Render

Ce guide complet vous explique comment déployer l'application Fylora sur Render.

## 📋 Prérequis

1. **Compte Render** (gratuit) : https://render.com
2. **Compte MongoDB Atlas** (gratuit) : https://www.mongodb.com/cloud/atlas
3. **Compte Cloudinary** (optionnel, pour le stockage de fichiers) : https://cloudinary.com
4. **Identifiants OAuth** : Google et GitHub configurés

---

## 🔧 Configuration MongoDB Atlas

### 1. Créer un cluster MongoDB Atlas

1. Allez sur https://www.mongodb.com/cloud/atlas
2. Créez un compte gratuit
3. Créez un nouveau cluster (gratuit M0)
4. Configurez un utilisateur de base de données :
   - Username : `fylora_admin`
   - Password : (générez un mot de passe fort)
5. Configurez le réseau :
   - Ajoutez `0.0.0.0/0` pour autoriser toutes les IPs
6. Récupérez votre connection string :
   - Cliquez sur "Connect" > "Connect your application"
   - Copiez la chaîne de connexion

---

## 🚀 Déploiement avec render.yaml (Recommandé)

### Option 1 : Déploiement Automatique via Blueprint

1. Allez sur https://dashboard.render.com
2. Cliquez sur "New +" > "Blueprint"
3. Connectez votre repository GitHub `Elie224/Fylora`
4. Render détectera automatiquement le fichier `render.yaml`
5. Cliquez sur "Apply" pour créer les services

### Option 2 : Déploiement Manuel

#### Backend

1. Allez sur https://dashboard.render.com
2. Cliquez sur "New +" > "Web Service"
3. Connectez votre repository GitHub
4. Configurez :
   - **Name** : `fylora-backend`
   - **Region** : `Frankfurt` (ou votre région)
   - **Branch** : `main`
   - **Root Directory** : `backend`
   - **Runtime** : `Node`
   - **Build Command** : `npm install`
   - **Start Command** : `npm start`
   - **Health Check Path** : `/health`

#### Frontend

1. Cliquez sur "New +" > "Static Site"
2. Connectez votre repository GitHub
3. Configurez :
   - **Name** : `fylora-frontend`
   - **Region** : `Frankfurt`
   - **Branch** : `main`
   - **Root Directory** : `frontend-web`
   - **Build Command** : `npm install && npm run build`
   - **Publish Directory** : `dist`

---

## 🔐 Variables d'Environnement

### Backend (fylora-backend)

Ajoutez ces variables dans Render Dashboard → Environment Variables :

#### Base de données
```
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/Fylora?retryWrites=true&w=majority
```

#### JWT
```
JWT_SECRET=votre_secret_jwt_tres_long_et_securise
JWT_REFRESH_SECRET=votre_refresh_secret_tres_long_et_securise
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

#### OAuth Google
```
GOOGLE_CLIENT_ID=votre_google_client_id
GOOGLE_CLIENT_SECRET=votre_google_client_secret
GOOGLE_REDIRECT_URI=https://fylora-1.onrender.com/api/auth/google/callback
```

#### OAuth GitHub
```
GITHUB_CLIENT_ID=votre_github_client_id
GITHUB_CLIENT_SECRET=votre_github_client_secret
GITHUB_REDIRECT_URI=https://fylora-1.onrender.com/api/auth/github/callback
```

#### CORS
```
CORS_ORIGIN=https://votre-frontend.onrender.com,https://fylora-frontend.onrender.com
```

#### Redis (optionnel)
```
REDIS_URL=redis://votre-redis-url:6379
```

#### Cloudinary (optionnel, pour stockage fichiers)
```
CLOUDINARY_CLOUD_NAME=votre_cloud_name
CLOUDINARY_API_KEY=votre_api_key
CLOUDINARY_API_SECRET=votre_api_secret
```

#### Chiffrement (optionnel)
```
ENCRYPTION_KEY=votre_cle_hexadecimale_64_caracteres
```

#### Stripe (optionnel, pour paiements)
```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

#### PayPal (optionnel, pour paiements)
```
PAYPAL_CLIENT_ID=votre_paypal_client_id
PAYPAL_CLIENT_SECRET=votre_paypal_client_secret
PAYPAL_MODE=sandbox
```

### Frontend (fylora-frontend)

```
VITE_API_URL=https://fylora-1.onrender.com
```

---

## ✅ Vérification du Déploiement

### Backend

1. Vérifiez le health check : `https://fylora-1.onrender.com/health`
2. Devrait retourner : `{"status":"OK","message":"Fylora API is running"}`

### Frontend

1. Ouvrez : `https://fylora-frontend.onrender.com`
2. Vérifiez que l'application se charge correctement
3. Testez la connexion au backend

---

## 🔄 Mise à Jour

Les mises à jour sont automatiques via Git :

1. Poussez vos modifications sur GitHub (branche `main`)
2. Render détecte automatiquement les changements
3. Le déploiement se lance automatiquement

---

## 📝 Notes Importantes

- **Port** : Ne définissez PAS la variable `PORT`, Render le définit automatiquement
- **Docker** : Les Dockerfiles sont ignorés (désactivés dans `render.yaml`)
- **Health Check** : Le backend doit répondre sur `/health` pour éviter le spin-down
- **Free Tier** : Les services gratuits se mettent en veille après 15 minutes d'inactivité

---

## 🆘 Dépannage

### Backend ne démarre pas

1. Vérifiez les logs dans Render Dashboard
2. Vérifiez que toutes les variables d'environnement sont définies
3. Vérifiez la connexion MongoDB

### Frontend ne se connecte pas au backend

1. Vérifiez que `VITE_API_URL` pointe vers le bon backend
2. Vérifiez les CORS dans le backend
3. Vérifiez les logs du frontend

### Erreurs de build

1. Vérifiez que `node_modules` n'est pas dans `.gitignore`
2. Vérifiez les versions de Node.js (Render utilise Node 18+ par défaut)

---

## 📚 Documentation Complémentaire

- [Documentation Render](https://render.com/docs)
- [Guide MongoDB Atlas](GUIDE_MONGODB_REPLICA_SET.md)
- [Guide Cloudinary](GUIDE_CLOUDINARY_SIMPLE.md)
- [Guide Stripe](GUIDE_CONFIGURATION_STRIPE_PAYPAL.md)

