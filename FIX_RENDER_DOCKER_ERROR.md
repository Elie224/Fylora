# 🔧 Correction Erreur Docker sur Render

## ❌ Problème

Render essaie d'utiliser Docker alors que le projet est configuré pour Node.js :

```
error: failed to solve: failed to read dockerfile: open Dockerfile: no such file or directory
```

## ✅ Solution

Le problème vient de la configuration du service sur Render. Il faut s'assurer que le service utilise la configuration `render.yaml` et non Docker.

### Option 1 : Utiliser render.yaml (Recommandé)

1. **Allez sur [Render Dashboard](https://dashboard.render.com/)**
2. **Cliquez sur votre service backend** (ex: `Fylora-1` ou `fylora-backend`)
3. **Allez dans "Settings"** (Paramètres)
4. **Vérifiez la section "Build & Deploy"** :
   - **Environment** : Doit être `Node` (pas `Docker`)
   - **Build Command** : `npm install`
   - **Start Command** : `npm start`
   - **Root Directory** : `backend`

5. **Si le service utilise Docker** :
   - Changez **Environment** de `Docker` à `Node`
   - Cliquez sur **"Save Changes"**
   - Render redéploiera automatiquement

### Option 2 : Vérifier render.yaml

Le fichier `render.yaml` à la racine du projet devrait contenir :

```yaml
services:
  - type: web
    name: fylora-backend
    env: node  # ← Important : doit être "node" pas "docker"
    region: frankfurt
    plan: free
    rootDir: backend
    buildCommand: npm install
    startCommand: npm start
```

### Option 3 : Créer le service depuis render.yaml

Si le service n'existe pas ou est mal configuré :

1. **Allez sur [Render Dashboard](https://dashboard.render.com/)**
2. **Cliquez sur "New +"** → **"Blueprint"**
3. **Connectez votre repository GitHub**
4. **Render détectera automatiquement `render.yaml`** et créera les services configurés

## 🔍 Vérification

Après avoir corrigé la configuration, vérifiez les logs du déploiement :

### ✅ Si c'est correct, vous verrez :
```
==> Running 'cd backend && npm install'
==> Running 'cd backend && npm start'
```

### ❌ Si c'est incorrect, vous verrez :
```
==> Checking out commit...
error: failed to solve: failed to read dockerfile
```

## 📝 Configuration Correcte sur Render

Dans les **Settings** du service backend :

| Paramètre | Valeur |
|-----------|--------|
| **Environment** | `Node` |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Root Directory** | `backend` |
| **Auto-Deploy** | `Yes` (si vous voulez le déploiement automatique) |

## 🚀 Actions Immédiates

1. **Allez sur Render Dashboard**
2. **Vérifiez la configuration du service backend**
3. **Changez Environment de `Docker` à `Node`** si nécessaire
4. **Sauvegardez et attendez le redéploiement**

## ⚠️ Note

Si vous avez plusieurs services (backend, frontend), vérifiez chacun :
- **Backend** : `env: node`, `rootDir: backend`
- **Frontend** : `env: static`, `rootDir: frontend-web`

Les modifications ont été poussées sur GitHub. Après avoir corrigé la configuration sur Render, le déploiement devrait fonctionner.

