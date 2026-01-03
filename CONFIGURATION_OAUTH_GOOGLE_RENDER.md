# 🔧 Configuration OAuth Google pour Render

## ⚠️ Problème identifié

La connexion Google OAuth ne fonctionne pas car certaines variables d'environnement ne sont pas correctement configurées dans Render.

## ✅ Solution : Configuration des variables d'environnement

### 📋 Variables à configurer dans Render (Backend)

Allez sur votre service backend **`Fylora-1`** dans Render Dashboard et configurez ces variables :

#### 1. **FRONTEND_URL** (CRITIQUE)
- **Key** : `FRONTEND_URL`
- **Value** : `https://fylor-frontend.onrender.com`
- **Description** : URL du frontend où rediriger après OAuth
- ⚠️ **SANS slash final** (`/`)

#### 2. **GOOGLE_REDIRECT_URI** (CRITIQUE)
- **Key** : `GOOGLE_REDIRECT_URI`
- **Value** : `https://fylora-1.onrender.com/api/auth/google/callback`
- **Description** : URL de callback OAuth configurée dans Google Cloud Console
- ⚠️ **Doit correspondre EXACTEMENT** à celui dans Google Cloud Console

#### 3. **CORS_ORIGIN** (CRITIQUE)
- **Key** : `CORS_ORIGIN`
- **Value** : `https://fylor-frontend.onrender.com`
- **Description** : Origine autorisée pour les requêtes CORS
- ⚠️ **SANS slash final** (`/`)

#### 4. **GOOGLE_CLIENT_ID** (Déjà configuré normalement)
- **Key** : `GOOGLE_CLIENT_ID`
- **Value** : Votre Client ID Google OAuth

#### 5. **GOOGLE_CLIENT_SECRET** (Déjà configuré normalement)
- **Key** : `GOOGLE_CLIENT_SECRET`
- **Value** : Votre Client Secret Google OAuth

---

## 🔍 Vérification dans Google Cloud Console

### 1. Accéder à Google Cloud Console
1. Allez sur [Google Cloud Console](https://console.cloud.google.com/)
2. Sélectionnez votre projet
3. Allez dans **APIs & Services** > **Credentials**
4. Cliquez sur votre **OAuth 2.0 Client ID**

### 2. Vérifier les URI de redirection autorisés

Dans la section **"Authorized redirect URIs"**, vous DEVEZ avoir :

```
https://fylora-1.onrender.com/api/auth/google/callback
```

⚠️ **IMPORTANT** :
- L'URI doit être **exactement** celui-ci (pas de slash final, pas de variation)
- Si vous avez plusieurs environnements, ajoutez-les tous :
  ```
  https://fylora-1.onrender.com/api/auth/google/callback
  http://localhost:5001/api/auth/google/callback
  ```

### 3. Vérifier les origines JavaScript autorisées

Dans la section **"Authorized JavaScript origins"**, ajoutez :

```
https://fylor-frontend.onrender.com
https://fylora-1.onrender.com
```

---

## 📝 Étapes de configuration complète

### Étape 1 : Configurer les variables dans Render Backend

1. Allez sur [Render Dashboard](https://dashboard.render.com/)
2. Cliquez sur votre service backend **`Fylora-1`**
3. Allez dans l'onglet **"Environment"**
4. Ajoutez/modifiez ces variables :

```
FRONTEND_URL=https://fylor-frontend.onrender.com
GOOGLE_REDIRECT_URI=https://fylora-1.onrender.com/api/auth/google/callback
CORS_ORIGIN=https://fylor-frontend.onrender.com
```

5. Cliquez sur **"Save Changes"**
6. Render redéploiera automatiquement le backend

### Étape 2 : Vérifier Google Cloud Console

1. Vérifiez que `GOOGLE_REDIRECT_URI` dans Render correspond à celui dans Google Cloud Console
2. Vérifiez que les origines JavaScript sont autorisées

### Étape 3 : Tester la connexion

1. Allez sur `https://fylor-frontend.onrender.com`
2. Cliquez sur **"Se connecter avec Google"**
3. Vous devriez être redirigé vers Google pour l'authentification
4. Après acceptation, vous devriez être redirigé vers le dashboard

---

## 🐛 Dépannage

### Erreur : "redirect_uri_mismatch"

**Cause** : L'URI de redirection dans Render ne correspond pas à celui dans Google Cloud Console

**Solution** :
1. Vérifiez que `GOOGLE_REDIRECT_URI` dans Render = `https://fylora-1.onrender.com/api/auth/google/callback`
2. Vérifiez que cet URI est dans la liste des "Authorized redirect URIs" dans Google Cloud Console
3. Redéployez le backend après modification

### Erreur : "CORS Error"

**Cause** : `CORS_ORIGIN` n'est pas configuré ou incorrect

**Solution** :
1. Vérifiez que `CORS_ORIGIN=https://fylor-frontend.onrender.com` dans Render
2. Vérifiez qu'il n'y a **PAS de slash final**
3. Redéployez le backend

### Erreur : Redirection vers localhost après OAuth

**Cause** : `FRONTEND_URL` n'est pas configuré, donc le backend utilise `http://localhost:3001` par défaut

**Solution** :
1. Ajoutez `FRONTEND_URL=https://fylor-frontend.onrender.com` dans Render
2. Redéployez le backend

### Erreur : "OAuth is not configured"

**Cause** : `GOOGLE_CLIENT_ID` ou `GOOGLE_CLIENT_SECRET` manquants

**Solution** :
1. Vérifiez que ces variables sont définies dans Render
2. Vérifiez qu'elles sont correctes (pas d'espaces, pas de caractères spéciaux)

---

## ✅ Checklist de vérification

- [ ] `FRONTEND_URL` configuré dans Render = `https://fylor-frontend.onrender.com`
- [ ] `GOOGLE_REDIRECT_URI` configuré dans Render = `https://fylora-1.onrender.com/api/auth/google/callback`
- [ ] `CORS_ORIGIN` configuré dans Render = `https://fylor-frontend.onrender.com`
- [ ] `GOOGLE_CLIENT_ID` configuré dans Render
- [ ] `GOOGLE_CLIENT_SECRET` configuré dans Render
- [ ] URI de redirection dans Google Cloud Console = `https://fylora-1.onrender.com/api/auth/google/callback`
- [ ] Origines JavaScript dans Google Cloud Console incluent `https://fylor-frontend.onrender.com`
- [ ] Backend redéployé après modifications
- [ ] Test de connexion Google réussi

---

## 📞 Support

Si le problème persiste après avoir suivi ces étapes :
1. Vérifiez les logs du backend dans Render
2. Vérifiez la console du navigateur (F12) pour les erreurs
3. Vérifiez que toutes les URLs sont correctes (pas de typos, pas de slash final)

