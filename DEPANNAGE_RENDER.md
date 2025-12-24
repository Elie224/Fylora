# 🔧 Guide de Dépannage - Déploiement Render

Ce guide vous aide à résoudre les erreurs courantes lors du déploiement sur Render.

## ❌ Erreur : "Port already in use" ou "EADDRINUSE"

### Cause
Vous avez défini manuellement `PORT=5001` dans les variables d'environnement, mais Render définit automatiquement cette variable.

### Solution
1. Allez dans Render Dashboard > Votre service backend > "Environment"
2. **Supprimez** la variable `PORT` si elle existe
3. Render définit automatiquement `PORT` - vous n'avez pas besoin de la définir
4. Redéployez le service

---

## ❌ Erreur : "MongoDB connection timeout" ou "MongoDB connection failed"

### Causes possibles
1. URI MongoDB incorrecte
2. Mot de passe incorrect dans l'URI
3. IP non autorisée dans MongoDB Atlas
4. Nom de la base de données incorrect

### Solution
1. **Vérifiez l'URI MongoDB** :
   ```env
   MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/Fylora?retryWrites=true&w=majority
   ```
   - Remplacez `username` par votre nom d'utilisateur MongoDB
   - Remplacez `password` par votre mot de passe (attention aux caractères spéciaux - encodez-les si nécessaire)
   - Remplacez `cluster0.xxxxx` par votre cluster réel
   - Vérifiez que le nom de la base (`Fylora`) est correct

2. **Autorisez toutes les IPs dans MongoDB Atlas** :
   - Allez sur MongoDB Atlas > Network Access
   - Cliquez sur "Add IP Address"
   - Sélectionnez "Allow Access from Anywhere" (`0.0.0.0/0`)
   - Cliquez sur "Confirm"

3. **Vérifiez les logs Render** pour voir l'erreur exacte

---

## ❌ Erreur CORS : "Access to fetch at '...' from origin '...' has been blocked by CORS policy"

### Cause
L'URL du frontend n'est pas autorisée dans `CORS_ORIGIN` du backend.

### Solution
1. **Vérifiez `CORS_ORIGIN` dans le backend** :
   - Allez dans Render Dashboard > Backend service > Environment
   - Vérifiez que `CORS_ORIGIN` contient l'URL exacte du frontend
   - Format : `https://fylora-frontend.onrender.com` (SANS slash final)
   - Si plusieurs origines : `https://site1.com,https://site2.com`

2. **Redéployez le backend** après modification de `CORS_ORIGIN`

3. **Vérifiez les logs backend** : Ils afficheront "CORS blocked origin: ..." si une origine est bloquée

---

## ❌ Erreur : "Cannot GET /" ou "404 Not Found"

### Causes possibles
1. Le frontend essaie de se connecter à une mauvaise URL
2. La variable `VITE_API_URL` n'est pas définie ou incorrecte
3. Le build du frontend n'a pas inclus la variable d'environnement

### Solution
1. **Vérifiez `VITE_API_URL` dans le frontend** :
   - Allez dans Render Dashboard > Frontend service > Environment
   - Vérifiez que `VITE_API_URL=https://fylora-backend.onrender.com` (SANS slash final)
   - ⚠️ **Important** : Après modification, vous devez **redéployer** le frontend

2. **Vérifiez la console du navigateur** (F12 > Console) :
   - Cherchez les erreurs de connexion
   - Vérifiez l'URL utilisée dans les requêtes

3. **Testez le backend directement** :
   - Ouvrez `https://fylora-backend.onrender.com/health` dans votre navigateur
   - Vous devriez voir : `{"status":"OK","message":"Fylora API is running"}`

---

## ❌ Erreur : "Build failed" ou "npm install failed"

### Causes possibles
1. Problème de dépendances
2. Version de Node.js incompatible
3. Problème de mémoire pendant le build

### Solution
1. **Vérifiez la version de Node.js** :
   - Dans Render Dashboard > Settings > Build & Deploy
   - Vérifiez que la version Node.js est compatible (18.x ou 20.x recommandé)
   - Vous pouvez spécifier la version dans `package.json` :
     ```json
     "engines": {
       "node": ">=18.0.0"
     }
     ```

2. **Vérifiez les logs de build** :
   - Allez dans Render Dashboard > Logs
   - Cherchez les erreurs spécifiques de dépendances

3. **Vérifiez `package.json`** :
   - Assurez-vous que toutes les dépendances sont correctement listées
   - Vérifiez qu'il n'y a pas de dépendances optionnelles manquantes

---

## ❌ Erreur : "OAuth callback failed" ou "OAuth redirect URI mismatch"

### Cause
Les Redirect URIs dans Google/GitHub ne correspondent pas aux URLs Render.

### Solution
1. **Google Cloud Console** :
   - Allez sur https://console.cloud.google.com/apis/credentials
   - Modifiez votre OAuth Client
   - Dans "Authorized redirect URIs", ajoutez :
     ```
     https://fylora-backend.onrender.com/api/auth/google/callback
     ```
   - Dans "Authorized JavaScript origins", ajoutez :
     ```
     https://fylora-backend.onrender.com
     ```

2. **GitHub Settings** :
   - Allez sur https://github.com/settings/developers
   - Modifiez votre OAuth App
   - Mettez à jour "Authorization callback URL" :
     ```
     https://fylora-backend.onrender.com/api/auth/github/callback
     ```
   - Mettez à jour "Homepage URL" :
     ```
     https://fylora-frontend.onrender.com
     ```

3. **Variables d'environnement dans Render** :
   - Vérifiez que `GOOGLE_REDIRECT_URI` et `GITHUB_REDIRECT_URI` correspondent aux URLs ci-dessus

4. **Attendez quelques minutes** après modification (propagation DNS)

---

## ❌ Erreur : Le service se met en "sleep" après quelques minutes

### Cause
C'est normal sur le plan gratuit de Render. Les services s'endorment après 15 minutes d'inactivité.

### Solution
1. **C'est normal** - Le premier démarrage après le sleep peut prendre 30-60 secondes
2. **Pour éviter le sleep** : Passez au plan payant ou utilisez un service de "ping" externe
3. **Alternative** : Configurez un cron job qui ping votre service toutes les 10 minutes

---

## ❌ Erreur : "Health check failed"

### Cause
Le health check endpoint n'est pas accessible ou retourne une erreur.

### Solution
1. **Vérifiez le health check path** :
   - Dans Render Dashboard > Settings > Health Check Path
   - Utilisez `/health` (endpoint simple) ou `/api/health` (endpoint détaillé)

2. **Testez manuellement** :
   - Ouvrez `https://fylora-backend.onrender.com/health` dans votre navigateur
   - Vous devriez voir une réponse JSON

3. **Vérifiez les logs** pour voir pourquoi le health check échoue

---

## 📋 Checklist de Vérification

Avant de demander de l'aide, vérifiez :

- [ ] **Backend** :
  - [ ] `MONGODB_URI` est correcte (avec mot de passe)
  - [ ] `JWT_SECRET` et `JWT_REFRESH_SECRET` sont définis
  - [ ] `NODE_ENV=production`
  - [ ] **`PORT` n'est PAS défini** (Render le gère)
  - [ ] `CORS_ORIGIN` contient l'URL du frontend (sans slash final)
  - [ ] MongoDB Atlas autorise les connexions depuis `0.0.0.0/0`

- [ ] **Frontend** :
  - [ ] `VITE_API_URL` est défini et correct (sans slash final)
  - [ ] Le build s'est terminé sans erreur
  - [ ] Le frontend a été redéployé après modification de `VITE_API_URL`

- [ ] **OAuth** :
  - [ ] Redirect URIs dans Google/GitHub correspondent aux URLs Render
  - [ ] Variables d'environnement OAuth sont correctes dans Render

- [ ] **Logs** :
  - [ ] Vérifié les logs backend dans Render Dashboard
  - [ ] Vérifié les logs frontend dans Render Dashboard
  - [ ] Vérifié la console du navigateur (F12)

---

## 🆘 Obtenir de l'Aide

Si le problème persiste :

1. **Copiez les logs d'erreur** depuis Render Dashboard > Logs
2. **Copiez l'erreur exacte** de la console du navigateur (F12 > Console)
3. **Vérifiez** que toutes les variables d'environnement sont correctement configurées
4. **Testez** les endpoints directement dans votre navigateur :
   - `https://fylora-backend.onrender.com/health`
   - `https://fylora-backend.onrender.com/`

---

**Bon dépannage ! 🔧**




