# Configuration OAuth2 pour Fylora

Ce guide détaillé explique comment configurer l'authentification OAuth2 pour Google et GitHub.

## 📋 Variables d'environnement requises

Ajoutez ces variables dans votre fichier `.env` du backend :

```env
# OAuth Google
GOOGLE_CLIENT_ID=votre_client_id_google
GOOGLE_CLIENT_SECRET=votre_client_secret_google
GOOGLE_REDIRECT_URI=http://localhost:5001/api/auth/google/callback

# OAuth GitHub
GITHUB_CLIENT_ID=votre_client_id_github
GITHUB_CLIENT_SECRET=votre_client_secret_github
GITHUB_REDIRECT_URI=http://localhost:5001/api/auth/github/callback

# Session secret (pour les sessions OAuth)
SESSION_SECRET=votre_secret_session_securise

# URL du frontend (pour les redirections après OAuth)
FRONTEND_URL=http://localhost:3001
```

---

## 🔵 Configuration Google OAuth2

### Étape 1 : Créer un projet dans Google Cloud Console

1. Allez sur [Google Cloud Console](https://console.cloud.google.com/)
2. Connectez-vous avec votre compte Google
3. Cliquez sur le sélecteur de projet en haut à gauche
4. Cliquez sur **"Nouveau projet"** (ou "New Project")
5. Donnez un nom au projet (ex: "Fylora OAuth")
6. Cliquez sur **"Créer"** (ou "Create")

### Étape 2 : Configurer l'écran de consentement OAuth

1. Dans le menu latéral, allez dans **"APIs & Services"** > **"OAuth consent screen"**
2. Choisissez **"External"** (pour les tests) ou **"Internal"** (si vous avez Google Workspace)
3. Cliquez sur **"Create"**
4. Remplissez les informations :
   - **App name** : Fylora
   - **User support email** : Votre email
   - **Developer contact information** : Votre email
5. Cliquez sur **"Save and Continue"**
6. Dans **"Scopes"**, cliquez sur **"Add or Remove Scopes"**
   - Ajoutez : `email`, `profile`, `openid`
7. Cliquez sur **"Save and Continue"**
8. Dans **"Test users"** (si en mode External), ajoutez votre email de test
9. Cliquez sur **"Save and Continue"** puis **"Back to Dashboard"**

### Étape 3 : Créer les identifiants OAuth

1. Allez dans **"APIs & Services"** > **"Credentials"**
2. Cliquez sur **"+ CREATE CREDENTIALS"** > **"OAuth client ID"**
3. Si c'est la première fois, choisissez **"Web application"**
4. Remplissez :
   - **Name** : Fylora Web Client
   - **Authorized JavaScript origins** :
     ```
     http://localhost:5001
     http://localhost:3001
     ```
   - **Authorized redirect URIs** :
     ```
     http://localhost:5001/api/auth/google/callback
     ```
5. Cliquez sur **"Create"**
6. **IMPORTANT** : Copiez immédiatement le **Client ID** et le **Client Secret**
   - ⚠️ Le Client Secret ne sera affiché qu'une seule fois !

### Étape 4 : Configurer le fichier .env

Ajoutez dans votre `.env` :

```env
GOOGLE_CLIENT_ID=votre_client_id_copié
GOOGLE_CLIENT_SECRET=votre_client_secret_copié
GOOGLE_REDIRECT_URI=http://localhost:5001/api/auth/google/callback
```

### ⚠️ Erreurs courantes Google

- **"deleted_client"** : Le client OAuth a été supprimé → Créez un nouveau client
- **"redirect_uri_mismatch"** : L'URI de redirection ne correspond pas → Vérifiez que l'URI exacte est dans "Authorized redirect URIs"
- **"invalid_client"** : Client ID ou Secret incorrect → Vérifiez vos variables d'environnement

---

## 🐙 Configuration GitHub OAuth2

### Étape 1 : Créer une OAuth App sur GitHub

1. Allez sur [GitHub Developer Settings](https://github.com/settings/developers)
2. Cliquez sur **"OAuth Apps"** dans le menu de gauche
3. Cliquez sur **"New OAuth App"** (ou "Register a new OAuth application")
4. Remplissez le formulaire :
   - **Application name** : Fylora
   - **Homepage URL** : `http://localhost:3001`
   - **Application description** : Cloud Storage Application (optionnel)
   - **Authorization callback URL** : 
     ```
     http://localhost:5001/api/auth/github/callback
     ```
   - ⚠️ **IMPORTANT** : L'URI doit être EXACTEMENT celle-ci, sans slash final
5. Cliquez sur **"Register application"**

### Étape 2 : Générer un Client Secret

1. Après la création, vous verrez la page de votre application
2. Le **Client ID** est déjà visible
3. Cliquez sur **"Generate a new client secret"**
4. **IMPORTANT** : Copiez immédiatement le **Client Secret**
   - ⚠️ Il ne sera affiché qu'une seule fois !

### Étape 3 : Configurer le fichier .env

Ajoutez dans votre `.env` :

```env
GITHUB_CLIENT_ID=votre_client_id_copié
GITHUB_CLIENT_SECRET=votre_client_secret_copié
GITHUB_REDIRECT_URI=http://localhost:5001/api/auth/github/callback
```

### ⚠️ Erreurs courantes GitHub

- **"redirect_uri_mismatch"** : L'URI de redirection ne correspond pas exactement
  - Vérifiez qu'il n'y a pas d'espace, de slash final, ou de caractères spéciaux
  - L'URI doit être EXACTEMENT : `http://localhost:5001/api/auth/github/callback`
- **"bad_verification_code"** : Le code de vérification est invalide → Redémarrez le serveur
- **"incorrect_client_credentials"** : Client ID ou Secret incorrect → Vérifiez vos variables d'environnement

---

## 🚀 Vérification de la configuration

### 1. Vérifier les variables d'environnement

Assurez-vous que votre fichier `.env` contient toutes les variables nécessaires :

```bash
# Vérifier que les variables sont chargées
node -e "require('dotenv').config(); console.log('Google:', process.env.GOOGLE_CLIENT_ID ? 'OK' : 'MANQUANT'); console.log('GitHub:', process.env.GITHUB_CLIENT_ID ? 'OK' : 'MANQUANT');"
```

### 2. Redémarrer le serveur

Après avoir modifié le `.env`, **redémarrez toujours le serveur** :

```bash
# Arrêter le serveur (Ctrl+C)
# Puis relancer
npm start
# ou
npm run dev
```

### 3. Vérifier les logs au démarrage

Au démarrage du serveur, vous devriez voir :

```
🔧 Configuring OAuth strategies...
📋 GitHub config check: { clientId: 'present', clientSecret: 'present', redirectUri: '...' }
✅ Google OAuth configured
✅ GitHub OAuth configured
🔧 OAuth strategies configuration completed
```

Si vous voyez des avertissements, vérifiez vos variables d'environnement.

---

## 🔗 Routes disponibles

- `GET /api/auth/google` - Initie l'authentification Google
- `GET /api/auth/google/callback` - Callback Google (géré automatiquement)
- `GET /api/auth/github` - Initie l'authentification GitHub
- `GET /api/auth/github/callback` - Callback GitHub (géré automatiquement)

---

## 📝 Fonctionnement

1. L'utilisateur clique sur "Se connecter avec Google" ou "Se connecter avec GitHub"
2. Il est redirigé vers le fournisseur OAuth pour autoriser l'application
3. Après autorisation, le fournisseur redirige vers `/api/auth/{provider}/callback`
4. Le backend génère des tokens JWT et redirige vers le frontend avec les tokens
5. Le frontend stocke les tokens et connecte l'utilisateur

---

## 🔒 Notes importantes

- **Sécurité** : Les secrets OAuth ne doivent **JAMAIS** être commités dans Git
- **Comptes OAuth** : Les comptes OAuth n'ont pas de mot de passe (`password_hash` est `null`)
- **Fusion de comptes** : Si un utilisateur existe déjà avec le même email, les infos OAuth sont ajoutées au compte existant
- **Dossier racine** : Un dossier racine "Root" est automatiquement créé pour chaque nouvel utilisateur OAuth
- **Production** : Pour la production, changez les URIs de redirection vers votre domaine de production

---

## 🐛 Dépannage

### Problème : "OAuth client was deleted" (Google)

**Solution** :
1. Allez dans Google Cloud Console > Credentials
2. Vérifiez si votre client OAuth existe
3. S'il n'existe pas, créez-en un nouveau
4. Mettez à jour votre `.env` avec les nouveaux identifiants

### Problème : "redirect_uri is not associated" (GitHub)

**Solution** :
1. Allez sur GitHub > Settings > Developer settings > OAuth Apps
2. Sélectionnez votre application
3. Vérifiez que "Authorization callback URL" est EXACTEMENT :
   ```
   http://localhost:5001/api/auth/github/callback
   ```
4. Pas de slash final, pas d'espace, exactement cette chaîne
5. Cliquez sur "Update application"
6. Redémarrez le serveur

### Problème : Les stratégies ne se chargent pas

**Solution** :
1. Vérifiez que les packages sont installés :
   ```bash
   npm install passport passport-google-oauth20 passport-github2
   ```
2. Vérifiez que les variables d'environnement sont chargées
3. Redémarrez le serveur

### Problème : Erreur 401 ou 403

**Solution** :
1. Vérifiez que le Client ID et Client Secret sont corrects
2. Vérifiez que l'écran de consentement OAuth est configuré (Google)
3. Vérifiez que vous avez ajouté votre email dans "Test users" (Google, mode External)
4. Attendez quelques minutes après la création/modification (propagation)

---

## 📚 Ressources

- [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)
- [GitHub OAuth Documentation](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps)
- [Passport.js Documentation](http://www.passportjs.org/)
