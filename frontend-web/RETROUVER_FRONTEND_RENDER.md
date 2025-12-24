# 🔍 Comment Retrouver le Frontend sur Render

## 📋 Méthode 1 : Via le Dashboard Render

### Étape 1 : Accéder au Dashboard
1. Allez sur [Render Dashboard](https://dashboard.render.com)
2. Connectez-vous avec votre compte

### Étape 2 : Trouver votre service
1. Dans la page d'accueil du dashboard, vous verrez la liste de **tous vos services**
2. Cherchez le service avec :
   - **Type** : `Static Site` ou `Web Service`
   - **Name** : `fylor-frontend` (ou le nom que vous avez donné)
   - **Status** : `Live` (si déployé) ou `Building` (si en cours de déploiement)

### Étape 3 : Accéder au service
1. Cliquez sur le nom du service (`fylor-frontend`)
2. Vous verrez :
   - L'URL du site : `https://fylor-frontend.onrender.com`
   - Les logs de déploiement
   - Les variables d'environnement
   - L'historique des déploiements

## 🔗 Méthode 2 : URL Directe

Si vous connaissez le nom exact de votre service :
- URL du dashboard : `https://dashboard.render.com/static/[SERVICE_ID]`
- Mais il est plus simple d'utiliser le dashboard principal

## 📱 Méthode 3 : Via la Recherche

1. Dans le dashboard Render, utilisez la barre de recherche en haut
2. Tapez : `fylor` ou `frontend`
3. Les services correspondants apparaîtront

## 🎯 Informations à Vérifier

Une fois que vous avez trouvé votre service frontend, vérifiez :

### 1. Variables d'environnement
- Allez dans l'onglet **"Environment"**
- Vérifiez que `VITE_API_URL` est défini avec : `https://fylora-1.onrender.com`

### 2. URL du site
- L'URL est affichée en haut de la page du service
- Format : `https://fylor-frontend.onrender.com`
- Cliquez sur l'URL pour ouvrir le site dans un nouvel onglet

### 3. Statut du déploiement
- **Live** : Le site est déployé et accessible
- **Building** : Déploiement en cours
- **Failed** : Erreur de déploiement (consultez les logs)

## 🔧 Si vous ne trouvez pas le service

### Option 1 : Vérifier tous les services
1. Dans le dashboard, cliquez sur **"Services"** dans le menu de gauche
2. Vous verrez la liste complète de tous vos services
3. Filtrez par type : **Static Site**

### Option 2 : Créer un nouveau service
Si le service n'existe pas encore :
1. Cliquez sur **"New +"** → **"Static Site"**
2. Connectez votre dépôt GitHub `Elie224/Fylora`
3. Configurez :
   - **Name** : `fylor-frontend`
   - **Root Directory** : `frontend-web`
   - **Build Command** : `npm install && npm run build`
   - **Publish Directory** : `dist`
   - **Environment Variable** :
     - Key : `VITE_API_URL`
     - Value : `https://fylora-1.onrender.com`

## 📝 Liste de vos Services Render

Vous devriez avoir :
1. **Backend** : `fylora-1` ou `fylora-backend` (type: Web Service)
2. **Frontend** : `fylor-frontend` (type: Static Site)
3. **Redis** : `fylora-redis` ou similaire (type: Redis)

## 🎯 Accès Rapide

Une fois que vous avez trouvé votre service :
- **URL du site** : Cliquez sur l'URL affichée en haut
- **Logs** : Onglet "Logs" pour voir les erreurs
- **Settings** : Pour modifier la configuration
- **Environment** : Pour ajouter/modifier les variables

## ✅ Vérification que le Frontend Fonctionne

1. Ouvrez l'URL du frontend : `https://fylor-frontend.onrender.com`
2. Vérifiez que la page se charge
3. Ouvrez la console du navigateur (F12)
4. Vérifiez qu'il n'y a pas d'erreurs CORS ou de connexion API

