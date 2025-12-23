# Guide de Démarrage - Fylora

## Prérequis

1. **MongoDB** doit être démarré sur `localhost:27017`
2. **Node.js** (v18+) installé
3. Les dépendances installées (`npm install` dans chaque dossier)

## Démarrage Rapide

### Option 1 : Script Automatique

```powershell
powershell -ExecutionPolicy Bypass -File demarrer.ps1
```

### Option 2 : Démarrage Manuel

#### 1. Vérifier MongoDB

```powershell
# Vérifier que MongoDB est accessible
Test-NetConnection -ComputerName localhost -Port 27017
```

Si MongoDB n'est pas démarré :
```powershell
# Option A : Service Windows
net start MongoDB

# Option B : Docker
docker compose up -d db
```

#### 2. Initialiser la base de données (si nécessaire)

```powershell
cd backend
node scripts/init-fylora-db.js
```

#### 3. Démarrer le Backend

Dans un terminal PowerShell :
```powershell
cd backend
npm run dev
```

Le backend sera accessible sur : **http://localhost:5001**

#### 4. Démarrer le Frontend

Dans un autre terminal PowerShell :
```powershell
cd frontend-web
npm run dev
```

Le frontend sera accessible sur : **http://localhost:3001**

## URLs

- **Backend API** : http://localhost:5001
- **Frontend Web** : http://localhost:3001
- **API Health Check** : http://localhost:5001/health
- **API Documentation** : http://localhost:5001/

## Vérification

Une fois démarré, vous pouvez vérifier que tout fonctionne :

1. Ouvrir http://localhost:5001/health dans votre navigateur
2. Vous devriez voir : `{"status":"OK","message":"Fylora API is running"}`

## Application Mobile

Pour l'application mobile Flutter :

```powershell
cd mobile-app
flutter pub get
flutter run
```

## Arrêt des Services

Pour arrêter les services :
- Fermer les fenêtres PowerShell où les services tournent
- Ou utiliser `Ctrl+C` dans chaque terminal

## Dépannage

### MongoDB non accessible
- Vérifier que MongoDB est démarré : `net start MongoDB`
- Vérifier le port : `netstat -an | findstr 27017`

### Port déjà utilisé
- Backend (5001) : Changer `SERVER_PORT` dans `.env`
- Frontend (3001) : Changer dans `vite.config.js`

### Erreurs de dépendances
```powershell
cd backend
npm install

cd ../frontend-web
npm install
```







