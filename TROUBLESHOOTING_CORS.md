# Guide de Dépannage - Erreurs CORS et Rate Limiting

## 🔍 Problèmes Identifiés

### 1. Erreur CORS : "Access-Control-Allow-Origin est manquant"
**Symptôme** : `Blocage d'une requête multiorigines (Cross-Origin Request)`

**Cause** : Le backend bloque les requêtes depuis le frontend car l'origine n'est pas autorisée.

**Solution** : 
- ✅ **Corrigé** : La configuration CORS a été mise à jour pour autoriser toutes les origines `localhost` en développement
- Le backend autorise maintenant automatiquement toutes les origines `localhost` avec n'importe quel port

### 2. Erreur 429 : Rate Limiting
**Symptôme** : `Code d'état : 429` (Too Many Requests)

**Cause** : Le rate limiter bloque les requêtes après 100 requêtes par 15 minutes.

**Solution** :
- ✅ **Corrigé** : Les limites ont été augmentées pour le développement :
  - Production : 100 requêtes / 15 minutes
  - Développement : 1000 requêtes / 15 minutes
- Vous pouvez désactiver complètement le rate limiting en développement en ajoutant `DISABLE_RATE_LIMIT=true` dans votre `.env`

### 3. Token manquant
**Symptôme** : `No access token found in localStorage`

**Cause** : L'utilisateur n'est pas connecté ou la session a expiré.

**Solution** :
- Connectez-vous via `/login`
- Vérifiez que le token est bien stocké dans `localStorage` (F12 > Application > Local Storage)

## 🛠️ Configuration

### Backend (.env)

```env
# Port du serveur (par défaut 5001)
SERVER_PORT=5001
# ou
PORT=5001

# Environnement
NODE_ENV=development

# Désactiver le rate limiting en développement (optionnel)
DISABLE_RATE_LIMIT=true

# CORS (optionnel, par défaut autorise tous les localhost)
CORS_ORIGIN=http://localhost:3001,http://127.0.0.1:3001
```

### Frontend (.env)

```env
# URL de l'API backend
VITE_API_URL=http://localhost:5001
```

## 🔄 Redémarrer les Services

Après avoir modifié les fichiers de configuration :

1. **Arrêter le backend** : `Ctrl+C` dans le terminal backend
2. **Redémarrer le backend** :
   ```powershell
   cd backend
   npm run dev
   ```

3. **Redémarrer le frontend** (si nécessaire) :
   ```powershell
   cd frontend-web
   npm run dev
   ```

## ✅ Vérification

1. **Vérifier que le backend écoute sur le bon port** :
   ```powershell
   # Devrait retourner {"status":"OK",...}
   curl http://localhost:5001/health
   ```

2. **Vérifier CORS** :
   - Ouvrez la console du navigateur (F12)
   - Les erreurs CORS ne devraient plus apparaître
   - Les requêtes devraient passer avec le statut 200

3. **Vérifier le rate limiting** :
   - En développement, vous pouvez faire beaucoup de requêtes sans être bloqué
   - Si vous êtes bloqué, attendez 15 minutes ou redémarrez le backend

## 🐛 Dépannage Avancé

### Si les erreurs persistent :

1. **Vider le cache du navigateur** :
   - `Ctrl+Shift+Delete` > Cocher "Cache" > Effacer

2. **Vérifier les ports** :
   ```powershell
   # Vérifier quel processus utilise le port 5001
   netstat -ano | findstr :5001
   ```

3. **Vérifier les logs du backend** :
   - Regardez les logs dans le terminal backend
   - Cherchez les messages "CORS blocked origin" ou "Rate limit exceeded"

4. **Réinitialiser le rate limiting** :
   - Redémarrer le backend réinitialise les compteurs de rate limiting

## 📝 Notes

- Les modifications apportées sont **sécurisées pour le développement uniquement**
- En production, les limites de rate limiting et CORS restent strictes
- Assurez-vous de ne pas commiter le fichier `.env` avec `DISABLE_RATE_LIMIT=true` en production





