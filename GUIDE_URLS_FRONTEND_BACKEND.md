# Guide des URLs Frontend et Backend

## ⚠️ IMPORTANT : Distinction Frontend / Backend

### 🎨 Frontend (React SPA)
**URL de base :** `https://fylor-frontend.onrender.com`

**Routes disponibles :**
- `/` - Page d'accueil
- `/login` - Connexion
- `/signup` - Inscription
- `/pricing` - Page des plans tarifaires ⭐
- `/dashboard` - Tableau de bord
- `/files` - Gestion des fichiers
- `/gallery` - Galerie de médias
- `/settings` - Paramètres
- etc.

**Exemple :** `https://fylor-frontend.onrender.com/pricing`

---

### 🔧 Backend (API REST)
**URL de base :** `https://fylora-1.onrender.com`

**Routes disponibles :**
- `/api/*` - Toutes les routes API
- `/health` - Health check
- `/api/auth/*` - Authentification
- `/api/files/*` - Gestion des fichiers
- `/api/plans/*` - Plans tarifaires (API)
- `/api/billing/*` - Facturation (API)
- etc.

**Exemple :** `https://fylora-1.onrender.com/api/plans`

---

## ❌ Erreurs courantes

### Erreur 404 sur `/pricing` sur le backend
```
GET https://fylora-1.onrender.com/pricing 404 (Not Found)
```

**Cause :** Vous essayez d'accéder à une route frontend sur le backend.

**Solution :** Utilisez l'URL frontend :
```
✅ https://fylor-frontend.onrender.com/pricing
❌ https://fylora-1.onrender.com/pricing
```

---

## 📝 Récapitulatif

| Type | URL | Usage |
|------|-----|-------|
| **Frontend** | `fylor-frontend.onrender.com` | Pages web (React) |
| **Backend API** | `fylora-1.onrender.com/api/*` | API REST |

---

## 🔍 Comment vérifier

1. **Si vous voyez une page HTML** → C'est le frontend
2. **Si vous voyez du JSON** → C'est le backend API
3. **Si vous voyez une erreur 404** → Vérifiez que vous utilisez la bonne URL

---

## ✅ Checklist

- [ ] Les pages web sont accessibles via `fylor-frontend.onrender.com`
- [ ] Les API sont accessibles via `fylora-1.onrender.com/api/*`
- [ ] Le frontend appelle le backend via `VITE_API_URL`

