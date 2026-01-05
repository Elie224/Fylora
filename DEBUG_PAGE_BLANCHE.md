# 🔍 Debug Page Blanche - Frontend

## ✅ Vérifications à Faire

### 1. Vérifier les Logs de Build sur Render

1. **Allez dans Render Dashboard** > Service `fylor-frontend` > **"Logs"**
2. **Vérifiez** :
   - Le build s'est terminé avec succès (`Build successful 🎉`)
   - Pas d'erreurs de compilation
   - Le dossier `dist` a été créé

### 2. Vérifier la Console du Navigateur

1. **Ouvrez la console** (F12 ou Clic droit > Inspecter)
2. **Onglet "Console"** :
   - Cherchez des erreurs en rouge
   - Cherchez des warnings en jaune
   - Vérifiez s'il y a des messages d'erreur React

3. **Onglet "Network"** :
   - Vérifiez que `index.html` se charge (status 200)
   - Vérifiez que les fichiers JS se chargent (status 200)
   - Vérifiez s'il y a des erreurs 404 pour des fichiers manquants

### 3. Vérifier le Fichier index.html

1. **Ouvrez** : `https://fylor-frontend.onrender.com/index.html`
2. **Vérifiez** que le fichier s'affiche (même si vide, il devrait montrer la structure HTML)

### 4. Vérifier les Fichiers JS

1. **Ouvrez** : `https://fylor-frontend.onrender.com/assets/` (ou regardez dans Network)
2. **Vérifiez** que les fichiers JS sont présents et chargés

### 5. Problèmes Courants

#### Problème 1 : Erreur JavaScript
- **Symptôme** : Console avec erreurs
- **Solution** : Vérifier les logs de build et corriger les erreurs

#### Problème 2 : Fichiers non trouvés (404)
- **Symptôme** : Erreurs 404 dans Network
- **Solution** : Vérifier que le build a bien créé tous les fichiers

#### Problème 3 : Erreur CORS
- **Symptôme** : Erreurs CORS dans la console
- **Solution** : Vérifier que `CORS_ORIGIN` dans le backend inclut l'URL du frontend

#### Problème 4 : Erreur dans ErrorBoundary
- **Symptôme** : Page blanche sans erreur visible
- **Solution** : Vérifier le composant ErrorBoundary

#### Problème 5 : Problème avec les Contextes
- **Symptôme** : Erreurs liées à LanguageProvider ou ThemeProvider
- **Solution** : Vérifier que les contextes sont correctement initialisés

---

## 🔧 Solutions Rapides

### Solution 1 : Désactiver la Minification Temporairement

Modifiez `vite.config.js` pour désactiver la minification et voir les erreurs :

```javascript
build: {
  minify: false, // Temporairement désactivé
  // ...
}
```

### Solution 2 : Activer les Source Maps

Modifiez `vite.config.js` :

```javascript
build: {
  sourcemap: true, // Activer pour voir les erreurs
  // ...
}
```

### Solution 3 : Vérifier les Imports

Vérifiez que tous les imports dans `main.jsx` sont corrects :
- `./services/authStore`
- `./contexts/LanguageContext`
- `./contexts/ThemeContext`
- etc.

---

## 📋 Checklist de Debug

- [ ] Logs de build Render vérifiés
- [ ] Console du navigateur vérifiée (erreurs ?)
- [ ] Network tab vérifié (fichiers chargés ?)
- [ ] index.html accessible
- [ ] Fichiers JS présents dans dist/
- [ ] Pas d'erreurs CORS
- [ ] ErrorBoundary fonctionne
- [ ] Contextes initialisés correctement

---

**Dites-moi ce que vous voyez dans la console et les logs Render !**

