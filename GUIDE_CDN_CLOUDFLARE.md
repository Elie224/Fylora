# 🌐 Guide de Configuration CDN - Cloudflare

## 🎯 Objectif
Configurer Cloudflare CDN pour améliorer les performances globales et réduire la charge sur le serveur.

---

## 1. Configuration Cloudflare

### A. Créer un compte Cloudflare

1. Aller sur [cloudflare.com](https://cloudflare.com)
2. Créer un compte gratuit
3. Ajouter votre domaine (ex: `fylora.com`)

### B. Configuration DNS

1. **Ajouter les enregistrements DNS**:
   ```
   Type    Name    Content              Proxy
   A       @       <IP_SERVEUR>         ✅ Proxied
   A       api     <IP_SERVEUR>         ✅ Proxied
   CNAME   www     fylora.com           ✅ Proxied
   ```

2. **Changer les nameservers** vers Cloudflare (fournis après l'ajout du domaine)

---

## 2. Configuration Performance

### A. Speed → Optimization

1. **Auto Minify**:
   - ✅ JavaScript
   - ✅ CSS
   - ✅ HTML

2. **Brotli**: ✅ Activé

3. **Early Hints**: ✅ Activé (si disponible)

### B. Caching → Configuration

1. **Caching Level**: Standard
2. **Browser Cache TTL**: Respect Existing Headers
3. **Always Online**: ✅ Activé

### C. Page Rules

Créer des règles pour optimiser le cache:

#### Règle 1: API Static Files
```
URL: api.fylora.com/public/*
Settings:
  - Cache Level: Cache Everything
  - Edge Cache TTL: 1 month
  - Browser Cache TTL: 1 month
```

#### Règle 2: API Avatars
```
URL: api.fylora.com/avatars/*
Settings:
  - Cache Level: Cache Everything
  - Edge Cache TTL: 1 month
  - Browser Cache TTL: 1 month
```

#### Règle 3: API Metadata (avec revalidation)
```
URL: api.fylora.com/api/files*
Settings:
  - Cache Level: Standard
  - Edge Cache TTL: 5 minutes
  - Browser Cache TTL: Respect Existing Headers
```

---

## 3. Configuration Sécurité

### A. SSL/TLS

1. **Encryption mode**: Full (strict si certificat valide)
2. **Always Use HTTPS**: ✅ Activé
3. **Automatic HTTPS Rewrites**: ✅ Activé

### B. Firewall Rules

Créer des règles pour protéger l'API:

```
Rule: Block high request rate
Expression: (http.request.uri.path contains "/api") and (rate(5m) > 1000)
Action: Block
```

```
Rule: Challenge suspicious IPs
Expression: (cf.threat_score > 50)
Action: Challenge (CAPTCHA)
```

---

## 4. Workers (Optionnel - Pro)

Pour des optimisations avancées, utiliser Cloudflare Workers:

```javascript
// worker.js - Cache API responses
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  
  // Cache les réponses API GET
  if (request.method === 'GET' && url.pathname.startsWith('/api/')) {
    const cache = caches.default;
    let response = await cache.match(request);
    
    if (!response) {
      response = await fetch(request);
      // Mettre en cache pendant 5 minutes
      response.headers.set('Cache-Control', 'public, max-age=300');
      event.waitUntil(cache.put(request, response.clone()));
    }
    
    return response;
  }
  
  return fetch(request);
}
```

---

## 5. Analytics

### A. Web Analytics (Gratuit)

1. Activer **Web Analytics** dans le dashboard
2. Surveiller:
   - Requêtes par seconde
   - Cache hit ratio
   - Latence p95/p99

### B. Logs (Pro/Business)

1. Activer **Logpush** pour analyser les logs
2. Intégrer avec votre système de monitoring

---

## 6. Configuration Backend

### A. Headers à envoyer

Le backend doit envoyer les bons headers pour le cache CDN:

```javascript
// backend/middlewares/cacheHeaders.js
res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');
res.setHeader('CDN-Cache-Control', 'public, max-age=300');
res.setHeader('Vary', 'Accept-Encoding');
```

### B. Vérifier l'origine

Cloudflare ajoute des headers:
- `CF-Connecting-IP`: IP réelle du client
- `CF-Ray`: ID de requête Cloudflare
- `CF-Visitor`: Protocole (http/https)

Adapter le backend pour utiliser `CF-Connecting-IP` au lieu de `req.ip`:

```javascript
// backend/app.js
app.set('trust proxy', true);

// Dans les middlewares
const clientIP = req.headers['cf-connecting-ip'] || req.ip;
```

---

## 7. Tests de Performance

### A. Avant CDN

```bash
# Mesurer la latence
curl -w "@curl-format.txt" https://api.fylora.com/api/health
```

### B. Après CDN

```bash
# Vérifier le cache hit
curl -I https://api.fylora.com/api/files
# Headers attendus:
# CF-Cache-Status: HIT
# CF-Ray: ...
```

---

## 8. Monitoring

### A. Dashboard Cloudflare

Surveiller:
- **Bandwidth**: Utilisation de bande passante
- **Requests**: Nombre de requêtes
- **Cache Hit Ratio**: Taux de cache (objectif: > 80%)
- **Latency**: Latence p95/p99

### B. Alertes

Configurer des alertes pour:
- Cache hit ratio < 70%
- Latence p95 > 500ms
- Erreurs 5xx > 1%

---

## 9. Coûts

### Plan Free
- ✅ CDN illimité
- ✅ DDoS protection
- ✅ SSL/TLS gratuit
- ✅ Page Rules: 3 règles
- ⚠️ Workers: Non inclus

### Plan Pro ($20/mois)
- ✅ Tout du plan Free
- ✅ Page Rules: 20 règles
- ✅ Workers: 100,000 requêtes/jour
- ✅ Analytics avancés

### Plan Business ($200/mois)
- ✅ Tout du plan Pro
- ✅ Workers: 10M requêtes/jour
- ✅ Logs
- ✅ SLA 100% uptime

---

## 10. Checklist

- [ ] Compte Cloudflare créé
- [ ] Domaine ajouté
- [ ] DNS configuré (nameservers changés)
- [ ] SSL/TLS activé (Full)
- [ ] Page Rules configurées
- [ ] Firewall Rules configurées
- [ ] Headers backend configurés
- [ ] Tests de performance effectués
- [ ] Monitoring configuré
- [ ] Cache hit ratio > 80%

---

## 11. Résultats Attendus

### Avant CDN
- Latence p95: ~500ms (international)
- Cache hit: 0%
- Bandwidth: 100% serveur

### Après CDN
- Latence p95: ~100ms (international)
- Cache hit: > 80%
- Bandwidth: -70% serveur

---

**Status**: 🟢 **Prêt pour production avec Cloudflare**

