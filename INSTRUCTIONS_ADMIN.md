# Instructions pour Définir l'Administrateur

## URL de l'Application

- **Frontend** : https://fylor-frontend.onrender.com
- **Backend API** : https://fylora-1.onrender.com

## Méthode la Plus Simple (Recommandée)

### Étape 1 : Se connecter
1. Allez sur https://fylor-frontend.onrender.com
2. Connectez-vous avec le compte : `kouroumaelisee@gmail.com`

### Étape 2 : Accéder à la page de configuration
1. Dans la barre d'adresse, allez sur :
   ```
   https://fylor-frontend.onrender.com/set-admin
   ```

### Étape 3 : Définir l'administrateur
1. Vous verrez un formulaire avec l'email pré-rempli : `kouroumaelisee@gmail.com`
2. Cliquez sur le bouton **"✅ Définir comme Administrateur"**
3. Un message de succès s'affichera
4. La page se rechargera automatiquement

### Étape 4 : Vérifier
Après le rechargement, vous devriez voir :
- ✅ Le lien **"⚙️ Administration"** dans le menu de navigation
- ✅ Vous pouvez accéder à `/admin` pour gérer les utilisateurs

## ⚠️ Important - Sécurité

**Après avoir défini l'admin, supprimez ces éléments pour des raisons de sécurité :**

### À supprimer dans le code :

1. **Page frontend** : `frontend-web/src/pages/SetAdmin.jsx`
2. **Route frontend** dans `frontend-web/src/main.jsx` :
   ```javascript
   <Route path="/set-admin" ... />
   ```
3. **Route API** dans `backend/routes/admin.js` :
   ```javascript
   router.post('/set-admin', authMiddleware, adminController.setAdminUser);
   ```
4. **Fonction** dans `backend/controllers/adminController.js` :
   - Supprimez la fonction `setAdminUser`
   - Supprimez `setAdminUser` de `module.exports`

## Alternative : Via Console du Navigateur

Si la page `/set-admin` ne fonctionne pas, vous pouvez utiliser la console :

1. Connectez-vous sur https://fylor-frontend.onrender.com
2. Appuyez sur `F12` pour ouvrir les outils de développement
3. Allez dans l'onglet **"Console"**
4. Copiez et collez ce code :

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
  if (data.data) {
    alert('✅ ' + data.data.message);
    window.location.reload();
  } else {
    alert('❌ Erreur: ' + (data.error?.message || 'Erreur inconnue'));
  }
})
.catch(err => alert('❌ Erreur: ' + err.message));
```

5. Appuyez sur **Entrée** pour exécuter

## Vérification Finale

Une fois l'admin défini, vous devriez pouvoir :
- ✅ Voir le lien "⚙️ Administration" dans le menu
- ✅ Accéder à https://fylor-frontend.onrender.com/admin
- ✅ Voir les statistiques et gérer les utilisateurs

