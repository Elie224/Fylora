# ✅ Configuration OAuth Google - Guide Final

## 📋 Informations Fournies

- **Client ID** : `723639518628-tbm94pk7bgr6pga9lmiatooqk2acincf.apps.googleusercontent.com`
- **Client Secret** : Commence par `j56t` (doit être dans les variables d'environnement Render)

---

## 🔧 Étape 1 : Vérifier dans Render (Backend)

### Variables d'environnement à configurer

Allez sur [Render Dashboard](https://dashboard.render.com/) > Service **`Fylora-1`** > Onglet **"Environment"**

Vérifiez/modifiez ces variables :

#### ✅ Variables OAuth (CRITIQUE)

1. **GOOGLE_CLIENT_ID**
   - **Key** : `GOOGLE_CLIENT_ID`
   - **Value** : `723639518628-tbm94pk7bgr6pga9lmiatooqk2acincf.apps.googleusercontent.com`
   - ✅ Vérifiez que c'est exactement celui-ci (pas d'espaces, pas de caractères supplémentaires)

2. **GOOGLE_CLIENT_SECRET**
   - **Key** : `GOOGLE_CLIENT_SECRET`
   - **Value** : Votre Client Secret qui commence par `j56t...`
   - ⚠️ **IMPORTANT** : Le Client Secret complet (pas seulement le début)
   - ✅ Vérifiez qu'il n'y a pas d'espaces avant/après

3. **GOOGLE_REDIRECT_URI**
   - **Key** : `GOOGLE_REDIRECT_URI`
   - **Value** : `https://fylora-1.onrender.com/api/auth/google/callback`
   - ⚠️ **SANS slash final** (`/`)
   - ✅ Doit correspondre EXACTEMENT à celui dans Google Cloud Console

#### ✅ Variables Frontend (CRITIQUE)

4. **FRONTEND_URL**
   - **Key** : `FRONTEND_URL`
   - **Value** : `https://fylor-frontend.onrender.com`
   - ⚠️ **SANS slash final** (`/`)
   - ✅ URL où rediriger après OAuth

5. **CORS_ORIGIN**
   - **Key** : `CORS_ORIGIN`
   - **Value** : `https://fylor-frontend.onrender.com`
   - ⚠️ **SANS slash final** (`/`)
   - ✅ Origine autorisée pour les requêtes CORS

---

## 🔍 Étape 2 : Vérifier dans Google Cloud Console

### 1. Accéder à Google Cloud Console

1. Allez sur [Google Cloud Console](https://console.cloud.google.com/)
2. Sélectionnez votre projet
3. Allez dans **APIs & Services** > **Credentials**
4. Cliquez sur votre **OAuth 2.0 Client ID** : `723639518628-tbm94pk7bgr6pga9lmiatooqk2acincf.apps.googleusercontent.com`

### 2. Vérifier les Authorized redirect URIs

Dans la section **"Authorized redirect URIs"**, vous DEVEZ avoir **TOUTES** ces URLs :

```
https://fylora-1.onrender.com/api/auth/google/callback
http://localhost:5001/api/auth/google/callback
```

⚠️ **IMPORTANT** :
- Les URLs doivent être **exactement** celles-ci
- **PAS de slash final** (`/`)
- **PAS de variation** (pas de `https://` au lieu de `http://` pour localhost)

### 3. Vérifier les Authorized JavaScript origins

Dans la section **"Authorized JavaScript origins"**, vous DEVEZ avoir **TOUTES** ces URLs :

```
https://fylor-frontend.onrender.com
https://fylora-1.onrender.com
http://localhost
http://localhost:3001
http://127.0.0.1
```

⚠️ **IMPORTANT** :
- Les URLs doivent être **exactement** celles-ci
- **PAS de slash final** (`/`)
- **PAS de chemin** (juste le domaine)

### 4. Si les URLs ne sont pas présentes

1. Cliquez sur **"ADD URI"** ou **"Edit"**
2. Ajoutez les URLs manquantes une par une
3. Cliquez sur **"Save"**
4. ⚠️ Les modifications peuvent prendre quelques minutes pour être actives

---

## ✅ Checklist Complète

### Render Backend (Fylora-1)
- [ ] `GOOGLE_CLIENT_ID` = `723639518628-tbm94pk7bgr6pga9lmiatooqk2acincf.apps.googleusercontent.com`
- [ ] `GOOGLE_CLIENT_SECRET` = Votre secret complet (commence par `j56t...`)
- [ ] `GOOGLE_REDIRECT_URI` = `https://fylora-1.onrender.com/api/auth/google/callback`
- [ ] `FRONTEND_URL` = `https://fylor-frontend.onrender.com`
- [ ] `CORS_ORIGIN` = `https://fylor-frontend.onrender.com`
- [ ] Toutes les variables sont **sans espaces** avant/après
- [ ] Toutes les URLs sont **sans slash final** (`/`)

### Google Cloud Console
- [ ] Client ID existe : `723639518628-tbm94pk7bgr6pga9lmiatooqk2acincf.apps.googleusercontent.com`
- [ ] **Authorized redirect URIs** contient :
  - [ ] `https://fylora-1.onrender.com/api/auth/google/callback`
  - [ ] `http://localhost:5001/api/auth/google/callback`
- [ ] **Authorized JavaScript origins** contient :
  - [ ] `https://fylor-frontend.onrender.com`
  - [ ] `https://fylora-1.onrender.com`
  - [ ] `http://localhost`
  - [ ] `http://localhost:3001`

---

## 🚀 Actions à Effectuer

### 1. Dans Render

1. Allez sur [Render Dashboard](https://dashboard.render.com/)
2. Cliquez sur votre service backend **`Fylora-1`**
3. Allez dans l'onglet **"Environment"**
4. Vérifiez/modifiez les variables selon la checklist ci-dessus
5. Cliquez sur **"Save Changes"**
6. ⏳ Attendez que Render redéploie (2-3 minutes)

### 2. Dans Google Cloud Console

1. Allez sur [Google Cloud Console](https://console.cloud.google.com/)
2. APIs & Services > Credentials
3. Ouvrez votre Client ID OAuth
4. Vérifiez/modifiez les URI selon la checklist ci-dessus
5. Cliquez sur **"Save"**
6. ⏳ Attendez quelques minutes pour que les changements soient actifs

### 3. Tester

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
2. Vérifiez que cet URI est dans "Authorized redirect URIs" dans Google Cloud Console
3. Les deux doivent être **exactement identiques** (même casse, pas de slash final)

### Erreur : "invalid_client" ou "OAuth is not configured"

**Cause** : `GOOGLE_CLIENT_ID` ou `GOOGLE_CLIENT_SECRET` incorrect ou manquant

**Solution** :
1. Vérifiez que `GOOGLE_CLIENT_ID` dans Render = `723639518628-tbm94pk7bgr6pga9lmiatooqk2acincf.apps.googleusercontent.com`
2. Vérifiez que `GOOGLE_CLIENT_SECRET` dans Render = Votre secret complet (commence par `j56t...`)
3. Vérifiez qu'il n'y a **pas d'espaces** avant/après les valeurs
4. Redéployez le backend après modification

### Erreur : "CORS Error"

**Cause** : `CORS_ORIGIN` n'est pas configuré ou incorrect

**Solution** :
1. Vérifiez que `CORS_ORIGIN=https://fylor-frontend.onrender.com` dans Render
2. Vérifiez qu'il n'y a **pas de slash final**
3. Redéployez le backend

### Erreur : Redirection vers localhost après OAuth

**Cause** : `FRONTEND_URL` n'est pas configuré, donc le backend utilise `http://localhost:3001` par défaut

**Solution** :
1. Ajoutez `FRONTEND_URL=https://fylor-frontend.onrender.com` dans Render
2. Vérifiez qu'il n'y a **pas de slash final**
3. Redéployez le backend

---

## 📝 Résumé des URLs Critiques

### Backend (Render)
- URL : `https://fylora-1.onrender.com`
- Callback OAuth : `https://fylora-1.onrender.com/api/auth/google/callback`

### Frontend (Render)
- URL : `https://fylor-frontend.onrender.com`
- Callback après OAuth : `https://fylor-frontend.onrender.com/auth/callback`

### Google Cloud Console
- Client ID : `723639518628-tbm94pk7bgr6pga9lmiatooqk2acincf.apps.googleusercontent.com`
- Redirect URI : `https://fylora-1.onrender.com/api/auth/google/callback`
- JavaScript Origin : `https://fylor-frontend.onrender.com`

---

## ✅ Une fois tout configuré

1. ✅ Toutes les variables sont configurées dans Render
2. ✅ Toutes les URI sont configurées dans Google Cloud Console
3. ✅ Backend redéployé sur Render
4. ✅ Test de connexion Google réussi sur `https://fylor-frontend.onrender.com`

**La connexion Google OAuth devrait maintenant fonctionner ! 🚀**

