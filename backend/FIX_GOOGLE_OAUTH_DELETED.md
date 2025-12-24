# 🔧 Correction : Google OAuth Client Supprimé

## ❌ Problème

Erreur : **"The OAuth client was deleted" (Erreur 401 : deleted_client)**

Cela signifie que le client OAuth Google utilisé dans votre application a été supprimé dans Google Cloud Console.

## ✅ Solution : Créer un nouveau client OAuth Google

### Étape 1 : Accéder à Google Cloud Console

1. Allez sur [Google Cloud Console](https://console.cloud.google.com/)
2. Connectez-vous avec votre compte Google
3. Sélectionnez votre projet (ou créez-en un nouveau)

### Étape 2 : Configurer l'écran de consentement OAuth

1. Dans le menu latéral, allez dans **"APIs & Services"** > **"OAuth consent screen"**
2. Si ce n'est pas déjà fait, configurez l'écran de consentement :
   - Choisissez **"External"** (pour les tests) ou **"Internal"** (si vous avez Google Workspace)
   - Remplissez les informations requises :
     - **App name** : Fylora
     - **User support email** : Votre email
     - **Developer contact information** : Votre email
   - Cliquez sur **"Save and Continue"**
   - Dans **"Scopes"**, ajoutez : `email`, `profile`, `openid`
   - Cliquez sur **"Save and Continue"** jusqu'à la fin

### Étape 3 : Créer un nouveau client OAuth

1. Allez dans **"APIs & Services"** > **"Credentials"**
2. Cliquez sur **"+ CREATE CREDENTIALS"** > **"OAuth client ID"**
3. Si c'est la première fois, choisissez **"Web application"** comme type d'application
4. Remplissez le formulaire :
   - **Name** : `Fylora Web Client` (ou un nom de votre choix)
   - **Authorized JavaScript origins** :
     ```
     http://localhost:5001
     http://localhost:3001
     ```
   - **Authorized redirect URIs** :
     ```
     http://localhost:5001/api/auth/google/callback
     ```
   - ⚠️ **IMPORTANT** : L'URI doit être EXACTEMENT celle-ci, sans slash final
5. Cliquez sur **"Create"**
6. **COPIEZ IMMÉDIATEMENT** :
   - Le **Client ID** (ex: `123456789-abcdefghijklmnop.apps.googleusercontent.com`)
   - Le **Client Secret** (ex: `GOCSPX-abcdefghijklmnopqrstuvwxyz`)
   - ⚠️ **ATTENTION** : Le Client Secret ne sera affiché qu'UNE SEULE FOIS !

### Étape 4 : Mettre à jour le fichier .env

Ouvrez votre fichier `.env` dans le dossier `backend` et mettez à jour :

```env
# Remplacez par vos nouveaux identifiants
GOOGLE_CLIENT_ID=votre_nouveau_client_id
GOOGLE_CLIENT_SECRET=votre_nouveau_client_secret
GOOGLE_REDIRECT_URI=http://localhost:5001/api/auth/google/callback
```

### Étape 5 : Vérifier la configuration

Exécutez le script de vérification :

```bash
npm run check-oauth
```

Vous devriez voir :
```
✅ Google OAuth configured
```

### Étape 6 : Redémarrer le serveur

**IMPORTANT** : Après avoir modifié le `.env`, redémarrez le serveur :

```bash
# Arrêter le serveur (Ctrl+C)
# Puis relancer
npm start
# ou
npm run dev
```

### Étape 7 : Vérifier les logs au démarrage

Au démarrage, vous devriez voir :

```
🔧 Configuring OAuth strategies...
✅ Google OAuth configured
🔧 OAuth strategies configuration completed
```

## 🧪 Test

1. Ouvrez votre application frontend
2. Allez sur la page de connexion
3. Cliquez sur **"Se connecter avec Google"**
4. Vous devriez être redirigé vers Google pour autoriser l'application
5. Après autorisation, vous devriez être connecté

## ⚠️ Points importants

1. **Ne supprimez PAS** le client OAuth dans Google Cloud Console une fois créé
2. **Gardez le Client Secret sécurisé** - ne le partagez jamais publiquement
3. **L'URI de redirection** doit être EXACTEMENT : `http://localhost:5001/api/auth/google/callback`
4. **Redémarrez toujours le serveur** après avoir modifié le `.env`

## 🐛 Si ça ne fonctionne toujours pas

1. Vérifiez que les identifiants sont corrects dans le `.env`
2. Vérifiez que l'URI de redirection est exactement la même dans Google Cloud Console
3. Vérifiez les logs du serveur pour d'autres erreurs
4. Attendez quelques minutes après la création (propagation)

## 📚 Documentation

Pour plus de détails, consultez : `backend/OAUTH_SETUP.md`


