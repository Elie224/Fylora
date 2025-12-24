# 🚀 Guide de Déploiement Frontend sur Render

Ce guide explique comment déployer le frontend Fylora sur Render.

## 📋 Prérequis

- Un compte Render
- Le backend déjà déployé sur Render (https://fylora-1.onrender.com)
- Accès au dépôt GitHub

## 🚀 Méthode 1 : Déploiement via render.yaml (Recommandé)

Le fichier `render.yaml` à la racine du projet contient déjà la configuration du frontend.

### Étape 1 : Vérifier la configuration

Le fichier `render.yaml` contient :
```yaml
  # Frontend Static Site
  - type: web
    name: fylora-frontend
    env: static
    region: frankfurt
    plan: free
    rootDir: frontend-web
    buildCommand: npm install && npm run build
    staticPublishPath: dist
    envVars:
      - key: VITE_API_URL
        value: https://fylora-1.onrender.com
```

### Étape 2 : Déployer via Render Dashboard

1. Allez sur [Render Dashboard](https://dashboard.render.com)
2. Cliquez sur **"New +"** → **"Blueprint"**
3. Connectez votre dépôt GitHub
4. Render détectera automatiquement le `render.yaml` et créera les services

## 🚀 Méthode 2 : Déploiement manuel

### Étape 1 : Créer un nouveau service Static Site

1. Allez sur [Render Dashboard](https://dashboard.render.com)
2. Cliquez sur **"New +"** → **"Static Site"**

### Étape 2 : Configurer le service

1. **Connecter le dépôt** :
   - Sélectionnez votre dépôt GitHub `Elie224/Fylora`
   - Branche : `main`

2. **Configuration de base** :
   - **Name** : `fylora-frontend`
   - **Root Directory** : `frontend-web`
   - **Build Command** : `npm install && npm run build`
   - **Publish Directory** : `dist`

3. **Variables d'environnement** :
   - Cliquez sur **"Advanced"** → **"Add Environment Variable"**
   - **Key** : `VITE_API_URL`
   - **Value** : `https://fylora-1.onrender.com`
   - Cliquez sur **"Save"**

### Étape 3 : Déployer

1. Cliquez sur **"Create Static Site"**
2. Render va automatiquement :
   - Installer les dépendances (`npm install`)
   - Builder l'application (`npm run build`)
   - Déployer le dossier `dist`

## ✅ Vérification

Après le déploiement, vous devriez avoir :
- URL du frontend : `https://fylora-frontend.onrender.com`
- Le frontend pointe vers le backend : `https://fylora-1.onrender.com`

## 🔧 Configuration des variables d'environnement

### Variables requises :

| Variable | Valeur | Description |
|----------|--------|-------------|
| `VITE_API_URL` | `https://fylora-1.onrender.com` | URL du backend API |

### Comment ça fonctionne :

1. **Build time** : Vite remplace `import.meta.env.VITE_API_URL` par la valeur de la variable d'environnement
2. **Runtime** : L'application utilise cette URL pour toutes les requêtes API

## 🔍 Vérifier que le build fonctionne

Vous pouvez tester le build localement :

```bash
cd frontend-web
VITE_API_URL=https://fylora-1.onrender.com npm run build
```

Le dossier `dist` sera créé avec les fichiers compilés.

## 🐛 Dépannage

### Le frontend ne se connecte pas au backend

1. Vérifiez que `VITE_API_URL` est correctement défini dans Render
2. Vérifiez que l'URL du backend est accessible : `https://fylora-1.onrender.com/health`
3. Vérifiez les logs de build dans Render pour voir si `VITE_API_URL` est utilisé

### Erreur CORS

Si vous voyez des erreurs CORS :
1. Vérifiez que `CORS_ORIGIN` dans le backend inclut l'URL du frontend
2. Ajoutez `https://fylora-frontend.onrender.com` dans `CORS_ORIGIN` du backend

### Le build échoue

1. Vérifiez les logs de build dans Render
2. Testez le build localement : `npm run build`
3. Vérifiez que toutes les dépendances sont dans `package.json`

## 📝 Notes importantes

1. **Variables d'environnement** : Les variables `VITE_*` doivent être définies **avant** le build, pas à l'exécution
2. **Build** : Le build est fait une seule fois au déploiement, pas à chaque requête
3. **Cache** : Render met en cache les builds, vous devrez peut-être forcer un nouveau déploiement si vous changez les variables

## 🎯 Résultat attendu

Une fois déployé, vous devriez avoir :
- ✅ Frontend accessible sur `https://fylora-frontend.onrender.com`
- ✅ Frontend connecté au backend `https://fylora-1.onrender.com`
- ✅ Authentification fonctionnelle
- ✅ Toutes les fonctionnalités opérationnelles

