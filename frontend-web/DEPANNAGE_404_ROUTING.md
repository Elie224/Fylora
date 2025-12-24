# 🔧 Dépannage 404 sur Routes SPA (ex: /login)

## 🐛 Problème : Erreur 404 sur `/login`, `/signup`, etc.

Si vous voyez des erreurs 404 sur les routes React (ex: `/login`), c'est que Render Static Site ne redirige pas correctement vers `index.html`.

## ✅ Solution : Fichier `_redirects`

Le fichier `frontend-web/public/_redirects` doit être copié dans `dist/` après le build. Vite le fait automatiquement, mais nous avons ajouté un script pour garantir qu'il est bien copié.

### Format du fichier `_redirects`

```
/*    /index.html   200
```

Ce fichier indique à Render de rediriger toutes les routes vers `index.html` avec un code HTTP 200 (pas une redirection 301/302).

## 🔧 Vérifications

### 1. Vérifier que le fichier existe dans `dist/`

Après le build, le fichier `dist/_redirects` doit exister. Vous pouvez vérifier dans les logs Render :

1. Allez sur votre service `fylor-frontend` dans Render
2. Cliquez sur **"Logs"**
3. Cherchez le message : `✅ Fichier _redirects copié dans dist/`

### 2. Vérifier la configuration Render

Dans Render Dashboard, vérifiez :
- **Publish Directory** : `dist` (pas `dist/` ou autre)
- Le build se termine avec succès

### 3. Redéployer le Frontend

1. Allez sur votre service `fylor-frontend` dans Render
2. Cliquez sur **"Manual Deploy"** → **"Deploy latest commit"**
3. Attendez la fin du build
4. Testez `/login` à nouveau

## 🐛 Si le Problème Persiste

### Option 1 : Vérifier manuellement dans Render

1. Dans Render Dashboard, ouvrez `fylor-frontend`
2. Allez dans **"Settings"**
3. Vérifiez que **"Publish Directory"** = `dist`
4. Vérifiez que le build se termine avec succès

### Option 2 : Tester le Build Localement

```bash
cd frontend-web
npm install
npm run build
ls -la dist/_redirects  # Vérifier que le fichier existe
```

### Option 3 : Vérifier le Format du Fichier

Le fichier `public/_redirects` doit contenir exactement :
```
/*    /index.html   200
```

- Pas d'espaces supplémentaires
- Pas de lignes vides
- Format exact : `/*    /index.html   200`

## 📝 Notes Importantes

- Le fichier `_redirects` est spécifique à Render Static Site
- Il doit être à la racine du dossier publié (`dist/`)
- Vite copie automatiquement le contenu de `public/` dans `dist/`
- Le script `copy-redirects` garantit que le fichier est bien copié

## ✅ Résultat Attendu

Après redéploiement :
- ✅ `/login` devrait fonctionner (plus de 404)
- ✅ `/signup` devrait fonctionner
- ✅ Toutes les routes React devraient fonctionner
- ✅ Le routing SPA devrait fonctionner correctement

