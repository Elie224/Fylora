# 🚀 Démarrer le Serveur Backend en Local

## 📋 Prérequis

1. **Node.js** installé (v18+ recommandé)
2. **MongoDB** accessible (local ou MongoDB Atlas)
3. **Variables d'environnement** configurées

## ⚙️ Configuration

### 1. Créer le fichier `.env`

Créer un fichier `.env` dans le répertoire `backend/`:

```env
# Serveur
NODE_ENV=development
PORT=5001
SERVER_HOST=0.0.0.0

# MongoDB
MONGODB_URI=mongodb://localhost:27017/fylora
# Ou MongoDB Atlas:
# MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/fylora

# JWT
JWT_SECRET=your-secret-key-change-in-production
JWT_REFRESH_SECRET=your-refresh-secret-key

# Redis (optionnel - pour cache)
REDIS_URL=redis://localhost:6379
# Ou laisser vide pour utiliser cache mémoire

# Cloudinary (optionnel - pour stockage)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Frontend URL (pour CORS)
FRONTEND_URL=http://localhost:3001
```

### 2. Installer les dépendances

```bash
cd backend
npm install
```

## 🚀 Démarrer le Serveur

### Option 1: Mode Production (recommandé pour tests)

```bash
cd backend
npm start
```

### Option 2: Mode Développement (avec rechargement auto)

```bash
cd backend
npm run dev
```

### Option 3: Avec nodemon (si installé)

```bash
cd backend
npx nodemon server.js
```

## ✅ Vérifier que le Serveur est Démarré

### 1. Vérifier le Health Check

```bash
curl http://localhost:5001/health
```

**Réponse attendue**:
```json
{
  "status": "OK",
  "message": "Fylora API is running",
  "timestamp": "2024-01-06T12:00:00.000Z",
  "port": 5001
}
```

### 2. Vérifier la Page d'Accueil

Ouvrir dans le navigateur: `http://localhost:5001/`

## 📊 Logs du Serveur

Le serveur affichera des logs comme:

```
✅ MongoDB ready
✅ Redis cache connected
✅ Cloudinary storage service initialized
✅ Event Bus initialized (Redis Streams)
Fylora API listening on http://0.0.0.0:5001
Port 5001 is now listening
```

## 🔧 Dépannage

### Erreur: Port déjà utilisé

```bash
# Windows
netstat -ano | findstr :5001
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:5001 | xargs kill -9
```

### Erreur: MongoDB non accessible

Vérifier que MongoDB est démarré:

```bash
# Windows (si MongoDB est installé localement)
# Démarrer MongoDB Service depuis Services

# Linux/Mac
sudo systemctl start mongod
# ou
mongod
```

### Erreur: Variables d'environnement manquantes

Vérifier que le fichier `.env` existe et contient toutes les variables nécessaires.

## 🧪 Tester avec les Tests de Charge

Une fois le serveur démarré, dans un autre terminal:

```bash
cd backend/tests
node loadTest.js --scenario=upload --concurrent=10
```

## 📝 Commandes Utiles

### Arrêter le Serveur

Appuyer sur `Ctrl + C` dans le terminal où le serveur tourne.

### Voir les Logs en Temps Réel

Les logs sont affichés dans la console. Pour les sauvegarder:

```bash
npm start > logs/server.log 2>&1
```

### Redémarrer le Serveur

```bash
# Arrêter (Ctrl + C) puis redémarrer
npm start
```

## 🎯 Prochaines Étapes

1. ✅ Serveur démarré sur `http://localhost:5001`
2. ✅ Health check fonctionne
3. 🧪 Exécuter les tests de charge
4. 📊 Analyser les résultats

---

**Status**: 🟢 **Serveur prêt pour les tests**

