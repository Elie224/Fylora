# 🧪 Guide Tests de Charge - Fylora

## Installation

```bash
cd backend/tests
npm install
```

## Tests Disponibles

### 1. Test Upload Simultané

Simule 1000 uploads simultanés:

```bash
npm run test:upload
# ou
node loadTest.js --scenario=upload --concurrent=1000
```

### 2. Test Lecture Massif

Simule 100,000 lectures:

```bash
npm run test:read
# ou
node loadTest.js --scenario=read --requests=100000
```

### 3. Test Mixte

Simule un mix upload/lecture:

```bash
npm run test:mixed
# ou
node loadTest.js --scenario=mixed --concurrent=500
```

### 4. Test Artillery (Avancé)

Tests de charge professionnels avec Artillery:

```bash
npm install -g artillery
npm run test:artillery
# ou
artillery run loadTestArtillery.js
```

## Configuration

Variables d'environnement:

```bash
export API_URL=https://api.fylora.com
export TEST_EMAIL=test@fylora.com
export TEST_PASSWORD=Test1234!
```

## Résultats

Les résultats sont sauvegardés dans `backend/tests/results/` au format JSON.

## Métriques Surveillées

- **Latence**: p50, p95, p99
- **Throughput**: Requêtes/seconde
- **Taux d'erreur**: %
- **Timeouts**: Nombre

## Objectifs

- **p95 Latency**: < 200ms
- **Error Rate**: < 1%
- **Throughput**: > 1000 req/s
- **Timeout Rate**: < 0.1%

