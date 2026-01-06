# 🔍 Guide Configuration ElasticSearch

## 📋 Vue d'ensemble

ElasticSearch est utilisé pour la recherche avancée dans Fylora :
- Recherche full-text ultra-rapide (< 100ms)
- Autocomplétion
- Recherche sémantique (futur)
- Indexation du contenu OCR

---

## 🚀 Options de Déploiement

### Option 1 : ElasticSearch Cloud (Recommandé)

**Avantages** :
- ✅ Gestion automatique
- ✅ Scaling automatique
- ✅ Backup inclus
- ✅ Monitoring intégré

**Fournisseurs** :
- [Elastic Cloud](https://www.elastic.co/cloud) - Service officiel
- [AWS Elasticsearch Service](https://aws.amazon.com/elasticsearch-service/)
- [Bonsai](https://bonsai.io/) - Simple et abordable

**Prix** : À partir de ~$16/mois

---

### Option 2 : Self-Hosted (Avancé)

**Sur Render** :
- Créer un nouveau service "Background Worker"
- Utiliser l'image Docker : `docker.elastic.co/elasticsearch/elasticsearch:8.11.0`
- Variables d'environnement :
  ```bash
  discovery.type=single-node
  xpack.security.enabled=false
  ```

**Sur VPS** :
```bash
# Installer ElasticSearch
wget https://artifacts.elastic.co/downloads/elasticsearch/elasticsearch-8.11.0-linux-x86_64.tar.gz
tar -xzf elasticsearch-8.11.0-linux-x86_64.tar.gz
cd elasticsearch-8.11.0

# Démarrer
./bin/elasticsearch
```

---

## ⚙️ Configuration dans Fylora

### 1. Variables d'Environnement

Ajouter dans Render Dashboard :

```bash
ELASTICSEARCH_URL=https://your-cluster.es.region.cloud.es.io:9243
```

**Format** :
- Cloud : `https://cluster-id.region.cloud.es.io:9243`
- Self-hosted : `http://localhost:9200`
- Avec auth : `https://user:password@cluster-id.region.cloud.es.io:9243`

---

### 2. Vérification

Une fois configuré, vérifier les logs backend :

```
✅ ElasticSearch search service initialized
```

Si non configuré :
```
ElasticSearch not available, using MongoDB fallback
```

---

## 🔧 Indexation des Fichiers

### Automatique

Les fichiers sont automatiquement indexés lors de :
- Upload de fichier
- OCR processing (`/api/intelligence/ocr/:fileId`)
- Mise à jour de fichier

### Manuelle

```javascript
const searchService = require('./services/searchService');

await searchService.indexFile({
  id: fileId,
  name: fileName,
  mime_type: mimeType,
  owner_id: userId,
  content: ocrText, // Texte extrait par OCR
});
```

---

## 🔍 Utilisation

### Recherche Simple

```javascript
const results = await searchService.search('document', userId, {
  limit: 20,
  offset: 0,
});
```

### Autocomplétion

```javascript
const suggestions = await searchService.autocomplete('doc', userId, 10);
```

---

## 📊 Monitoring

### Vérifier l'Index

```bash
curl -X GET "localhost:9200/fylora_files/_count"
```

### Statistiques

```bash
curl -X GET "localhost:9200/fylora_files/_stats"
```

---

## 🛠️ Maintenance

### Réindexer tous les fichiers

```javascript
// Script à créer : backend/scripts/reindexAll.js
const FileModel = require('../models/fileModel');
const searchService = require('../services/searchService');

async function reindexAll() {
  const files = await FileModel.findByOwner(userId);
  for (const file of files) {
    await searchService.indexFile(file);
  }
}
```

### Nettoyer l'Index

```bash
curl -X DELETE "localhost:9200/fylora_files"
```

L'index sera recréé automatiquement au prochain indexage.

---

## 🎯 Performance

### Optimisations

1. **Shards** : 1 shard pour < 1M documents
2. **Replicas** : 0 en développement, 1+ en production
3. **Refresh** : 1s par défaut (augmenter pour moins de charge)

### Monitoring

- Latence de recherche : < 100ms
- Taux de cache : > 80%
- Taille d'index : Surveiller la croissance

---

## 🔒 Sécurité

### Authentification

Si ElasticSearch Cloud :
- Utiliser les credentials fournis
- Format URL : `https://user:password@cluster.es.io:9243`

### TLS

ElasticSearch Cloud utilise TLS par défaut. Pour self-hosted :

```bash
# Générer certificats
./bin/elasticsearch-certutil ca
./bin/elasticsearch-certutil cert --ca elastic-stack-ca.p12
```

---

## 📝 Notes

- **Fallback** : Si ElasticSearch n'est pas disponible, Fylora utilise MongoDB (plus lent mais fonctionnel)
- **Coûts** : ElasticSearch Cloud peut être coûteux à grande échelle. Considérer self-hosted pour > 10M documents
- **Alternatives** : Meilisearch, Typesense (plus légers, moins de features)

---

## ✅ Checklist

- [ ] ElasticSearch déployé (Cloud ou Self-hosted)
- [ ] `ELASTICSEARCH_URL` configuré dans Render
- [ ] Backend redémarré
- [ ] Logs vérifiés : "ElasticSearch search service initialized"
- [ ] Test de recherche effectué
- [ ] Indexation automatique vérifiée

---

**Fylora fonctionne sans ElasticSearch, mais la recherche sera plus lente (MongoDB fallback).**

