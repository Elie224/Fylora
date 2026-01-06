# 🧪 Tests de Charge - Fylora

## 📋 Prérequis

1. **Serveur backend démarré** (local ou production)
2. **Node.js** installé
3. **Dépendances** installées

## 🚀 Installation

```bash
cd backend/tests
npm install
```

## ⚙️ Configuration

### Variables d'environnement

```bash
# URL de l'API (local ou production)
export API_URL=https://fylora-1.onrender.com
# ou pour local
export API_URL=http://localhost:5001

# Credentials de test
export TEST_EMAIL=test@fylora.com
export TEST_PASSWORD=Test1234!
```

### Fichier .env (optionnel)

Créer un fichier `.env` dans `backend/tests/`:

```env
API_URL=https://fylora-1.onrender.com
TEST_EMAIL=test@fylora.com
TEST_PASSWORD=Test1234!
```

## 🧪 Exécution des Tests

### 1. Test Upload Simultané

```bash
# 10 uploads (test rapide)
node loadTest.js --scenario=upload --concurrent=10

# 1000 uploads (test complet)
node loadTest.js --scenario=upload --concurrent=1000

# Ou avec npm
npm run test:upload
```

### 2. Test Lecture Massif

```bash
# 10,000 lectures (test rapide)
node loadTest.js --scenario=read --requests=10000

# 100,000 lectures (test complet)
node loadTest.js --scenario=read --requests=100000

# Ou avec npm
npm run test:read
```

### 3. Test Mixte

```bash
# 50 requêtes mixte (test rapide)
node loadTest.js --scenario=mixed --concurrent=50

# 500 requêtes mixte (test complet)
node loadTest.js --scenario=mixed --concurrent=500

# Ou avec npm
npm run test:mixed
```

### 4. Tous les Tests

```bash
npm run test:all
```

## 📊 Résultats

Les résultats sont affichés dans la console et sauvegardés dans `backend/tests/results/`:

```json
{
  "timestamp": "2024-01-06T12:00:00.000Z",
  "total": 1000,
  "success": 995,
  "errors": 5,
  "timeouts": 2,
  "duration": 45.2,
  "rps": 22.12,
  "latencies": {
    "p50": 120,
    "p95": 350,
    "p99": 500,
    "avg": 150.5,
    "min": 50,
    "max": 800
  }
}
```

## 📈 Métriques Surveillées

- **Latence**: p50, p95, p99 (en ms)
- **Throughput**: Requêtes/seconde (RPS)
- **Taux d'erreur**: % d'erreurs
- **Timeouts**: Nombre de timeouts

## 🎯 Objectifs de Performance

- **p95 Latency**: < 200ms ✅
- **Error Rate**: < 1% ✅
- **Throughput**: > 1000 req/s ✅
- **Timeout Rate**: < 0.1% ✅

## 🔧 Dépannage

### Erreur: ECONNREFUSED

Le serveur n'est pas démarré ou l'URL est incorrecte.

**Solution**:
```bash
# Vérifier que le serveur est démarré
curl http://localhost:5001/health

# Ou utiliser l'URL de production
export API_URL=https://fylora-1.onrender.com
```

### Erreur: Authentication failed

L'utilisateur de test n'existe pas.

**Solution**:
```bash
# Créer l'utilisateur manuellement ou laisser le script le créer
# Le script créera automatiquement l'utilisateur s'il n'existe pas
```

### Erreur: Timeout

Le serveur est trop lent ou surchargé.

**Solution**:
- Réduire le nombre de requêtes simultanées
- Vérifier les ressources du serveur
- Augmenter les timeouts dans le script

## 📝 Notes

- Les tests créent automatiquement un utilisateur de test s'il n'existe pas
- Les fichiers de test sont automatiquement nettoyés après les tests
- Les résultats sont sauvegardés avec timestamp pour comparaison

## 🚀 Tests Artillery (Avancé)

Pour des tests plus professionnels avec Artillery:

```bash
# Installer Artillery globalement
npm install -g artillery

# Exécuter les tests
artillery run loadTestArtillery.js
```

Arillery fournit des rapports plus détaillés avec graphiques et métriques avancées.

