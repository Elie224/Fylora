# 🔍 Vérification du Build et du Fichier _redirects

## 📋 Étapes de Vérification

### 1. Vérifier que le fichier _redirects est dans dist/

Après le build, exécutez :
```bash
cd frontend-web
npm run build
ls -la dist/_redirects
cat dist/_redirects
```

Le fichier doit contenir exactement :
```
/*    /index.html   200
```

### 2. Vérifier dans les Logs Render

Dans les logs Render, vous devriez voir :
```
✅ Fichier _redirects copié dans dist/
✅ Contenu du fichier _redirects: /*    /index.html   200
```

### 3. Si le fichier n'existe pas dans dist/

Vite devrait copier automatiquement le dossier `public/` dans `dist/`. Si ce n'est pas le cas :
1. Vérifiez que le fichier `public/_redirects` existe
2. Vérifiez que `copyPublicDir: true` est dans `vite.config.js`
3. Le script `copy-redirects.cjs` devrait le copier manuellement

## 🐛 Problèmes Possibles

### Problème 1 : Le fichier n'est pas copié
**Solution** : Le script `copy-redirects.cjs` devrait le copier. Vérifiez les logs.

### Problème 2 : Render ne reconnaît pas le fichier
**Solution** : Le fichier doit être exactement à la racine de `dist/`, pas dans un sous-dossier.

### Problème 3 : Format incorrect
**Solution** : Le format doit être exactement `/*    /index.html   200` (avec des espaces, pas de tabs).

