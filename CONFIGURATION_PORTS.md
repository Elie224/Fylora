# Configuration des Ports - Fylora

## ✅ Configuration Actuelle

### Backend
- **Port** : `5001`
- **Configuration** : `backend/config.js` → `port: process.env.PORT || process.env.SERVER_PORT || 5001`
- **Fichier .env** : `SERVER_PORT=5001`
- **Docker** : `SERVER_PORT: 5001` et `ports: "5001:5001"`
- **URL** : `http://localhost:5001`

### Frontend Web
- **Port** : `3001`
- **Configuration** : `frontend-web/vite.config.js` → `port: 3001`
- **URL** : `http://localhost:3001`

### Application Mobile
- **API Backend par défaut** : `http://localhost:5001`
- **Configuration** : `mobile-app/lib/utils/constants.dart` → `defaultValue: 'http://localhost:5001'`

## 📋 Fichiers Modifiés

### Backend
- ✅ `backend/config.js` : Port par défaut 5001
- ✅ `backend/.env` : `SERVER_PORT=5001`
- ✅ `docker-compose.yml` : `SERVER_PORT: 5001` et `ports: "5001:5001"`
- ✅ `backend/config.js` : URLs OAuth `localhost:5001`

### Frontend Web
- ✅ `frontend-web/vite.config.js` : Port 3001
- ✅ `frontend-web/src/config.js` : API URL `localhost:5001`
- ✅ `frontend-web/src/pages/Files.jsx` : URLs API `localhost:5001`
- ✅ `frontend-web/src/pages/Settings.jsx` : URLs API `localhost:5001`
- ✅ `frontend-web/src/pages/Preview.jsx` : URLs API `localhost:5001`
- ✅ `frontend-web/src/pages/Share.jsx` : URLs API `localhost:5001`
- ✅ `frontend-web/src/pages/Signup.jsx` : URLs API `localhost:5001`
- ✅ `frontend-web/src/pages/OAuthProxy.jsx` : URLs API `localhost:5001`

### Application Mobile
- ✅ `mobile-app/lib/utils/constants.dart` : API URL `localhost:5001`

### Docker
- ✅ `docker-compose.yml` : Backend port 5001, OAuth redirects vers 3001

### Documentation
- ✅ `README.md` : URLs mises à jour
- ✅ `INSTRUCTIONS_DEMARRAGE.md` : Ports corrigés
- ✅ `DEMARRAGE.md` : Ports corrigés
- ✅ `backend/OAUTH_SETUP.md` : Ports corrigés
- ✅ `backend/RESOLUTION_CONNEXION_MOBILE.md` : Ports corrigés
- ✅ `CORRECTIONS_APPLIQUEES.md` : Ports corrigés

## 🔍 Vérification

### Vérifier que le backend écoute sur 5001
```powershell
# Vérifier le port
netstat -an | findstr :5001

# Tester la connexion
curl http://localhost:5001/health
```

### Vérifier que le frontend écoute sur 3001
```powershell
# Vérifier le port
netstat -an | findstr :3001

# Ouvrir dans le navigateur
start http://localhost:3001
```

## 🚀 Démarrage

### Backend
```powershell
cd backend
npm run dev
# Devrait démarrer sur http://localhost:5001
```

### Frontend
```powershell
cd frontend-web
npm run dev
# Devrait démarrer sur http://localhost:3001
```

## ✅ URLs Finales

- **Backend API** : `http://localhost:5001`
- **Frontend Web** : `http://localhost:3001`
- **Health Check** : `http://localhost:5001/health`
- **API Info** : `http://localhost:5001/`

## 📝 Notes

- Les ports 5001 et 3001 sont configurés pour éviter les conflits avec d'autres services
- Toutes les références aux anciens ports (5000, 3000) ont été mises à jour
- La configuration est cohérente dans tout le projet





