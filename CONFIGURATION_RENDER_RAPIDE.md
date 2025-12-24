# ⚡ Configuration Rapide Render - Backend

## ✅ Configuration Actuelle

D'après votre écran Render, voici ce qui est déjà configuré :
- ✅ Repository : `Elie224/Fylora`
- ✅ Nom : `fylora-backend`
- ✅ Branche : `main`
- ✅ Région : Oregon
- ✅ Variable MONGODB_URI : Ajoutée

## 🔧 Corrections à Apporter

### 1. Langue : Changer "Docker" → "Node"

Dans la section "Langue", sélectionnez **"Node"** au lieu de "Docker".

### 2. Répertoire Racine : Ajouter `backend`

Dans la section "Répertoire racine", entrez :
```
backend
```

### 3. Commandes de Build et Start

Assurez-vous que ces commandes sont configurées :
- **Build Command** : `npm install`
- **Start Command** : `npm start`

### 4. Health Check Path (optionnel mais recommandé)

Ajoutez dans les paramètres avancés :
- **Health Check Path** : `/api/health`

## 🔐 Variables d'Environnement à Ajouter

Cliquez sur "Ajouter une variable d'environnement" pour chaque variable :

### Variables Obligatoires

1. **JWT_SECRET**
   - Valeur : Générez avec `node backend/scripts/generate-jwt-secrets.js`
   - Exemple : `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6`

2. **JWT_REFRESH_SECRET**
   - Valeur : Générez avec le même script (une valeur différente)
   - Exemple : `z9y8x7w6v5u4t3s2r1q0p9o8n7m6l5k4j3i2h1g0f9e8d7c6b5a4`

3. **NODE_ENV**
   - Valeur : `production`

4. **PORT**
   - Valeur : `5001`

5. **CORS_ORIGIN**
   - Valeur : `https://fylora-frontend.onrender.com`
   - ⚠️ Mettez à jour après avoir déployé le frontend

### Variables OAuth (si vous avez les identifiants)

6. **GOOGLE_CLIENT_ID**
   - Valeur : Votre Client ID Google

7. **GOOGLE_CLIENT_SECRET**
   - Valeur : Votre Client Secret Google

8. **GOOGLE_REDIRECT_URI**
   - Valeur : `https://fylora-backend.onrender.com/api/auth/google/callback`
   - ⚠️ Remplacez `fylora-backend` par le nom exact de votre service Render

9. **GITHUB_CLIENT_ID**
   - Valeur : Votre Client ID GitHub

10. **GITHUB_CLIENT_SECRET**
    - Valeur : Votre Client Secret GitHub

11. **GITHUB_REDIRECT_URI**
    - Valeur : `https://fylora-backend.onrender.com/api/auth/github/callback`
    - ⚠️ Remplacez `fylora-backend` par le nom exact de votre service Render

## 🚀 Déploiement

Une fois toutes les variables ajoutées :

1. Cliquez sur "Create Web Service" ou "Save Changes"
2. Render va automatiquement :
   - Cloner le repository
   - Installer les dépendances (`npm install`)
   - Démarrer le serveur (`npm start`)
3. Surveillez les logs pour vérifier que tout fonctionne

## ✅ Vérification Post-Déploiement

Après le déploiement, vérifiez :

1. **Health Check** : `https://fylora-backend.onrender.com/api/health`
   - Devrait retourner un JSON avec le statut

2. **Logs** : Dans Render Dashboard > Logs
   - Vous devriez voir : `✅ MongoDB connected`
   - Vous devriez voir : `✅ Server running on port 5001`

## 🐛 Problèmes Courants

### Le service ne démarre pas
- Vérifiez que "Langue" est bien "Node" et non "Docker"
- Vérifiez que "Répertoire racine" est `backend`
- Vérifiez les logs pour voir l'erreur exacte

### Erreur MongoDB
- Vérifiez que `MONGODB_URI` est correcte
- Vérifiez que l'accès réseau MongoDB Atlas autorise `0.0.0.0/0`

### Erreur JWT
- Vérifiez que `JWT_SECRET` et `JWT_REFRESH_SECRET` sont définis
- Assurez-vous qu'ils sont différents l'un de l'autre

## 📝 Checklist Finale

- [ ] Langue changée en "Node"
- [ ] Répertoire racine = `backend`
- [ ] Build Command = `npm install`
- [ ] Start Command = `npm start`
- [ ] MONGODB_URI ajoutée ✓
- [ ] JWT_SECRET ajouté
- [ ] JWT_REFRESH_SECRET ajouté
- [ ] NODE_ENV = `production`
- [ ] PORT = `5001`
- [ ] CORS_ORIGIN configuré (mise à jour après frontend)
- [ ] Variables OAuth ajoutées (si disponibles)
- [ ] Service déployé
- [ ] Health check fonctionne
- [ ] Logs vérifiés

---

**Une fois le backend déployé, vous pourrez déployer le frontend !** 🎉




