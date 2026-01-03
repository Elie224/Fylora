# ✅ Configuration OAuth Google pour Render - Guide Final

## 📋 Informations

Ce guide vous aide à configurer OAuth Google pour votre application web déployée sur Render.

⚠️ **IMPORTANT** : Les credentials (Client ID et Client Secret) ne doivent JAMAIS être dans le code source. Ils doivent être uniquement dans les variables d'environnement de Render.

---

## 🔧 Configuration dans Render (Backend)

### Variables d'environnement à configurer

Allez sur [Render Dashboard](https://dashboard.render.com/) > Service **`Fylora-1`** > Onglet **"Environment"**

#### ✅ Variables OAuth (CRITIQUE)

1. **GOOGLE_CLIENT_ID**
   - **Key** : `GOOGLE_CLIENT_ID`
   - **Value** : Votre Client ID Google complet depuis Google Cloud Console
   - ✅ Copiez-collez exactement la valeur complète

2. **GOOGLE_CLIENT_SECRET**
   - **Key** : `GOOGLE_CLIENT_SECRET`
   - **Value** : Votre Client Secret Google complet depuis Google Cloud Console
   - ✅ Copiez-collez exactement la valeur complète
   - ⚠️ **IMPORTANT** : Pas d'espaces avant/après

3. **GOOGLE_REDIRECT_URI**
   - **Key** : `GOOGLE_REDIRECT_URI`
   - **Value** : `https://fylora-1.onrender.com/api/auth/google/callback`
   - ⚠️ **SANS slash final** (`/`)

#### ✅ Variables Frontend (CRITIQUE)

4. **FRONTEND_URL**
   - **Key** : `FRONTEND_URL`
   - **Value** : `https://fylor-frontend.onrender.com`
   - ⚠️ **SANS slash final** (`/`)

5. **CORS_ORIGIN**
   - **Key** : `CORS_ORIGIN`
   - **Value** : `https://fylor-frontend.onrender.com`
   - ⚠️ **SANS slash final** (`/`)

---

## 🔍 Configuration dans Google Cloud Console

### 1. Accéder à Google Cloud Console

1. Allez sur [Google Cloud Console](https://console.cloud.google.com/)
2. Sélectionnez votre projet
3. Allez dans **APIs & Services** > **Credentials**
4. Ouvrez votre **OAuth 2.0 Client ID**

### 2. Configurer les Authorized redirect URIs

Dans la section **"Authorized redirect URIs"**, ajoutez :

```
https://fylora-1.onrender.com/api/auth/google/callback
http://localhost:5001/api/auth/google/callback
```

⚠️ **IMPORTANT** :
- Les URLs doivent être **exactement** celles-ci
- **PAS de slash final** (`/`)

### 3. Configurer les Authorized JavaScript origins

Dans la section **"Authorized JavaScript origins"**, ajoutez :

```
https://fylor-frontend.onrender.com
https://fylora-1.onrender.com
http://localhost
http://localhost:3001
```

⚠️ **IMPORTANT** :
- Les URLs doivent être **exactement** celles-ci
- **PAS de slash final** (`/`)
- **PAS de chemin** (juste le domaine)

---

## ✅ Checklist Complète

### Render Backend (Fylora-1)
- [ ] `GOOGLE_CLIENT_ID` configuré avec votre Client ID complet
- [ ] `GOOGLE_CLIENT_SECRET` configuré avec votre Client Secret complet
- [ ] `GOOGLE_REDIRECT_URI` = `https://fylora-1.onrender.com/api/auth/google/callback`
- [ ] `FRONTEND_URL` = `https://fylor-frontend.onrender.com`
- [ ] `CORS_ORIGIN` = `https://fylor-frontend.onrender.com`
- [ ] Toutes les variables sont **sans espaces** avant/après
- [ ] Toutes les URLs sont **sans slash final** (`/`)

### Google Cloud Console
- [ ] Client ID existe et est actif
- [ ] **Authorized redirect URIs** contient :
  - [ ] `https://fylora-1.onrender.com/api/auth/google/callback`
  - [ ] `http://localhost:5001/api/auth/google/callback`
- [ ] **Authorized JavaScript origins** contient :
  - [ ] `https://fylor-frontend.onrender.com`
  - [ ] `https://fylora-1.onrender.com`
  - [ ] `http://localhost`
  - [ ] `http://localhost:3001`

---

## 🚀 Étapes à Suivre

### 1. Dans Render

1. Allez sur [Render Dashboard](https://dashboard.render.com/)
2. Cliquez sur votre service backend **`Fylora-1`**
3. Allez dans l'onglet **"Environment"**
4. Pour chaque variable de la checklist :
   - Si elle existe déjà, cliquez sur **"Edit"** et vérifiez/modifiez la valeur
   - Si elle n'existe pas, cliquez sur **"Add Environment Variable"** et ajoutez-la
5. Cliquez sur **"Save Changes"**
6. ⏳ Attendez que Render redéploie (2-3 minutes)

### 2. Dans Google Cloud Console

1. Allez sur [Google Cloud Console](https://console.cloud.google.com/)
2. APIs & Services > Credentials
3. Ouvrez votre Client ID OAuth
4. Vérifiez que les URI sont configurées selon la checklist
5. Si des URI manquent, ajoutez-les et cliquez sur **"Save"**

### 3. Tester

1. Allez sur `https://fylor-frontend.onrender.com`
2. Cliquez sur **"Se connecter avec Google"**
3. Vous devriez être redirigé vers Google pour l'authentification
4. Après acceptation, vous devriez être redirigé vers le dashboard

---

## 🐛 Dépannage

### Erreur : "redirect_uri_mismatch"

**Solution** :
1. Vérifiez que `GOOGLE_REDIRECT_URI` dans Render = `https://fylora-1.onrender.com/api/auth/google/callback`
2. Vérifiez que cet URI est dans "Authorized redirect URIs" dans Google Cloud Console
3. Les deux doivent être **exactement identiques**

### Erreur : "invalid_client" ou "OAuth is not configured"

**Solution** :
1. Vérifiez que `GOOGLE_CLIENT_ID` et `GOOGLE_CLIENT_SECRET` sont correctement configurés dans Render
2. Vérifiez qu'il n'y a **pas d'espaces** avant/après les valeurs
3. Redéployez le backend après modification

### Erreur : "CORS Error"

**Solution** :
1. Vérifiez que `CORS_ORIGIN=https://fylor-frontend.onrender.com` dans Render
2. Vérifiez qu'il n'y a **pas de slash final**
3. Redéployez le backend

---

## 📝 Résumé

**URLs Critiques** :
- Backend : `https://fylora-1.onrender.com`
- Frontend : `https://fylor-frontend.onrender.com`
- Callback OAuth : `https://fylora-1.onrender.com/api/auth/google/callback`

**Actions** :
1. ✅ Configurer les 5 variables dans Render
2. ✅ Vérifier les URI dans Google Cloud Console
3. ✅ Tester la connexion Google

Une fois tout configuré, la connexion Google OAuth devrait fonctionner ! 🚀

