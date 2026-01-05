# 🏗️ Architecture de Niveau Industrie - Fylora

## 🎯 Objectif

Transformer Fylora en une plateforme de stockage cloud de niveau Google Drive :
- **Millions d'utilisateurs**
- **1 To par utilisateur**
- **Fichiers lourds (plusieurs Go)**
- **Performance instantanée**

---

## 🧱 Architecture Globale

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                      │
│  - Upload direct vers S3 (URLs signées)                  │
│  - Download direct depuis S3                              │
│  - Cache agressif                                         │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                  API GATEWAY                             │
│  - Rate limiting                                         │
│  - Authentication                                        │
│  - Routing vers services                                 │
└────────────────────┬────────────────────────────────────┘
                     │
     ┌───────────────┼───────────────┐
     │               │               │
┌────▼────┐   ┌─────▼─────┐   ┌─────▼─────┐
│  Auth   │   │   File    │   │  Sharing  │
│ Service │   │  Metadata │   │  Service  │
└─────────┘   └───────────┘   └───────────┘
     │               │               │
     └───────────────┼───────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│              OBJECT STORAGE (S3)                        │
│  - Fichiers réels                                        │
│  - URLs signées temporaires                              │
│  - CDN devant                                            │
└─────────────────────────────────────────────────────────┘
```

---

## 📦 Services (Architecture Domain-Driven)

### 1. Auth Service
- Authentification
- Sessions
- 2FA
- OAuth

### 2. File Metadata Service
- Métadonnées fichiers
- Versions
- Dossiers
- Quota

### 3. Sharing Service
- Partage public/interne
- Permissions
- URLs signées

### 4. Search Service
- ElasticSearch
- Recherche instantanée
- Autocomplétion

### 5. AI Service
- OCR
- Analyse
- Recommandations

### 6. Notification Service
- Notifications temps réel
- Webhooks

---

## 💾 Stockage

### Object Storage (S3)
- **AWS S3** ou **MinIO** (self-hosted)
- Upload/Download direct
- URLs signées
- Versioning
- Lifecycle policies

### MongoDB
- Métadonnées uniquement
- Index optimisés
- Sharding pour scale

### Redis
- Cache métadonnées
- Sessions
- Quotas
- Locks

### ElasticSearch
- Recherche
- Indexation contenu
- Autocomplétion

---

## 🔄 Flow Upload

```
1. Client → API: "Je veux uploader un fichier de 2 Go"
2. API vérifie:
   - Quota disponible
   - Droits utilisateur
   - Type de fichier autorisé
3. API génère URL signée S3 (POST, 1h expiration)
4. Client upload DIRECTEMENT vers S3 (chunké)
5. S3 notifie API via webhook (ou polling)
6. API enregistre métadonnées dans MongoDB
7. API indexe dans ElasticSearch (async)
8. API traite OCR/AI (queue)
```

---

## 🔄 Flow Download

```
1. Client → API: "Je veux télécharger ce fichier"
2. API vérifie:
   - Permissions
   - Fichier existe
3. API génère URL signée S3 (GET, 15min expiration)
4. Client télécharge DIRECTEMENT depuis S3
5. API log l'accès (audit)
```

---

## 📊 Gestion Quota

### Table MongoDB
```javascript
{
  user_id: ObjectId,
  used_bytes: Number,  // Mis à jour async
  limit_bytes: Number, // 1 To = 1099511627776
  last_sync: Date
}
```

### Cache Redis
```
quota:{userId} → { used: 1234567890, limit: 1099511627776 }
TTL: 5 minutes
```

### Mise à jour
- **Sync immédiate** : Après upload/suppression
- **Sync périodique** : Toutes les heures (vérification)
- **Hard limit** : Bloque upload si quota atteint

---

## 🔍 Recherche (ElasticSearch)

### Index
```javascript
{
  file_id: String,
  name: String,
  content: String,      // OCR
  tags: [String],
  owner_id: String,
  mime_type: String,
  created_at: Date,
  updated_at: Date
}
```

### Requêtes
- Recherche full-text
- Filtres (type, date, taille)
- Autocomplétion
- Recherche naturelle

---

## ⚡ Performance

### Cache Strategy
- **Métadonnées** : Redis (5min TTL)
- **Quotas** : Redis (5min TTL)
- **Dashboard** : Redis (5min TTL)
- **Recherche** : ElasticSearch (index optimisé)

### Compression
- Brotli pour API responses
- Images compressées automatiquement
- CDN pour assets statiques

---

## 🔐 Sécurité

### Chiffrement
- **Au repos** : S3 encryption (SSE)
- **En transit** : HTTPS/TLS
- **URLs signées** : Expiration courte (15min-1h)

### Audit
- Logs d'accès fichiers
- Logs d'upload/download
- Détection activité suspecte

---

## 📈 Monitoring

### Métriques
- Temps d'upload/download
- Taux d'erreur
- Latence API
- Consommation storage
- Quota utilisé

### Logs
- Structured logging (JSON)
- Niveaux (info, warn, error)
- Traces distribuées

---

## 🚀 Roadmap Implémentation

### Phase 1 : Object Storage
1. Configurer S3/MinIO
2. Service de génération URLs signées
3. Upload direct depuis frontend
4. Download direct depuis frontend

### Phase 2 : Architecture Services
1. Refactoriser en services
2. Domain logic séparé
3. Interfaces claires

### Phase 3 : Upload Chunké
1. Multipart upload
2. Reprise sur erreur
3. Hash SHA-256

### Phase 4 : ElasticSearch
1. Configuration ES
2. Indexation fichiers
3. Recherche optimisée

### Phase 5 : Monitoring
1. Métriques
2. Logs structurés
3. Alertes

