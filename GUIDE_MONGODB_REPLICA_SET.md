# 🗄️ Guide Configuration MongoDB Replica Set

## 🎯 Objectif
Configurer un Replica Set MongoDB pour redondance et haute disponibilité.

---

## 1. Architecture

```
Primary (Écritures)
    ↓
Secondary 1 (Lectures + Backup)
    ↓
Secondary 2 (Lectures + Backup)
```

**Bénéfices**:
- ✅ Redondance (pas de perte de données)
- ✅ Haute disponibilité (failover automatique)
- ✅ Scalabilité lecture (lectures distribuées)

---

## 2. Configuration MongoDB Atlas (Recommandé)

### A. Créer un Cluster

1. Aller sur [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Créer un cluster M0 (Free) ou M10+ (Production)
3. Choisir la région (ex: EU - Frankfurt)

### B. Configurer le Replica Set

1. **Network Access**:
   - Ajouter l'IP du serveur (ou 0.0.0.0/0 pour développement)
   - Whitelist Cloudflare IPs si CDN utilisé

2. **Database Access**:
   - Créer un utilisateur avec droits `readWrite`
   - Sauvegarder les credentials

3. **Connection String**:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/fylora?retryWrites=true&w=majority
   ```

---

## 3. Configuration Backend

### A. Connection String avec Replica Set

```javascript
// backend/models/db.js
const MONGODB_URI = process.env.MONGODB_URI || 
  'mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/fylora?retryWrites=true&w=majority';

const options = {
  // Replica Set options
  replicaSet: 'atlas-xxxxx-shard-0', // Auto-détecté depuis l'URI
  readPreference: 'secondaryPreferred', // Lire depuis secondary si disponible
  readConcern: { level: 'majority' },
  writeConcern: { w: 'majority', wtimeout: 5000 },
  
  // Connection pool
  maxPoolSize: 100,
  minPoolSize: 5,
  maxIdleTimeMS: 60000,
  
  // Retry
  retryWrites: true,
  retryReads: true,
  
  // Timeout
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 10000,
  socketTimeoutMS: 45000,
};
```

### B. Read Preference

```javascript
// Lire depuis secondary (réduit la charge sur primary)
const files = await FileModel.find({ owner_id: userId })
  .read('secondaryPreferred')
  .lean();
```

### C. Write Concern

```javascript
// Écriture avec confirmation de majorité
await FileModel.create({
  name: 'file.txt',
  // ...
}, {
  writeConcern: { w: 'majority', wtimeout: 5000 }
});
```

---

## 4. Configuration Self-Hosted (Avancé)

### A. Installation MongoDB

```bash
# Ubuntu/Debian
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org
```

### B. Configuration Replica Set

```yaml
# /etc/mongod.conf
storage:
  dbPath: /var/lib/mongodb
  journal:
    enabled: true

replication:
  replSetName: "rs0"

net:
  port: 27017
  bindIp: 0.0.0.0
```

### C. Initialiser le Replica Set

```javascript
// Se connecter à MongoDB
mongosh

// Initialiser le replica set
rs.initiate({
  _id: "rs0",
  members: [
    { _id: 0, host: "primary:27017" },
    { _id: 1, host: "secondary1:27017" },
    { _id: 2, host: "secondary2:27017" }
  ]
})

// Vérifier le statut
rs.status()
```

---

## 5. Failover Automatique

### A. Détection de Failover

MongoDB détecte automatiquement si le primary tombe et élit un nouveau primary.

### B. Gestion dans le Backend

```javascript
// backend/utils/mongodbMonitor.js
const mongoose = require('mongoose');

mongoose.connection.on('disconnected', () => {
  logger.logWarn('MongoDB disconnected, attempting reconnect...');
});

mongoose.connection.on('reconnected', () => {
  logger.logInfo('MongoDB reconnected');
});

mongoose.connection.on('error', (err) => {
  logger.logError(err, { context: 'mongodb_error' });
});
```

---

## 6. Monitoring

### A. MongoDB Atlas Monitoring

Surveiller:
- **Replication Lag**: Délai entre primary et secondary
- **Oplog Size**: Taille du oplog (doit être suffisant)
- **Connection Count**: Nombre de connexions actives

### B. Alertes

Configurer des alertes pour:
- Replication lag > 10 secondes
- Primary down
- Connection count > 80% du max

---

## 7. Backup

### A. MongoDB Atlas Backup

1. Activer **Cloud Backup** (disponible sur M10+)
2. Configurer des snapshots quotidiens
3. Rétention: 7 jours (minimum)

### B. Backup Manuel

```bash
# Backup
mongodump --uri="mongodb+srv://..." --out=/backup/$(date +%Y%m%d)

# Restore
mongorestore --uri="mongodb+srv://..." /backup/20240101
```

---

## 8. Performance

### A. Read Preference

- **primary**: Toujours lire depuis primary (cohérence forte)
- **primaryPreferred**: Primary si disponible, sinon secondary
- **secondary**: Toujours lire depuis secondary (réduit charge primary)
- **secondaryPreferred**: Secondary si disponible, sinon primary (recommandé)
- **nearest**: Le plus proche géographiquement

### B. Write Concern

- **w: 1**: Confirmation d'un seul serveur (rapide, moins sûr)
- **w: 'majority'**: Confirmation de la majorité (recommandé)
- **w: 'all'**: Confirmation de tous les serveurs (le plus sûr, plus lent)

---

## 9. Variables d'Environnement

```bash
# .env
MONGODB_URI=mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/fylora?retryWrites=true&w=majority
MONGODB_READ_PREFERENCE=secondaryPreferred
MONGODB_WRITE_CONCERN=majority
```

---

## 10. Checklist

- [ ] Cluster MongoDB Atlas créé (ou self-hosted configuré)
- [ ] Replica Set configuré (3 membres minimum)
- [ ] Network Access configuré
- [ ] Database Access configuré
- [ ] Connection string mis à jour dans backend
- [ ] Read preference configurée
- [ ] Write concern configurée
- [ ] Monitoring configuré
- [ ] Backup configuré
- [ ] Tests de failover effectués

---

## 11. Coûts

### MongoDB Atlas

- **M0 (Free)**: 512 MB storage, shared CPU
- **M10 (Production)**: $57/mois - 10 GB storage, 2 GB RAM
- **M20 (Production)**: $140/mois - 20 GB storage, 4 GB RAM

### Self-Hosted

- Coût serveurs uniquement
- Maintenance requise

---

**Status**: 🟢 **Prêt pour production avec Replica Set**

