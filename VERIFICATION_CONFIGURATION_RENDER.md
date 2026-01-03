# ✅ Vérification Configuration Render

## 📋 Commandes de Build et Start

### Backend

**Build Command** :
```bash
cd backend && npm install
```

**Start Command** :
```bash
cd backend && npm start
```

**Root Directory** :
```
backend
```

### Frontend

**Build Command** :
```bash
cd frontend-web && npm install && npm run build
```

**Start Command** :
```
(automatique pour static site)
```

**Root Directory** :
```
frontend-web
```

## ✅ Vérification dans Render Dashboard

### Pour le Backend :

1. **Allez sur [Render Dashboard](https://dashboard.render.com/)**
2. **Cliquez sur votre service backend** (ex: `Fylora-1`)
3. **Allez dans "Settings"**
4. **Vérifiez la section "Build & Deploy"** :

| Paramètre | Valeur Attendu |
|-----------|----------------|
| **Environment** | `Node` |
| **Build Command** | `cd backend && npm install` |
| **Start Command** | `cd backend && npm start` |
| **Root Directory** | `backend` (ou laisser vide si Build Command contient `cd backend`) |

### ⚠️ Note Importante

Si vous utilisez `cd backend && npm install` dans la **Build Command**, vous avez deux options :

**Option 1** : Root Directory vide
- **Build Command** : `cd backend && npm install`
- **Start Command** : `cd backend && npm start`
- **Root Directory** : (vide ou `/`)

**Option 2** : Root Directory = `backend`
- **Build Command** : `npm install`
- **Start Command** : `npm start`
- **Root Directory** : `backend`

## 🔍 Vérification des Logs

Après le déploiement, vérifiez les logs. Vous devriez voir :

### ✅ Si c'est correct :
```
==> Running 'cd backend && npm install'
...
==> Running 'cd backend && npm start'
> fylora-backend@1.0.0 start
> node app.js
```

### ❌ Si c'est incorrect :
```
error: failed to solve: failed to read dockerfile
```
ou
```
npm ERR! code ENOENT
npm ERR! syscall open
npm ERR! path /opt/render/project/src/package.json
```

## 🚀 Configuration Recommandée

Pour éviter les problèmes, je recommande :

**Backend** :
- **Root Directory** : `backend`
- **Build Command** : `npm install`
- **Start Command** : `npm start`

Cette configuration est plus simple et évite les problèmes de chemin.

## 📝 Si vous avez des erreurs

1. **Vérifiez que le Root Directory est correct**
2. **Vérifiez que les commandes ne contiennent pas d'erreurs de syntaxe**
3. **Vérifiez que package.json existe dans le dossier backend**
4. **Vérifiez les logs pour voir l'erreur exacte**

Les modifications ont été poussées sur GitHub. Si vous avez encore des problèmes, partagez les logs d'erreur complets.

