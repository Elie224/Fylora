# Guide d'application de la configuration OAuth

Ce guide vous explique comment appliquer et vérifier la configuration OAuth pour Google et GitHub.

## 🚀 Étapes rapides

### 1. Vérifier la configuration actuelle

Exécutez le script de vérification :

```bash
npm run check-oauth
```

Ce script vérifie que toutes les variables d'environnement nécessaires sont présentes.

### 2. Configurer les variables d'environnement

Si des variables manquent, ajoutez-les dans votre fichier `.env` à la racine du dossier `backend` :

```env
# Google OAuth
GOOGLE_CLIENT_ID=votre_client_id_google
GOOGLE_CLIENT_SECRET=votre_client_secret_google
GOOGLE_REDIRECT_URI=http://localhost:5001/api/auth/google/callback

# GitHub OAuth
GITHUB_CLIENT_ID=votre_client_id_github
GITHUB_CLIENT_SECRET=votre_client_secret_github
GITHUB_REDIRECT_URI=http://localhost:5001/api/auth/github/callback

# Frontend URL (pour les redirections)
FRONTEND_URL=http://localhost:3001

# Session Secret (optionnel mais recommandé)
SESSION_SECRET=votre_secret_session_securise
```

### 3. Obtenir les identifiants OAuth

#### Pour Google :

1. Allez sur [Google Cloud Console](https://console.cloud.google.com/)
2. Créez un projet ou sélectionnez un projet existant
3. Activez l'API "Google Identity Services"
4. Allez dans **APIs & Services** > **Credentials**
5. Cliquez sur **+ CREATE CREDENTIALS** > **OAuth client ID**
6. Configurez :
   - **Application type** : Web application
   - **Authorized redirect URIs** : `http://localhost:5001/api/auth/google/callback`
7. Copiez le **Client ID** et **Client Secret**

#### Pour GitHub :

1. Allez sur [GitHub Developer Settings](https://github.com/settings/developers)
2. Cliquez sur **OAuth Apps** > **New OAuth App**
3. Configurez :
   - **Application name** : Fylora
   - **Homepage URL** : `http://localhost:3001`
   - **Authorization callback URL** : `http://localhost:5001/api/auth/github/callback`
4. Cliquez sur **Register application**
5. Copiez le **Client ID** et générez un **Client Secret**

### 4. Vérifier à nouveau

Après avoir ajouté les variables, relancez la vérification :

```bash
npm run check-oauth
```

Vous devriez voir tous les ✅ verts.

### 5. Redémarrer le serveur

**IMPORTANT** : Après avoir modifié le fichier `.env`, vous devez redémarrer le serveur :

```bash
# Arrêter le serveur (Ctrl+C)
# Puis relancer
npm start
# ou pour le développement
npm run dev
```

### 6. Vérifier les logs au démarrage

Au démarrage, vous devriez voir :

```
🔧 Configuring OAuth strategies...
📋 GitHub config check: { clientId: 'present', clientSecret: 'present', redirectUri: '...' }
✅ Google OAuth configured
✅ GitHub OAuth configured
🔧 OAuth strategies configuration completed
```

## ✅ Vérification finale

1. ✅ Toutes les variables d'environnement sont présentes
2. ✅ Les URIs de redirection sont configurées dans Google Cloud Console
3. ✅ Les URIs de redirection sont configurées dans GitHub Settings
4. ✅ Le serveur redémarre sans erreur
5. ✅ Les logs montrent que les stratégies OAuth sont configurées

## 🧪 Test

Pour tester la configuration :

1. Démarrez le serveur backend
2. Ouvrez le frontend
3. Allez sur la page de connexion
4. Cliquez sur "Se connecter avec Google" ou "Se connecter avec GitHub"
5. Vous devriez être redirigé vers le fournisseur OAuth

## 🐛 Dépannage

### Erreur : "OAuth client was deleted" (Google)

**Solution** :
- Créez un nouveau client OAuth dans Google Cloud Console
- Mettez à jour `GOOGLE_CLIENT_ID` et `GOOGLE_CLIENT_SECRET` dans votre `.env`
- Redémarrez le serveur

### Erreur : "redirect_uri is not associated" (GitHub)

**Solution** :
- Vérifiez que l'URI exacte `http://localhost:5001/api/auth/github/callback` est dans les paramètres GitHub
- Pas de slash final, pas d'espace
- Redémarrez le serveur

### Les stratégies ne se chargent pas

**Solution** :
- Vérifiez que les packages sont installés : `npm install`
- Vérifiez que les variables d'environnement sont chargées : `npm run check-oauth`
- Redémarrez le serveur

## 📚 Documentation complète

Pour plus de détails, consultez : `backend/OAUTH_SETUP.md`

