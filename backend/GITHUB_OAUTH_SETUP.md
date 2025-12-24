# 🐙 Configuration GitHub OAuth - Guide complet

Ce guide vous explique étape par étape comment configurer GitHub OAuth pour Fylora.

---

## 📋 Prérequis

- Un compte GitHub
- Accès à [GitHub Developer Settings](https://github.com/settings/developers)

---

## 🚀 Étapes de configuration

### Étape 1 : Créer une OAuth App sur GitHub

1. Allez sur [GitHub Developer Settings - OAuth Apps](https://github.com/settings/developers)
2. Cliquez sur **"OAuth Apps"** dans le menu de gauche
3. Cliquez sur **"New OAuth App"** (ou "Register a new OAuth application")

### Étape 2 : Remplir le formulaire

Remplissez le formulaire avec **EXACTEMENT** ces valeurs :

#### Application name
```
Fylora
```

#### Homepage URL
```
http://localhost:3001
```

#### Application description (optionnel)
```
Cloud Storage Application
```

#### Authorization callback URL
```
http://localhost:5001/api/auth/github/callback
```

**⚠️ CRITIQUE** :
- Pas de slash final (`/`)
- Pas d'espace avant ou après
- L'URI doit être **EXACTEMENT** : `http://localhost:5001/api/auth/github/callback`
- Copiez-collez cette URI pour éviter les erreurs de frappe

### Étape 3 : Enregistrer l'application

1. Cliquez sur **"Register application"**
2. Vous serez redirigé vers la page de votre application

### Étape 4 : Copier le Client ID

1. Sur la page de votre application, vous verrez le **Client ID**
2. **Copiez-le** (vous en aurez besoin pour le `.env`)

### Étape 5 : Générer un Client Secret

1. Sur la même page, cliquez sur **"Generate a new client secret"**
2. **IMPORTANT** : Copiez immédiatement le **Client Secret**
   - ⚠️ Il ne sera affiché qu'**UNE SEULE FOIS** !
   - Si vous le perdez, vous devrez en générer un nouveau

### Étape 6 : Configurer le fichier .env

Ouvrez votre fichier `.env` dans le dossier `backend` et ajoutez/modifiez :

```env
# GitHub OAuth
GITHUB_CLIENT_ID=votre_client_id_copié
GITHUB_CLIENT_SECRET=votre_client_secret_copié
GITHUB_REDIRECT_URI=http://localhost:5001/api/auth/github/callback
```

**Exemple** :
```env
GITHUB_CLIENT_ID=votre_client_id_github_ici
GITHUB_CLIENT_SECRET=votre_client_secret_github_ici
GITHUB_REDIRECT_URI=http://localhost:5001/api/auth/github/callback
```

### Étape 7 : Vérifier la configuration

Exécutez le script de diagnostic :

```bash
npm run diagnose-oauth
```

Vous devriez voir :
```
📋 GitHub OAuth:
  Client ID: votre_client_id...
  Client Secret: ✅ Présent
  Redirect URI configuré: http://localhost:5001/api/auth/github/callback
  Redirect URI attendu: http://localhost:5001/api/auth/github/callback
  ✅ URI correspond: OUI
```

### Étape 8 : Redémarrer le serveur

**IMPORTANT** : Après avoir modifié le `.env`, redémarrez toujours le serveur :

```bash
# Arrêter le serveur (Ctrl+C)
# Puis relancer
npm start
# ou
npm run dev
```

### Étape 9 : Vérifier les logs au démarrage

Au démarrage, vous devriez voir :

```
🔧 Configuring OAuth strategies...
✅ GitHub OAuth configured
🔧 OAuth strategies configuration completed
```

---

## 🧪 Test de la connexion GitHub

1. Ouvrez votre application frontend
2. Allez sur la page de connexion
3. Cliquez sur **"Se connecter avec GitHub"**
4. Vous devriez être redirigé vers GitHub pour autoriser l'application
5. Cliquez sur **"Authorize Fylora"**
6. Après autorisation, vous devriez être redirigé vers votre application et connecté

---

## 🐛 Erreurs courantes et solutions

### Erreur : "redirect_uri_mismatch"

**Cause** : L'URI de redirection dans GitHub ne correspond pas exactement à celle dans le code.

**Solution** :
1. Allez sur [GitHub Developer Settings - OAuth Apps](https://github.com/settings/developers)
2. Sélectionnez votre application "Fylora"
3. Vérifiez que **"Authorization callback URL"** est **EXACTEMENT** :
   ```
   http://localhost:5001/api/auth/github/callback
   ```
4. Pas de slash final, pas d'espace, exactement cette chaîne
5. Cliquez sur **"Update application"**
6. Redémarrez le serveur

### Erreur : "bad_verification_code"

**Cause** : Le code de vérification est invalide ou expiré.

**Solution** :
1. Redémarrez le serveur backend
2. Réessayez la connexion GitHub
3. Si le problème persiste, vérifiez que le Client Secret est correct dans le `.env`

### Erreur : "incorrect_client_credentials"

**Cause** : Le Client ID ou Client Secret est incorrect.

**Solution** :
1. Vérifiez que les identifiants dans votre `.env` sont corrects
2. Vérifiez qu'il n'y a pas d'espace avant ou après les valeurs
3. Si vous avez perdu le Client Secret, générez-en un nouveau dans GitHub Settings
4. Mettez à jour le `.env` avec les nouveaux identifiants
5. Redémarrez le serveur

### Erreur : "No email found"

**Cause** : GitHub ne fournit pas l'email dans le profil par défaut.

**Solution** :
- Le code gère automatiquement ce cas en utilisant l'API GitHub pour récupérer l'email
- Si l'email n'est toujours pas disponible, un email de fallback sera créé : `username@github.noreply`

---

## ✅ Checklist de vérification

Avant de tester, vérifiez que :

- [ ] L'OAuth App est créée sur GitHub
- [ ] Le **Authorization callback URL** est exactement : `http://localhost:5001/api/auth/github/callback`
- [ ] Le **Homepage URL** est : `http://localhost:3001`
- [ ] Le Client ID est copié dans le `.env`
- [ ] Le Client Secret est copié dans le `.env`
- [ ] Le fichier `.env` contient `GITHUB_REDIRECT_URI=http://localhost:5001/api/auth/github/callback`
- [ ] Le serveur a été redémarré après les modifications
- [ ] Les logs au démarrage montrent `✅ GitHub OAuth configured`

---

## 📝 Notes importantes

1. **Sécurité** : Ne partagez JAMAIS votre Client Secret publiquement
2. **URI exacte** : L'URI de redirection doit être identique dans GitHub ET dans le code
3. **Redémarrage** : Toujours redémarrer le serveur après avoir modifié le `.env`
4. **Client Secret** : Si vous le perdez, générez-en un nouveau dans GitHub Settings
5. **Production** : Pour la production, changez l'URI vers votre domaine de production

---

## 🔗 Liens utiles

- [GitHub Developer Settings - OAuth Apps](https://github.com/settings/developers)
- [Documentation GitHub OAuth](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps)
- [GitHub API - User Emails](https://docs.github.com/en/rest/users/emails)

---

## 🆘 Besoin d'aide ?

Si vous rencontrez des problèmes :

1. Vérifiez les logs du serveur pour les erreurs détaillées
2. Exécutez `npm run diagnose-oauth` pour vérifier la configuration
3. Consultez `backend/OAUTH_URIS.md` pour les URIs exactes
4. Vérifiez que l'URI dans GitHub correspond exactement à celle dans le code


