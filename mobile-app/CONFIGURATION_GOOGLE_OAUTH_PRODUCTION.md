# 🔐 Configuration Google OAuth pour Production

## 📋 URLs de Production

D'après votre configuration Render :

- **Backend API** : `https://fylora-1.onrender.com`
- **Frontend Web** : `https://fylor-frontend.onrender.com` (selon render.yaml)

---

## ✅ Configuration dans Google Cloud Console

### Pour "Application Web" (OAuth Client ID)

Dans Google Cloud Console, lors de la création/modification de l'identifiant OAuth :

#### 1. Authorized JavaScript origins

Ajoutez **TOUTES** ces URLs :

```
https://fylor-frontend.onrender.com
http://localhost
http://localhost:3001
http://127.0.0.1
http://127.0.0.1:3001
```

**Pourquoi plusieurs ?**
- `https://fylor-frontend.onrender.com` : Production (application déployée)
- `http://localhost` et variantes : Tests locaux (Chrome, développement)

#### 2. Authorized redirect URIs

Ajoutez **TOUTES** ces URLs :

```
https://fylora-1.onrender.com/api/auth/google/callback
http://localhost:5001/api/auth/google/callback
http://localhost/api/auth/google/callback
```

**Pourquoi plusieurs ?**
- `https://fylora-1.onrender.com/api/auth/google/callback` : Production (backend déployé)
- `http://localhost:5001/api/auth/google/callback` : Tests locaux (backend local)

---

## 🎯 Configuration Recommandée

### Option 1 : Configuration Complète (Production + Local)

**Authorized JavaScript origins** :
```
https://fylor-frontend.onrender.com
http://localhost
http://localhost:3001
http://127.0.0.1
http://127.0.0.1:3001
```

**Authorized redirect URIs** :
```
https://fylora-1.onrender.com/api/auth/google/callback
http://localhost:5001/api/auth/google/callback
http://localhost/api/auth/google/callback
```

**Avantages** :
- ✅ Fonctionne en production
- ✅ Fonctionne en local pour les tests
- ✅ Pas besoin de changer la config entre prod et dev

### Option 2 : Production Seulement

**Authorized JavaScript origins** :
```
https://fylor-frontend.onrender.com
```

**Authorized redirect URIs** :
```
https://fylora-1.onrender.com/api/auth/google/callback
```

**Avantages** :
- ✅ Plus sécurisé (pas de localhost)
- ⚠️ Ne fonctionnera pas pour les tests locaux

---

## 📝 Configuration dans l'Application Mobile

### Pour le Web (Chrome)

**Fichier** : `mobile-app/web/index.html`

```html
<meta name="google-signin-client_id" content="VOTRE_CLIENT_ID_GOOGLE">
```

Remplacez `VOTRE_CLIENT_ID_GOOGLE` par le Client ID que vous avez copié depuis Google Cloud Console.

---

## 🔍 Vérifier les URLs Exactes

Si vous n'êtes pas sûr des URLs exactes de vos services Render :

1. **Aller sur Render Dashboard** : https://dashboard.render.com
2. **Vérifier le Backend** :
   - Service : `fylora-backend` ou `Fylora-1`
   - URL affichée en haut : `https://fylora-1.onrender.com` (ou similaire)
3. **Vérifier le Frontend** :
   - Service : `fylor-frontend` (ou similaire)
   - URL affichée en haut : `https://fylor-frontend.onrender.com` (ou similaire)

**Utilisez les URLs EXACTES affichées dans Render Dashboard !**

---

## ✅ Checklist

- [ ] Client ID Google créé (Application Web)
- [ ] Authorized JavaScript origins configurées (production + localhost)
- [ ] Authorized redirect URIs configurées (production + localhost)
- [ ] Client ID ajouté dans `mobile-app/web/index.html`
- [ ] Application redémarrée

---

## 🧪 Test

Après configuration :

1. **Tester en production** :
   - Aller sur `https://fylor-frontend.onrender.com`
   - Cliquer sur "Continuer avec Google"
   - Vérifier que ça fonctionne

2. **Tester en local** :
   ```powershell
   flutter run -d chrome --dart-define=API_URL=https://fylora-1.onrender.com
   ```
   - Cliquer sur "Continuer avec Google"
   - Vérifier que ça fonctionne

---

**Utilisez les URLs de production de vos services Render, plus localhost pour les tests !** 🚀

