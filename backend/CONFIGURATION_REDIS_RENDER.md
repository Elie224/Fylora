# 🔴 Configuration Redis sur Render

Ce guide explique comment configurer Redis sur Render pour améliorer les performances de l'application Fylora.

## 📋 Pourquoi Redis ?

Redis améliore les performances de l'application en fournissant :
- **Cache distribué** : Partage du cache entre plusieurs instances
- **Sessions** : Stockage des sessions utilisateur
- **Queues** : Gestion des tâches asynchrones (Bull)
- **Performance** : Réduction de la charge sur MongoDB

## 🚀 Étape 1 : Créer un service Redis sur Render

### Lien direct pour créer Redis :
👉 **[Créer un service Redis sur Render](https://dashboard.render.com/new/redis)**

### Ou suivez ces étapes :

1. Connectez-vous à votre [dashboard Render](https://dashboard.render.com)

2. Cliquez sur **"New +"** en haut à droite, puis sélectionnez **"Key Value"** (c'est le service Redis)

3. Configurez le service Redis :
   - **Name** : `fylora-redis` (ou un nom de votre choix)
   - **Plan** : 
     - **Free** : Pour le développement/test (limité à 25 MB)
     - **Starter** ($7/mois) : Recommandé pour la production (100 MB)
   - **Region** : Choisissez la même région que votre backend (ex: `Frankfurt`, `Oregon`)
   - **Maxmemory Policy** : `noeviction` (recommandé pour les queues et la persistance)

4. Cliquez sur **"Create Key Value"**

5. Attendez que le service soit créé (quelques secondes)

## 🔑 Étape 2 : Récupérer l'URL Redis

Une fois le service créé :

1. Dans la page du service Redis, vous verrez une section **"Connections"**

2. Copiez l'**Internal Redis URL** (pour backend sur Render) ou **External Redis URL** (pour accès externe)

   **Format exact sur Render** :
   ```
   redis://red-[ID_UNIQUE]:6379
   ```
   
   Où `[ID_UNIQUE]` est un identifiant unique généré par Render (ex: `redis://red-c1234567890abcdef:6379`)

   **Important** : 
   - Utilisez l'URL **interne** (`Internal Redis URL`) si votre backend est sur Render
   - Utilisez l'URL **externe** (`External Redis URL`) si vous accédez depuis l'extérieur
   - **Copiez exactement** l'URL fournie par Render, ne modifiez rien

## ⚙️ Étape 3 : Configurer REDIS_URL dans le backend

1. Allez dans votre service backend sur Render (ex: `fylora-backend`)

2. Cliquez sur **"Environment"** dans le menu de gauche

3. Ajoutez une nouvelle variable d'environnement :
   - **Key** : `REDIS_URL`
   - **Value** : Collez **exactement** l'URL Redis que vous avez copiée depuis Render
     - Format Render : `redis://red-[ID_UNIQUE]:6379`
     - **Ne modifiez pas** l'URL, utilisez-la telle quelle
     - Si Render affiche un mot de passe dans l'URL : `redis://:password@red-[ID_UNIQUE]:6379`

4. Cliquez sur **"Save Changes"**

5. Render redéploiera automatiquement votre backend

## ✅ Étape 4 : Vérifier la connexion Redis

Après le redéploiement, vérifiez les logs du backend :

```
✅ Redis cache connected
```

Si vous voyez ce message, Redis est correctement configuré !

## 🔍 Vérification dans les logs

### Connexion réussie :
```
✅ Redis cache connected
```

### Si Redis n'est pas configuré :
```
ℹ️  Redis not configured (REDIS_URL not set), using memory cache
```

### Si Redis est configuré mais indisponible :
```
Redis unavailable, using memory cache
```

## 📊 Utilisation de Redis dans l'application

Redis est utilisé pour :

1. **Cache avancé** (`utils/advancedCache.js`)
   - Cache multi-niveaux (mémoire + Redis)
   - Réduction des requêtes MongoDB

2. **Sessions utilisateur**
   - Stockage des sessions OAuth
   - Sessions Express (si configuré)

3. **Queues de tâches** (`utils/queue.js`)
   - Traitement asynchrone des fichiers
   - Emails, notifications

4. **Cache de permissions** (`utils/permissionCache.js`)
   - Cache des permissions utilisateur
   - Amélioration des performances

5. **KPIs et monitoring** (`utils/kpiMonitor.js`)
   - Statistiques en temps réel
   - Métriques de performance

## 🛠️ Configuration avancée (optionnel)

### Variables d'environnement supplémentaires :

```bash
# URL Redis (requis)
REDIS_URL=redis://red-xxxxx:6379

# Host Redis (si URL non utilisée)
REDIS_HOST=red-xxxxx
REDIS_PORT=6379
REDIS_PASSWORD=votre_mot_de_passe
```

### Test de connexion Redis :

Vous pouvez tester Redis avec un script Node.js :

```javascript
const redis = require('redis');
const client = redis.createClient({
  url: process.env.REDIS_URL
});

client.on('error', (err) => console.error('Redis error:', err));
client.on('connect', () => console.log('✅ Redis connected'));

await client.connect();
await client.set('test', 'value');
const value = await client.get('test');
console.log('Test value:', value);
```

## ⚠️ Notes importantes

1. **Free Plan** : 
   - Limité en mémoire (25 MB)
   - Pas de persistance
   - Parfait pour le développement

2. **Starter Plan** ($7/mois) :
   - 100 MB de mémoire
   - Persistance activée
   - Recommandé pour la production

3. **Sécurité** :
   - Utilisez toujours l'URL interne sur Render
   - Ne partagez jamais votre REDIS_URL publiquement

4. **Fallback** :
   - Si Redis est indisponible, l'application utilise automatiquement le cache mémoire
   - L'application continue de fonctionner normalement

## 🎯 Résultat attendu

Une fois Redis configuré, vous devriez voir dans les logs :

```
✅ Redis cache connected
```

Et l'application bénéficiera de :
- ✅ Cache distribué
- ✅ Meilleures performances
- ✅ Sessions persistantes
- ✅ Queues de tâches fiables

## 📚 Ressources

- [Documentation Render Redis](https://render.com/docs/redis)
- [Documentation Redis](https://redis.io/docs/)
- [Node Redis Client](https://github.com/redis/node-redis)

