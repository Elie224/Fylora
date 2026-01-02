# ✅ Configuration Google OAuth - Complète

## 🔐 Informations Configurées

- **Client ID** : Configuré dans `web/index.html`
- **Client Secret** : Configuré côté backend uniquement (ne pas mettre dans le code frontend)

---

## ✅ Ce qui a été fait

1. ✅ **Client ID ajouté dans `web/index.html`**
   - Le Client ID est maintenant configuré pour le web

2. ⚠️ **Client Secret** : 
   - **NE PAS** mettre dans le code frontend/mobile
   - Doit être configuré côté backend uniquement (déjà fait normalement)

---

## 🔧 Configuration dans Google Cloud Console

### Vérifier les URLs autorisées

Dans Google Cloud Console, pour votre Client ID, vérifiez que vous avez configuré :

#### Authorized JavaScript origins

```
https://fylor-frontend.onrender.com
http://localhost
http://localhost:3001
http://127.0.0.1
```

#### Authorized redirect URIs

```
https://fylora-1.onrender.com/api/auth/google/callback
http://localhost:5001/api/auth/google/callback
```

**Si ces URLs ne sont pas déjà configurées, ajoutez-les !**

---

## 🚀 Redémarrer l'Application

Maintenant que le Client ID est configuré, redémarrez l'application :

```powershell
# Dans votre terminal Flutter, appuyer sur 'q' pour quitter
# Puis relancer
flutter run -d chrome --dart-define=API_URL=https://fylora-1.onrender.com
```

---

## 🧪 Test

Une fois l'application relancée :

1. **Test de connexion Google** :
   - Cliquer sur "Continuer avec Google"
   - Sélectionner un compte Google
   - Vérifier que la connexion réussit

2. **Si erreur "redirect_uri_mismatch"** :
   - Vérifier que `http://localhost` est dans les Authorized JavaScript origins
   - Vérifier que `http://localhost:5001/api/auth/google/callback` est dans les Authorized redirect URIs

---

## ⚠️ Sécurité

- ✅ **Client ID** : Peut être dans le code frontend (public)
- ❌ **Client Secret** : Ne JAMAIS mettre dans le code frontend/mobile
- ✅ **Client Secret** : Doit être uniquement dans les variables d'environnement du backend

---

## 📝 Vérification Backend

Assurez-vous que le backend a bien le Client Secret configuré :

Dans Render Dashboard, service backend :
- Variable d'environnement : `GOOGLE_CLIENT_SECRET`
- Valeur : [Votre Client Secret - à configurer dans Render Dashboard]

**Si ce n'est pas configuré, ajoutez-le !**

---

**Redémarrez l'application et testez la connexion Google !** 🚀

