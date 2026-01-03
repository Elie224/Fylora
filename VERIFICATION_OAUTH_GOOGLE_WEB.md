# ✅ Vérification Configuration OAuth Google pour le Web

## 📋 Situation Actuelle

Vous avez déjà configuré Google Cloud Console pour l'application mobile avec :
- ✅ Client ID configuré
- ✅ Client Secret configuré
- ✅ Credentials dans le code

## ⚠️ Problème Identifié

Le même Client ID OAuth peut être utilisé pour **mobile ET web**, MAIS il faut s'assurer que :

1. **Les URI de redirection sont correctement configurées** dans Google Cloud Console
2. **Les variables d'environnement sont configurées** dans Render (backend)
3. **Les origines JavaScript sont autorisées** dans Google Cloud Console

---

## 🔍 Vérification 1 : Google Cloud Console

### Étape 1 : Vérifier les Authorized Redirect URIs

Dans Google Cloud Console, pour votre Client ID OAuth existant, vérifiez que vous avez **TOUTES** ces URLs dans "Authorized redirect URIs" :

```
https://fylora-1.onrender.com/api/auth/google/callback
http://localhost:5001/api/auth/google/callback
```

**⚠️ IMPORTANT** : Ces URLs doivent être **exactement** celles-ci (pas de slash final, pas de variation).

### Étape 2 : Vérifier les Authorized JavaScript Origins

Dans "Authorized JavaScript origins", vous devez avoir **TOUTES** ces URLs :

```
https://fylor-frontend.onrender.com
https://fylora-1.onrender.com
http://localhost
http://localhost:3001
http://127.0.0.1
```

**Pourquoi plusieurs ?**
- `https://fylor-frontend.onrender.com` : Frontend web en production
- `https://fylora-1.onrender.com` : Backend en production
- `http://localhost` et variantes : Pour les tests locaux

---

## 🔧 Vérification 2 : Variables d'Environnement dans Render

### Variables à Configurer dans Render (Backend)

Allez sur votre service backend **`Fylora-1`** dans Render Dashboard :

1. **Onglet "Environment"**
2. Vérifiez/modifiez ces variables :

#### ✅ Variables Déjà Configurées (Normalement)
- `GOOGLE_CLIENT_ID` : Votre Client ID Google
- `GOOGLE_CLIENT_SECRET` : Votre Client Secret Google

#### ⚠️ Variables à AJOUTER/MODIFIER (CRITIQUE)

1. **FRONTEND_URL**
   - **Key** : `FRONTEND_URL`
   - **Value** : `https://fylor-frontend.onrender.com`
   - **Sans slash final** (`/`)
   - **Description** : URL du frontend où rediriger après OAuth

2. **GOOGLE_REDIRECT_URI**
   - **Key** : `GOOGLE_REDIRECT_URI`
   - **Value** : `https://fylora-1.onrender.com/api/auth/google/callback`
   - **Sans slash final** (`/`)
   - **Description** : Doit correspondre EXACTEMENT à celui dans Google Cloud Console

3. **CORS_ORIGIN**
   - **Key** : `CORS_ORIGIN`
   - **Value** : `https://fylor-frontend.onrender.com`
   - **Sans slash final** (`/`)
   - **Description** : Origine autorisée pour les requêtes CORS

---

## 📝 Checklist de Vérification

### Google Cloud Console
- [ ] Client ID existe et est actif
- [ ] Client Secret est configuré
- [ ] **Authorized redirect URIs** contient :
  - [ ] `https://fylora-1.onrender.com/api/auth/google/callback`
  - [ ] `http://localhost:5001/api/auth/google/callback` (pour tests)
- [ ] **Authorized JavaScript origins** contient :
  - [ ] `https://fylor-frontend.onrender.com`
  - [ ] `https://fylora-1.onrender.com`
  - [ ] `http://localhost` (pour tests)
  - [ ] `http://localhost:3001` (pour tests)

### Render Backend (Fylora-1)
- [ ] `GOOGLE_CLIENT_ID` est configuré
- [ ] `GOOGLE_CLIENT_SECRET` est configuré
- [ ] `FRONTEND_URL` = `https://fylor-frontend.onrender.com`
- [ ] `GOOGLE_REDIRECT_URI` = `https://fylora-1.onrender.com/api/auth/google/callback`
- [ ] `CORS_ORIGIN` = `https://fylor-frontend.onrender.com`

---

## 🚀 Actions à Effectuer

### 1. Dans Google Cloud Console

1. Allez sur [Google Cloud Console](https://console.cloud.google.com/)
2. Sélectionnez votre projet
3. **APIs & Services** > **Credentials**
4. Cliquez sur votre **OAuth 2.0 Client ID** (celui que vous utilisez pour mobile)
5. Vérifiez/modifiez :

   **Authorized redirect URIs** :
   ```
   https://fylora-1.onrender.com/api/auth/google/callback
   http://localhost:5001/api/auth/google/callback
   ```

   **Authorized JavaScript origins** :
   ```
   https://fylor-frontend.onrender.com
   https://fylora-1.onrender.com
   http://localhost
   http://localhost:3001
   ```

6. Cliquez sur **"Save"**

### 2. Dans Render (Backend)

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
6. Render redéploiera automatiquement le backend (attendez 2-3 minutes)

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
2. Vérifiez que cet URI est dans la liste des "Authorized redirect URIs" dans Google Cloud Console
3. Les deux doivent être **exactement identiques** (pas de slash final, pas de variation)

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

## ✅ Résumé

**Vous pouvez utiliser le MÊME Client ID OAuth pour mobile ET web**, mais vous devez :

1. ✅ Ajouter les URI de redirection web dans Google Cloud Console
2. ✅ Ajouter les origines JavaScript web dans Google Cloud Console
3. ✅ Configurer `FRONTEND_URL` dans Render
4. ✅ Configurer `GOOGLE_REDIRECT_URI` dans Render
5. ✅ Configurer `CORS_ORIGIN` dans Render

Une fois ces étapes effectuées, la connexion Google OAuth devrait fonctionner pour le web ! 🚀

