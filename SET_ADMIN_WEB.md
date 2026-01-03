# Configuration Admin via l'Interface Web

## Méthode la plus simple (sans Node.js local)

Puisque Node.js n'est pas installé localement, vous pouvez définir l'administrateur directement via l'API.

### Option 1 : Via la Page Web (Le plus simple - Recommandé)

1. **Connectez-vous** à votre application Fylora avec le compte `kouroumaelisee@gmail.com`
   - URL : https://fylor-frontend.onrender.com

2. **Allez sur cette page** :
   ```
   https://fylor-frontend.onrender.com/set-admin
   ```

3. **Cliquez sur le bouton** "✅ Définir comme Administrateur"

4. La page se rechargera automatiquement et vous verrez le lien "⚙️ Administration" dans le menu

### Option 2 : Via la Console du Navigateur

1. **Connectez-vous** à votre application Fylora avec le compte `kouroumaelisee@gmail.com`
   - URL : https://fylor-frontend.onrender.com

2. **Ouvrez la console du navigateur** (F12 ou Clic droit > Inspecter > Console)

3. **Exécutez cette commande** :

```javascript
fetch('/api/admin/set-admin', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
  },
  body: JSON.stringify({ email: 'kouroumaelisee@gmail.com' })
})
.then(res => res.json())
.then(data => {
  if (data.data) {
    console.log('✅ Succès:', data.data.message);
    console.log('Utilisateur:', data.data.user);
    // Recharger la page pour voir les changements
    window.location.reload();
  } else {
    console.error('❌ Erreur:', data.error);
  }
})
.catch(err => console.error('❌ Erreur:', err));
```

### Option 2 : Via Render Console (Production)

1. **Connectez-vous à Render** et allez dans votre service backend
2. **Ouvrez la console SSH**
3. **Exécutez** :

```bash
cd backend
node scripts/setAdmin.js
```

### Option 3 : Via une requête HTTP directe

Utilisez un outil comme Postman ou curl :

```bash
curl -X POST https://fylora-1.onrender.com/api/admin/set-admin \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer VOTRE_TOKEN_ACCESS" \
  -d '{"email":"kouroumaelisee@gmail.com"}'
```

**Note** : Remplacez `VOTRE_TOKEN_ACCESS` par le token que vous pouvez trouver dans la console du navigateur : `localStorage.getItem('access_token')`

## ⚠️ Important

**Après avoir défini l'admin, supprimez la route `/api/admin/set-admin` pour des raisons de sécurité.**

Pour supprimer la route :
1. Ouvrez `backend/routes/admin.js`
2. Supprimez la ligne : `router.post('/set-admin', adminController.setAdminUser);`
3. Supprimez aussi `setAdminUser` de `backend/controllers/adminController.js`

