# Instructions de Démarrage - Fylora

## ✅ État Actuel

- ✅ Base de données MongoDB : **Fylora** initialisée avec 7 collections
- ✅ Backend : En cours de démarrage sur le port 5001
- ✅ Code vérifié et corrigé

## 🚀 Démarrage de l'Application

### Étape 1 : Vérifier MongoDB

MongoDB doit être accessible sur `localhost:27017`

```powershell
# Vérifier MongoDB
Test-NetConnection -ComputerName localhost -Port 27017
```

Si MongoDB n'est pas démarré :
```powershell
net start MongoDB
```

### Étape 2 : Démarrer le Backend

**Terminal 1 - Backend :**
```powershell
cd backend
npm run dev
```

Le backend sera accessible sur : **http://localhost:5001**

### Étape 3 : Démarrer le Frontend

**Terminal 2 - Frontend :**
```powershell
cd frontend-web
npm run dev
```

Le frontend sera accessible sur : **http://localhost:3001**

## 📍 URLs de l'Application

- **Frontend Web** : http://localhost:3001
- **Backend API** : http://localhost:5001
- **Health Check** : http://localhost:5001/health
- **API Info** : http://localhost:5001/

## ✅ Vérification

1. Ouvrir http://localhost:5001/health dans votre navigateur
2. Vous devriez voir : `{"status":"OK","message":"Fylora API is running"}`
3. Ouvrir http://localhost:3001 pour accéder à l'interface web

## 📱 Application Mobile (Optionnel)

Pour lancer l'application mobile Flutter :

```powershell
cd mobile-app
flutter pub get
flutter run
```

## 🛑 Arrêt des Services

Pour arrêter les services :
- Appuyer sur `Ctrl+C` dans chaque terminal
- Ou fermer les fenêtres PowerShell

## 🔧 Configuration

### Variables d'environnement Backend

Le fichier `backend/.env` doit contenir :
```env
MONGO_URI=mongodb://localhost:27017/Fylora
JWT_SECRET=votre_secret_jwt
JWT_REFRESH_SECRET=votre_refresh_secret
```

### Variables d'environnement Frontend

Le fichier `frontend-web/.env` doit contenir :
```env
VITE_API_URL=http://localhost:5001
```

## 📝 Notes

- Le backend utilise la base de données **Fylora** (pas supfile)
- Toutes les collections sont initialisées et prêtes
- Le code a été vérifié et corrigé
- Les erreurs de syntaxe ont été corrigées







