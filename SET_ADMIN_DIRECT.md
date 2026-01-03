# Configuration Admin Directe via MongoDB

## Script Direct (Sans API)

Ce script se connecte directement à MongoDB et définit `kouroumaelisee@gmail.com` comme administrateur.

### Sur Render (Production)

1. **Allez sur Render** → Votre service backend
2. **Ouvrez les "Environment Variables"** (Variables d'environnement)
3. **Vérifiez que `MONGODB_URI` est bien défini**
4. **Dans la section "Shell" ou via une requête HTTP**, exécutez :

```bash
cd backend
node scripts/setAdminDirect.js
```

**OU** créez une route temporaire dans Render qui exécute le script automatiquement.

### Alternative : Route API Automatique

J'ai créé une route `/api/admin/set-admin` qui peut être appelée depuis le navigateur.

**Depuis le navigateur (une fois connecté avec kouroumaelisee@gmail.com)** :

1. Allez sur : https://fylor-frontend.onrender.com/set-admin
2. Cliquez sur le bouton

**OU via la console du navigateur** :

```javascript
fetch('https://fylora-1.onrender.com/api/admin/set-admin', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
  },
  body: JSON.stringify({ email: 'kouroumaelisee@gmail.com' })
})
.then(res => res.json())
.then(data => {
  alert(data.data?.message || data.error?.message);
  if (data.data) window.location.reload();
});
```

## Vérification

Après exécution, l'utilisateur `kouroumaelisee@gmail.com` devrait :
- ✅ Voir le lien "⚙️ Administration" dans le menu
- ✅ Pouvoir accéder à https://fylor-frontend.onrender.com/admin

