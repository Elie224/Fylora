# 🔧 Configuration des Variables d'Environnement sur Render

## ⚠️ IMPORTANT : Variables Requises

Pour que le backend fonctionne correctement, vous **DEVEZ** configurer ces variables d'environnement dans Render :

### Variables Critiques (Obligatoires)

1. **JWT_SECRET**
   - Description : Secret pour signer les tokens JWT d'accès
   - Comment générer : Utilisez `openssl rand -hex 32` ou le script `backend/scripts/generate-jwt-secrets.js`
   - Exemple : `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6`

2. **JWT_REFRESH_SECRET**
   - Description : Secret pour signer les refresh tokens JWT
   - Comment générer : Utilisez `openssl rand -hex 32` ou le script `backend/scripts/generate-jwt-secrets.js`
   - Exemple : `z9y8x7w6v5u4t3s2r1q0p9o8n7m6l5k4j3i2h1g0f9e8d7c6b5a4`

3. **MONGODB_URI**
   - Description : URI de connexion MongoDB Atlas
   - Format : `mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority`
   - Exemple : `mongodb+srv://nema_fylora:****@cluster0.u3cxqhm.mongodb.net/Fylora?retryWrites=true&w=majority`

4. **GOOGLE_CLIENT_ID**
   - Description : Client ID Google OAuth
   - Où trouver : Google Cloud Console → Credentials

5. **GOOGLE_CLIENT_SECRET**
   - Description : Client Secret Google OAuth
   - Où trouver : Google Cloud Console → Credentials

### Variables Optionnelles mais Recommandées

6. **CORS_ORIGIN**
   - Description : Origines autorisées pour CORS
   - Format : `https://fylor-frontend.onrender.com` (sans slash final)
   - Si plusieurs origines : `https://frontend1.com,https://frontend2.com`

7. **REDIS_URL**
   - Description : URL de connexion Redis (pour cache et sessions)
   - Format : `redis://red-xxxxx:6379` ou `redis://username:password@host:port`
   - Optionnel : Si non défini, utilise le cache mémoire

8. **GOOGLE_REDIRECT_URI**
   - Description : URL de callback Google OAuth
   - Format : `https://fylora-1.onrender.com/api/auth/google/callback`
   - Par défaut : Configuré automatiquement selon NODE_ENV

## 📋 Comment Configurer dans Render

1. Allez sur votre service backend (`Fylora-1`) dans Render Dashboard
2. Cliquez sur **"Environment"** dans le menu de gauche
3. Cliquez sur **"Add Environment Variable"**
4. Ajoutez chaque variable :
   - **Key** : Le nom de la variable (ex: `JWT_SECRET`)
   - **Value** : La valeur de la variable
5. Cliquez sur **"Save Changes"**
6. Render redéploiera automatiquement

## 🔐 Générer les Secrets JWT

### Méthode 1 : Script Node.js

```bash
cd backend
node scripts/generate-jwt-secrets.js
```

### Méthode 2 : OpenSSL

```bash
# Générer JWT_SECRET
openssl rand -hex 32

# Générer JWT_REFRESH_SECRET
openssl rand -hex 32
```

### Méthode 3 : En ligne

Utilisez un générateur de secrets en ligne (64 caractères hexadécimaux)

## ✅ Vérification

Après avoir configuré les variables, vérifiez les logs Render :
- ✅ Pas d'erreur `JWT_SECRET is not configured`
- ✅ Pas d'erreur `secretOrPrivateKey doit avoir une valeur`
- ✅ Pas d'erreur `trust proxy`

## 🐛 Erreurs Courantes

### Erreur : "secretOrPrivateKey doit avoir une valeur"
**Cause** : `JWT_SECRET` ou `JWT_REFRESH_SECRET` n'est pas défini
**Solution** : Ajoutez ces variables dans Render → Environment

### Erreur : "trust proxy"
**Cause** : Déjà corrigé dans le code (ajout de `app.set('trust proxy', 1)`)
**Solution** : Redéployez le backend

### Erreur : "OAuth Google failed"
**Cause** : `GOOGLE_CLIENT_ID` ou `GOOGLE_CLIENT_SECRET` n'est pas défini
**Solution** : Ajoutez ces variables dans Render → Environment

## 📝 Checklist

Avant de déployer, vérifiez que vous avez configuré :
- [ ] `JWT_SECRET`
- [ ] `JWT_REFRESH_SECRET`
- [ ] `MONGODB_URI`
- [ ] `GOOGLE_CLIENT_ID`
- [ ] `GOOGLE_CLIENT_SECRET`
- [ ] `CORS_ORIGIN` (recommandé)
- [ ] `REDIS_URL` (optionnel mais recommandé)

