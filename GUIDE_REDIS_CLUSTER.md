# 🔴 Guide Configuration Redis Cluster

## 🎯 Objectif
Configurer un Redis Cluster pour haute disponibilité et scalabilité.

---

## 1. Architecture

```
Redis Cluster (6 nœuds minimum)
    ↓
Master 1 (Slot 0-5460)
    ↓
Replica 1 (Backup Master 1)
    ↓
Master 2 (Slot 5461-10922)
    ↓
Replica 2 (Backup Master 2)
    ↓
Master 3 (Slot 10923-16383)
    ↓
Replica 3 (Backup Master 3)
```

**Bénéfices**:
- ✅ Haute disponibilité (failover automatique)
- ✅ Scalabilité horizontale
- ✅ Distribution des données (sharding)

---

## 2. Configuration Redis Cloud (Recommandé)

### A. Créer un Cluster

1. Aller sur [redis.com/cloud](https://redis.com/cloud)
2. Créer un cluster (Free tier disponible)
3. Choisir la région (ex: EU - Frankfurt)

### B. Configuration

1. **Memory**: 30 MB (Free) ou 1 GB+ (Production)
2. **Replication**: ✅ Activé (2 replicas par master)
3. **Persistence**: ✅ Activé (AOF + RDB)

---

## 3. Configuration Backend

### A. Connection avec Cluster

```javascript
// backend/utils/redisCache.js
const redis = require('redis');

// Option 1: Redis Cloud (recommandé)
const redisClient = redis.createClient({
  url: process.env.REDIS_URL, // redis://default:password@host:port
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 10) return new Error('Max reconnection attempts');
      return Math.min(retries * 100, 3000);
    },
    connectTimeout: 5000,
  },
});

// Option 2: Redis Cluster (self-hosted)
const clusterClient = redis.createCluster({
  rootNodes: [
    { host: 'redis-1.example.com', port: 6379 },
    { host: 'redis-2.example.com', port: 6379 },
    { host: 'redis-3.example.com', port: 6379 },
  ],
  defaults: {
    socket: {
      reconnectStrategy: (retries) => {
        if (retries > 10) return new Error('Max reconnection attempts');
        return Math.min(retries * 100, 3000);
      },
    },
  },
});
```

### B. Fallback Mémoire

```javascript
// Si Redis indisponible, utiliser cache mémoire
const memoryCache = new Map();
const memoryCacheTTL = new Map();

async function get(key) {
  try {
    if (redisClient && isConnected) {
      return await redisClient.get(key);
    }
  } catch (err) {
    logger.logWarn('Redis unavailable, using memory cache');
  }
  
  // Fallback mémoire
  if (memoryCache.has(key)) {
    const ttl = memoryCacheTTL.get(key);
    if (ttl && Date.now() < ttl) {
      return memoryCache.get(key);
    }
  }
  return null;
}
```

---

## 4. Configuration Self-Hosted (Avancé)

### A. Installation Redis

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y redis-server

# Ou compilation depuis source
wget https://download.redis.io/redis-stable.tar.gz
tar xvzf redis-stable.tar.gz
cd redis-stable
make
sudo make install
```

### B. Configuration Cluster

```bash
# Créer les répertoires
mkdir -p /etc/redis/cluster/{7000,7001,7002,7003,7004,7005}

# Configuration pour chaque nœud
# /etc/redis/cluster/7000/redis.conf
port 7000
cluster-enabled yes
cluster-config-file nodes-7000.conf
cluster-node-timeout 5000
appendonly yes
dir /var/lib/redis/cluster/7000
```

### C. Démarrer le Cluster

```bash
# Démarrer tous les nœuds
redis-server /etc/redis/cluster/7000/redis.conf
redis-server /etc/redis/cluster/7001/redis.conf
# ... etc

# Créer le cluster
redis-cli --cluster create \
  127.0.0.1:7000 127.0.0.1:7001 127.0.0.1:7002 \
  127.0.0.1:7003 127.0.0.1:7004 127.0.0.1:7005 \
  --cluster-replicas 1
```

---

## 5. Optimisations

### A. Persistence

```javascript
// Configuration Redis
// redis.conf
save 900 1      # Sauvegarder après 900s si 1+ clé modifiée
save 300 10     # Sauvegarder après 300s si 10+ clés modifiées
save 60 10000   # Sauvegarder après 60s si 10000+ clés modifiées

appendonly yes
appendfsync everysec
```

### B. Memory Management

```javascript
// Configuration maxmemory
// redis.conf
maxmemory 2gb
maxmemory-policy allkeys-lru  # Évincer les clés LRU si mémoire pleine
```

### C. Compression

```javascript
// Compresser les valeurs volumineuses
const zlib = require('zlib');

async function set(key, value, ttl = 300) {
  const compressed = zlib.gzipSync(JSON.stringify(value));
  await redisClient.setEx(key, ttl, compressed.toString('base64'));
}

async function get(key) {
  const compressed = await redisClient.get(key);
  if (!compressed) return null;
  const decompressed = zlib.gunzipSync(Buffer.from(compressed, 'base64'));
  return JSON.parse(decompressed.toString());
}
```

---

## 6. Monitoring

### A. Redis Cloud Monitoring

Surveiller:
- **Memory Usage**: Utilisation mémoire
- **Commands/sec**: Requêtes par seconde
- **Hit Rate**: Taux de cache hit
- **Latency**: Latence p95/p99

### B. Commandes Redis

```bash
# Info général
redis-cli INFO

# Info mémoire
redis-cli INFO memory

# Info cluster
redis-cli CLUSTER INFO
redis-cli CLUSTER NODES

# Stats
redis-cli --stat
```

---

## 7. Failover Automatique

### A. Sentinel (Self-Hosted)

```javascript
// Configuration Sentinel
// sentinel.conf
sentinel monitor mymaster 127.0.0.1 6379 2
sentinel down-after-milliseconds mymaster 5000
sentinel failover-timeout mymaster 10000
```

### B. Gestion dans le Backend

```javascript
// backend/utils/redisCache.js
redisClient.on('error', (err) => {
  logger.logError(err, { context: 'redis_error' });
  isConnected = false;
});

redisClient.on('reconnecting', () => {
  logger.logInfo('Redis reconnecting...');
});

redisClient.on('ready', () => {
  logger.logInfo('Redis ready');
  isConnected = true;
});
```

---

## 8. Variables d'Environnement

```bash
# .env
REDIS_URL=redis://default:password@host:port
REDIS_CLUSTER_MODE=false
REDIS_MAX_RETRIES=10
REDIS_CONNECT_TIMEOUT=5000
```

---

## 9. Checklist

- [ ] Cluster Redis créé (Cloud ou self-hosted)
- [ ] Replication configurée (2+ replicas)
- [ ] Persistence activée (AOF + RDB)
- [ ] Connection string mis à jour
- [ ] Fallback mémoire configuré
- [ ] Monitoring configuré
- [ ] Alertes configurées
- [ ] Tests de failover effectués
- [ ] Memory management configuré
- [ ] Compression activée (si nécessaire)

---

## 10. Coûts

### Redis Cloud

- **Free**: 30 MB, 1 database
- **Fixed ($5/mois)**: 100 MB, 1 database
- **Flexible ($10/mois)**: 1 GB, 1 database
- **Enterprise**: Sur mesure

### Self-Hosted

- Coût serveurs uniquement
- Maintenance requise

---

## 11. Résultats Attendus

### Avant Cluster
- Disponibilité: ~99% (single point of failure)
- Scalabilité: Limitée par un seul serveur
- Failover: Manuel

### Après Cluster
- Disponibilité: 99.9%+ (failover automatique)
- Scalabilité: Horizontale (ajout de nœuds)
- Failover: Automatique (< 5 secondes)

---

**Status**: 🟢 **Prêt pour production avec Redis Cluster**

