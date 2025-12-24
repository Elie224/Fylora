# 🔧 Dépannage Page Blanche - Frontend Render

## 🐛 Problème : Page Blanche après Déploiement

Si vous voyez une page blanche sur `https://fylor-frontend.onrender.com`, suivez ces étapes :

## 📋 Checklist de Vérification

### 1. Vérifier les Logs de Build dans Render

1. Allez sur votre service `fylor-frontend` dans Render
2. Cliquez sur l'onglet **"Logs"**
3. Vérifiez s'il y a des erreurs pendant le build

**Erreurs courantes :**
- `Cannot find module 'react'` → Problème de dépendances
- `Build failed` → Erreur de compilation
- `Publish directory not found` → Problème de configuration

### 2. Vérifier la Configuration du Service

Dans Render Dashboard, vérifiez :

| Paramètre | Valeur Attendue |
|-----------|----------------|
| **Root Directory** | `frontend-web` |
| **Build Command** | `npm install && npm run build` |
| **Publish Directory** | `dist` |
| **VITE_API_URL** | `https://fylora-1.onrender.com` |

### 3. Vérifier la Console du Navigateur

1. Ouvrez `https://fylor-frontend.onrender.com`
2. Appuyez sur **F12** pour ouvrir les outils de développement
3. Allez dans l'onglet **"Console"**
4. Notez toutes les erreurs affichées

**Erreurs courantes :**
- `Failed to load module` → Problème de chargement des scripts
- `Cannot read properties of undefined` → Problème avec React
- `404 Not Found` → Fichiers manquants

### 4. Vérifier l'Onglet Network

1. Dans les outils de développement (F12)
2. Allez dans l'onglet **"Network"**
3. Rechargez la page (F5)
4. Vérifiez quels fichiers sont chargés et lesquels échouent

**Problèmes courants :**
- `index.html` → 404 → Problème de configuration Render
- `assets/*.js` → 404 → Problème de build
- `assets/*.css` → 404 → Problème de build

## 🔧 Solutions

### Solution 1 : Redéployer avec les Dernières Modifications

1. Dans Render Dashboard, ouvrez `fylor-frontend`
2. Cliquez sur **"Manual Deploy"**
3. Sélectionnez **"Deploy latest commit"**
4. Attendez la fin du build
5. Testez à nouveau

### Solution 2 : Vérifier que le Build Crée le Dossier `dist`

1. Testez le build localement :
   ```bash
   cd frontend-web
   npm install
   npm run build
   ```
2. Vérifiez que le dossier `dist` est créé
3. Vérifiez que `dist/index.html` existe

### Solution 3 : Vérifier les Variables d'Environnement

1. Dans Render Dashboard, ouvrez `fylor-frontend`
2. Allez dans **"Environment"**
3. Vérifiez que `VITE_API_URL` est défini
4. Si vous l'avez ajouté après le premier build, redéployez

### Solution 4 : Désactiver Temporairement le Code Splitting

Si le problème vient du code splitting, modifiez temporairement `vite.config.js` :

```javascript
build: {
  rollupOptions: {
    output: {
      // Désactiver le code splitting pour tester
      manualChunks: undefined,
    },
  },
}
```

Puis redéployez.

### Solution 5 : Vérifier le Fichier index.html

Le fichier `index.html` doit contenir :
```html
<div id="root"></div>
<script type="module" src="/src/main.jsx"></script>
```

## 🎯 Actions Immédiates

1. **Vérifier les logs Render** → Voir s'il y a des erreurs de build
2. **Ouvrir la console navigateur** → Voir les erreurs JavaScript
3. **Vérifier l'onglet Network** → Voir quels fichiers sont chargés
4. **Redéployer** → Utiliser "Manual Deploy" → "Deploy latest commit"

## 📝 Informations à Fournir pour le Dépannage

Si le problème persiste, notez :
1. Les erreurs dans les logs Render
2. Les erreurs dans la console du navigateur
3. Les fichiers qui échouent dans l'onglet Network
4. La configuration actuelle du service dans Render

## ✅ Vérification Finale

Une fois corrigé, vous devriez voir :
- ✅ La page d'accueil de Fylora
- ✅ Pas d'erreurs dans la console
- ✅ Tous les fichiers chargés avec succès (200 OK)

