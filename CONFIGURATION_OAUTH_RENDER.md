# 🔐 Configuration OAuth sur Render

Ce guide vous explique comment configurer Google OAuth et GitHub OAuth sur Render pour que l'authentification fonctionne.

---

## 📋 Prérequis

- Un compte Google Cloud Console
- Un compte GitHub
- Accès à votre projet Render

---

## 🔵 Configuration Google OAuth

### Étape 1 : Créer un projet Google Cloud

1. Allez sur [Google Cloud Console](https://console.cloud.google.com/)
2. Créez un nouveau projet ou sélectionnez un projet existant
3. Notez le **nom du projet** (vous en aurez besoin)

### Étape 2 : Activer l'API Google+

1. Dans le menu latéral, allez dans **APIs & Services** > **Library**
2. Recherchez "Google+ API" ou "Google Identity"
3. Cliquez sur **Enable**

### Étape 3 : Créer les identifiants OAuth

1. Allez dans **APIs & Services** > **Credentials**
2. Cliquez sur **+ CREATE CREDENTIALS** > **OAuth client ID**
3. Si c'est la première fois, configurez l'écran de consentement OAuth :
   - **User Type** : External (ou Internal si vous avez Google Workspace)
   - **App name** : Fylora
   - **User support email** : Votre email
   - **Developer contact** : Votre email
   - Cliquez sur **Save and Continue**
   - Ajoutez votre email dans **Test users** si nécessaire
   - Cliquez sur **Save and Continue**

4. Créez l'OAuth client ID :
   - **Application type** : Web application
   - **Name** : Fylora Web Client
   - **Authorized JavaScript origins** :
     ```
     https://fylora-1.onrender.com
     http://localhost:5001
     ```
   - **Authorized redirect URIs** :
     ```
     https://fylora-1.onrender.com/api/auth/google/callback
     http://localhost:5001/api/auth/google/callback
     ```
   - Cliquez sur **Create**

5. **Copiez les identifiants** :
   - **Client ID** : `xxxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com`
   - **Client Secret** : `GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxx`

### Étape 4 : Configurer sur Render

1. Allez sur [Render Dashboard](https://dashboard.render.com/)
2. Sélectionnez votre service backend (fylora-backend)
3. Allez dans **Environment** (Variables d'environnement)
4. Ajoutez ces variables :

   ```
   GOOGLE_CLIENT_ID=votre_client_id_google
   GOOGLE_CLIENT_SECRET=votre_client_secret_google
   GOOGLE_REDIRECT_URI=https://fylora-1.onrender.com/api/auth/google/callback
   ```

5. Cliquez sur **Save Changes**
6. Le service va redémarrer automatiquement

---

## 🐙 Configuration GitHub OAuth

### Étape 1 : Créer une OAuth App GitHub

1. Allez sur [GitHub Developer Settings](https://github.com/settings/developers)
2. Cliquez sur **OAuth Apps** dans le menu de gauche
3. Cliquez sur **New OAuth App**

### Étape 2 : Configurer l'OAuth App

Remplissez le formulaire :

- **Application name** : Fylora
- **Homepage URL** :
  ```
  https://fylora-1.onrender.com
  ```
- **Authorization callback URL** :
  ```
  https://fylora-1.onrender.com/api/auth/github/callback
  ```
  ⚠️ **IMPORTANT** : Pas de slash final, pas d'espace, exactement cette URL

- Cliquez sur **Register application**

### Étape 3 : Générer le Client Secret

1. Sur la page de votre OAuth App, vous verrez :
   - **Client ID** : `xxxxxxxxxxxxxxxxxxxx`
   - **Client Secret** : Cliquez sur **Generate a new client secret**

2. **Copiez immédiatement le Client Secret** (il ne sera affiché qu'une seule fois !)

### Étape 4 : Configurer sur Render

1. Allez sur [Render Dashboard](https://dashboard.render.com/)
2. Sélectionnez votre service backend (fylora-backend)
3. Allez dans **Environment** (Variables d'environnement)
4. Ajoutez ces variables :

   ```
   GITHUB_CLIENT_ID=votre_client_id_github
   GITHUB_CLIENT_SECRET=votre_client_secret_github
   GITHUB_REDIRECT_URI=https://fylora-1.onrender.com/api/auth/github/callback
   ```

5. Cliquez sur **Save Changes**
6. Le service va redémarrer automatiquement

---

## ✅ Vérification

Après avoir configuré les variables, vérifiez les logs Render :

1. Allez dans **Logs** de votre service backend
2. Recherchez ces messages :
   ```
   ✅ Google OAuth configured
   ✅ GitHub OAuth configured
   ```

Si vous voyez des avertissements comme :
```
⚠️ Google OAuth not configured (missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET)
⚠️ GitHub OAuth not configured (missing GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET)
```

Cela signifie que les variables ne sont pas correctement configurées.

---

## 🔧 Dépannage

### Problème : "OAuth client was deleted" (Google)

**Solution** :
1. Vérifiez que votre Client ID existe dans Google Cloud Console
2. Si nécessaire, créez un nouveau Client ID
3. Mettez à jour `GOOGLE_CLIENT_ID` sur Render

### Problème : "redirect_uri_mismatch" (GitHub)

**Solution** :
1. Vérifiez que l'URL de callback dans GitHub est **EXACTEMENT** :
   ```
   https://fylora-1.onrender.com/api/auth/github/callback
   ```
2. Pas de slash final, pas d'espace
3. Vérifiez que `GITHUB_REDIRECT_URI` sur Render correspond exactement

### Problème : "Invalid client secret" (GitHub)

**Solution** :
1. Le Client Secret GitHub a peut-être été régénéré
2. Allez sur GitHub > Settings > Developer settings > OAuth Apps
3. Régénérez le Client Secret
4. Mettez à jour `GITHUB_CLIENT_SECRET` sur Render

---

## 📝 Variables d'environnement complètes pour Render

Voici toutes les variables OAuth à configurer sur Render :

```env
# Google OAuth
GOOGLE_CLIENT_ID=votre_client_id_google
GOOGLE_CLIENT_SECRET=votre_client_secret_google
GOOGLE_REDIRECT_URI=https://fylora-1.onrender.com/api/auth/google/callback

# GitHub OAuth
GITHUB_CLIENT_ID=votre_client_id_github
GITHUB_CLIENT_SECRET=votre_client_secret_github
GITHUB_REDIRECT_URI=https://fylora-1.onrender.com/api/auth/github/callback
```

---

## 🚀 Après configuration

Une fois les variables configurées :

1. Le backend va redémarrer automatiquement
2. Vérifiez les logs pour confirmer que OAuth est configuré
3. Testez l'authentification depuis l'application web ou mobile

---

## 📞 Besoin d'aide ?

Si vous rencontrez des problèmes :

1. Vérifiez les logs Render pour les erreurs spécifiques
2. Vérifiez que les URLs de callback sont exactement identiques
3. Assurez-vous que les secrets ne contiennent pas d'espaces supplémentaires

