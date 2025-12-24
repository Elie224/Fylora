# 🚀 Guide Complet : Déployer le Frontend en Static Site sur Render

## 📋 Étape par Étape

### Étape 1 : Créer un nouveau Static Site

1. Allez sur [Render Dashboard](https://dashboard.render.com)
2. Cliquez sur **"+ Nouveau"** (en haut à droite)
3. Sélectionnez **"Static Site"** dans le menu

### Étape 2 : Connecter le Dépôt GitHub

1. **Connecter le dépôt** :
   - Si c'est la première fois : Cliquez sur **"Connect account"** et autorisez Render
   - Sélectionnez votre dépôt : **`Elie224/Fylora`**
   - Branche : **`main`** (ou la branche principale)

### Étape 3 : Configurer le Service

Remplissez les champs suivants :

#### Configuration de base :
- **Name** : `fylor-frontend`
- **Region** : Choisissez la même région que votre backend (ex: `Oregon` ou `Frankfurt`)
- **Branch** : `main` (ou votre branche principale)

#### Configuration du build :
- **Root Directory** : `frontend-web`
  - ⚠️ **Important** : C'est le dossier qui contient `package.json` du frontend
  
- **Build Command** : 
  ```
  npm install && npm run build
  ```
  
- **Publish Directory** : `dist`
  - ⚠️ **Important** : C'est le dossier créé par Vite après le build

### Étape 4 : Configurer les Variables d'Environnement

1. Cliquez sur **"Advanced"** pour voir plus d'options
2. Dans **"Environment Variables"**, cliquez sur **"Add Environment Variable"**
3. Ajoutez :
   - **Key** : `VITE_API_URL`
   - **Value** : `https://fylora-1.onrender.com`
   - ⚠️ **Important** : 
     - Pas de slash final (`/`)
     - Utilisez `https://` (pas `http://`)
     - URL exacte du backend

### Étape 5 : Créer le Service

1. Cliquez sur **"Create Static Site"**
2. Render va automatiquement :
   - Cloner le dépôt
   - Installer les dépendances (`npm install`)
   - Builder l'application (`npm run build`)
   - Déployer le dossier `dist`

### Étape 6 : Attendre le Déploiement

1. Vous verrez les logs de build en temps réel
2. Le statut passera de **"Building"** à **"Live"** une fois terminé
3. L'URL du site sera affichée en haut : `https://fylor-frontend.onrender.com`

## ✅ Vérification

### Vérifier que le build fonctionne :

Dans les logs, vous devriez voir :
```
> vite build
✓ built in Xs
```

### Vérifier l'URL :

1. Une fois déployé, cliquez sur l'URL affichée
2. Le frontend devrait se charger
3. Ouvrez la console du navigateur (F12) pour vérifier qu'il n'y a pas d'erreurs

## 🔧 Configuration CORS dans le Backend

**IMPORTANT** : Après avoir déployé le frontend, vous devez configurer CORS dans le backend :

1. Allez sur votre service backend (`Fylora-1`)
2. Cliquez sur **"Environment"**
3. Ajoutez/modifiez :
   - **Key** : `CORS_ORIGIN`
   - **Value** : `https://fylor-frontend.onrender.com`
4. Sauvegardez → Render redéploiera automatiquement

## 🐛 Dépannage

### Le build échoue

**Erreur : "Root Directory not found"**
- Vérifiez que **Root Directory** = `frontend-web` (pas `frontend-web/`)

**Erreur : "Build command failed"**
- Vérifiez les logs pour voir l'erreur exacte
- Testez le build localement : `cd frontend-web && npm run build`

**Erreur : "Publish Directory not found"**
- Vérifiez que **Publish Directory** = `dist`
- Vérifiez que le build crée bien le dossier `dist`

### Le site ne se charge pas

1. Vérifiez les logs du service
2. Vérifiez que `VITE_API_URL` est correctement défini
3. Vérifiez la console du navigateur pour les erreurs

### Erreurs CORS

1. Vérifiez que `CORS_ORIGIN` dans le backend contient l'URL exacte du frontend
2. Redéployez le backend après avoir modifié `CORS_ORIGIN`

## 📝 Résumé de la Configuration

| Paramètre | Valeur |
|-----------|--------|
| **Name** | `fylor-frontend` |
| **Type** | Static Site |
| **Root Directory** | `frontend-web` |
| **Build Command** | `npm install && npm run build` |
| **Publish Directory** | `dist` |
| **VITE_API_URL** | `https://fylora-1.onrender.com` |

## 🎯 Résultat Attendu

Une fois déployé :
- ✅ Frontend accessible sur : `https://fylor-frontend.onrender.com`
- ✅ Frontend connecté au backend : `https://fylora-1.onrender.com`
- ✅ Authentification fonctionnelle
- ✅ Toutes les fonctionnalités opérationnelles

