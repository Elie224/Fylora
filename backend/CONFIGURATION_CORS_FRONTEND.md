# 🔧 Configuration CORS pour le Frontend

## ⚠️ Important : Configuration CORS requise

Pour que le frontend (`https://fylor-frontend.onrender.com`) puisse communiquer avec le backend, vous devez configurer `CORS_ORIGIN` dans les variables d'environnement du backend.

## 📋 Configuration dans Render

### Étape 1 : Accéder aux variables d'environnement du backend

1. Allez sur votre [Render Dashboard](https://dashboard.render.com)
2. Ouvrez votre service backend (`fylora-backend` ou `fylora-1`)
3. Cliquez sur **"Environment"** dans le menu de gauche

### Étape 2 : Ajouter/modifier CORS_ORIGIN

1. Cherchez la variable `CORS_ORIGIN` ou cliquez sur **"Add Environment Variable"**
2. Configurez :
   - **Key** : `CORS_ORIGIN`
   - **Value** : `https://fylor-frontend.onrender.com`
   
   **Important** : 
   - SANS slash final (`/`)
   - Utilisez `https://` (pas `http://`)
   - URL exacte : `https://fylor-frontend.onrender.com`

3. Si vous avez plusieurs origines (ex: frontend + mobile), séparez par des virgules :
   ```
   https://fylor-frontend.onrender.com,https://autre-domaine.com
   ```

4. Cliquez sur **"Save Changes"**

### Étape 3 : Redéployer

Render redéploiera automatiquement votre backend après avoir sauvegardé les variables d'environnement.

## ✅ Vérification

Après le redéploiement, testez :

1. Ouvrez `https://fylor-frontend.onrender.com` dans votre navigateur
2. Essayez de vous connecter
3. Si vous voyez des erreurs CORS dans la console du navigateur, vérifiez que :
   - `CORS_ORIGIN` contient exactement `https://fylor-frontend.onrender.com`
   - Il n'y a pas d'espace avant/après
   - Il n'y a pas de slash final

## 🔍 Dépannage CORS

### Erreur : "CORS blocked origin"

**Solution** :
1. Vérifiez que `CORS_ORIGIN` dans Render contient exactement : `https://fylor-frontend.onrender.com`
2. Vérifiez les logs du backend pour voir quelle origine est bloquée
3. Redéployez le backend après avoir modifié `CORS_ORIGIN`

### Erreur : "No 'Access-Control-Allow-Origin' header"

**Solution** :
1. Vérifiez que `CORS_ORIGIN` est bien défini dans Render
2. Vérifiez que l'URL est exacte (sans slash final)
3. Redéployez le backend

## 📝 Notes

- Le backend autorise automatiquement les requêtes sans origine (health checks, etc.)
- En développement local, toutes les origines localhost sont autorisées automatiquement
- En production, seules les origines définies dans `CORS_ORIGIN` sont autorisées

