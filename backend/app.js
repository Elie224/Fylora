const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs').promises;
const session = require('express-session');
const passport = require('passport');
const config = require('./config');
const { errorHandler } = require('./middlewares/errorHandler');
const { generalLimiter, authLimiter, uploadLimiter, shareLimiter, apiLimiter } = require('./middlewares/rateLimiter');
const { sanitizeQuery, validateName } = require('./middlewares/security');
const compressionMiddleware = require('./middlewares/compression');
const { performanceMiddleware } = require('./middlewares/performance');
const { cacheMiddleware, invalidateUserCache } = require('./utils/cache');
const dbCheckMiddleware = require('./middlewares/dbCheck');
const logger = require('./utils/logger');
const mongoose = require('mongoose');

// Initialize MongoDB connection
const db = require('./models/db');
const { createIndexes } = require('./models/indexes');

// Initialize Passport OAuth strategies
const configurePassport = require('./config/passport');
configurePassport(); // Configurer les stratégies OAuth

// Initialize Queue Manager (initialisation automatique dans le constructeur)
require('./utils/queue'); // Charge et initialise automatiquement les queues

// Initialize Cloudinary service (si configuré)
const cloudinaryService = require('./services/cloudinaryService');
if (cloudinaryService.isCloudinaryConfigured()) {
  logger.logInfo('✅ Cloudinary storage service initialized');
} else {
  logger.logWarn('Cloudinary not configured, using local storage');
}

// Initialize Event Bus
const eventBus = require('./services/eventBus');
eventBus.init().then(connected => {
  if (connected) {
    logger.logInfo('✅ Event Bus initialized (Redis Streams)');
  } else {
    logger.logWarn('Event Bus: Using in-memory events (Redis not available)');
  }
}).catch(err => {
  logger.logError(err, { context: 'event_bus_init' });
});

// Initialize ElasticSearch (if configured)
const searchService = require('./services/searchService');
if (process.env.ELASTICSEARCH_URL) {
  searchService.init().then(connected => {
    if (connected) {
      logger.logInfo('✅ ElasticSearch search service initialized');
    } else {
      logger.logWarn('ElasticSearch not available, using MongoDB fallback');
    }
  }).catch(err => {
    logger.logError(err, { context: 'search_service_init' });
  });
}

// Créer le répertoire d'upload au démarrage
async function ensureUploadDir() {
  try {
    const uploadDir = path.resolve(config.upload.uploadDir);
    await fs.mkdir(uploadDir, { recursive: true });
    console.log(`✓ Upload directory ready: ${uploadDir}`);
  } catch (err) {
    console.error('❌ Failed to create upload directory:', err.message);
  }
}
ensureUploadDir();

// Initialiser les services en arrière-plan (ne bloque pas le démarrage du serveur)
async function startServer() {
  try {
    // Attendre la connexion MongoDB (max 10 secondes pour éviter les timeouts)
    const maxWait = 10000;
    const startTime = Date.now();
    
    // Attendre que la promesse de connexion soit résolue
    try {
      // Utiliser Promise.race pour éviter d'attendre trop longtemps
      await Promise.race([
        db.connectionPromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('MongoDB connection timeout')), maxWait))
      ]);
      console.log('✅ MongoDB ready');
    } catch (connErr) {
      // Si la connexion échoue, vérifier l'état rapidement
      if (db.connection.readyState === 1) {
        console.log('✅ MongoDB already connected');
      } else {
        console.warn('⚠️  MongoDB connection pending, continuing startup...');
        // Ne pas bloquer - la connexion se fera en arrière-plan
      }
    }

    // Créer les index en arrière-plan (ne bloque pas)
    if (db.connection.readyState === 1) {
      try {
        const { createIndexes } = require('./models/indexes');
        createIndexes().catch(err => {
          console.warn('⚠️  Could not create indexes:', err.message);
        });
      } catch (indexError) {
        console.warn('⚠️  Could not create indexes:', indexError.message);
      }
    }

    // Démarrer le service de planification pour les sauvegardes automatiques
    try {
      const { startScheduler } = require('./services/schedulerService');
      startScheduler();
      console.log('✅ Scheduler service started');
    } catch (schedulerError) {
      console.warn('⚠️  Could not start scheduler service:', schedulerError.message);
    }

    // Initialiser les templates de notes par défaut en arrière-plan
    if (db.connection.readyState === 1) {
      try {
        const { initTemplates } = require('./utils/initTemplates');
        initTemplates().catch(err => {
          console.warn('⚠️  Could not initialize note templates:', err.message);
        });
      } catch (templateError) {
        console.warn('⚠️  Could not initialize note templates:', templateError.message);
      }
    }
  } catch (err) {
    console.error('❌ Error in background initialization:', err.message);
    // Ne pas faire planter l'application
  }
}

const app = express();

// Trust proxy pour Render (nécessaire pour express-rate-limit et les IPs)
// Render utilise un reverse proxy, donc on doit faire confiance aux headers X-Forwarded-*
app.set('trust proxy', 1);

// Compression HTTP optimisée pour améliorer les performances (DOIT être avant les routes)
const { optimizedCompression, optimizeJsonResponse } = require('./middlewares/performanceOptimized');
const { timeoutMiddleware } = require('./middlewares/timeoutMiddleware');
const { cacheHeaders, metadataCacheHeaders, staticFileCacheHeaders } = require('./middlewares/cacheHeaders');
app.use(optimizedCompression);
app.use(optimizeJsonResponse);

// Timeout strict pour toutes les requêtes API (sauf uploads/downloads)
app.use('/api', timeoutMiddleware(2000)); // 2 secondes max pour API

// Initialiser Redis cache au démarrage
const redisCache = require('./utils/redisCache');
redisCache.initRedis().catch(err => {
  logger.logWarn('Redis cache initialization failed, using memory cache', { error: err.message });
});

// OPTIMISATION ULTRA: Précharger les données communes au démarrage
const dbOptimizer = require('./utils/dbOptimizer');
setTimeout(() => {
  // Analyser les collections après 30 secondes (une fois MongoDB prêt)
  if (mongoose.connection.readyState === 1) {
    ['files', 'folders', 'users'].forEach(collection => {
      dbOptimizer.analyzeCollection(collection).catch(() => {});
    });
  }
}, 30000);

// Performance monitoring
app.use(performanceMiddleware);

// Observabilité avancée (metrics, traces, logs)
const observabilityMiddleware = require('./middlewares/observabilityMiddleware');
app.use(observabilityMiddleware);

// Monitoring avancé des performances
const performanceMonitor = require('./utils/performanceMonitor');
app.use(performanceMonitor.middleware());

// Security middleware avec configuration améliorée
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false, // Désactivé pour permettre les ressources externes
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://accounts.google.com"],
      // Autoriser les scripts inline pour les extensions de navigateur (Google Translate, etc.)
      // et pour Vite HMR en développement
      scriptSrc: [
        "'self'", 
        "https://accounts.google.com", 
        "https://apis.google.com",
        // Stripe Checkout
        "https://js.stripe.com",
        "https://m.stripe.network",
        // PayPal SDK
        "https://www.paypal.com",
        "https://www.paypalobjects.com",
        // hCaptcha (si utilisé)
        "https://js.hcaptcha.com",
        "https://newassets.hcaptcha.com",
        // Hashes pour scripts inline spécifiques (extensions navigateur, etc.)
        "'sha256-BNulBYV1JXGvq9NQg7814ZyyVZCqfRI1aq5d+PSIdgI='",
        "'sha256-blrFnNhiZZnnF4nqRORUSibtvc3ITkJsB5GKleGrw4o='",
        "'sha256-4LRRm+CrRt91043ELDDzsKtE9mgb52p2iOlf9CRXTJ0='",
        "'sha256-pShsw8meIjhx77fl5AYeHiS3c1TOGl7Bx2eEqNo+OCk='",
        // Autoriser les scripts inline pour les extensions de navigateur
        // Note: En production, cela permet aussi aux extensions comme Google Translate de fonctionner
        "'unsafe-inline'"
      ],
      imgSrc: ["'self'", "data:", "https:", "https://accounts.google.com", "https://lh3.googleusercontent.com"],
      connectSrc: [
        "'self'",
        "https://accounts.google.com",
        "https://www.googleapis.com",
        "https://api.github.com",
        "https://github.com",
        // Stripe API
        "https://api.stripe.com",
        "https://m.stripe.network",
        // PayPal API
        "https://api.sandbox.paypal.com",
        "https://api.paypal.com",
        // hCaptcha API
        "https://hcaptcha.com",
        "https://newassets.hcaptcha.com"
      ],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: [
        "'self'",
        "https://accounts.google.com",
        "https://github.com",
        // Stripe Checkout
        "https://js.stripe.com",
        "https://hooks.stripe.com",
        // PayPal
        "https://www.paypal.com",
        "https://www.sandbox.paypal.com"
      ],
      frameAncestors: ["'self'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
}));

// CORS middleware - DOIT être avant le rate limiter pour gérer les requêtes OPTIONS
app.use(cors(config.cors));

// Rate limiting global (après CORS pour permettre les requêtes preflight)
// Désactivé en développement pour éviter les erreurs 429 pendant le développement
if (process.env.NODE_ENV === 'production') {
  app.use(generalLimiter);
}

// Nettoyage des requêtes contre les injections NoSQL
app.use(sanitizeQuery);

// Configuration du store de sessions (Redis si disponible, sinon mémoire)
let sessionStore;
if (process.env.REDIS_URL) {
  try {
    const RedisStore = require('connect-redis').default;
    const redis = require('redis');
    const redisClient = redis.createClient({
      url: process.env.REDIS_URL,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 3) return false;
          return Math.min(retries * 50, 500);
        },
        connectTimeout: 5000, // Augmenté à 5 secondes pour Render
      }
    });
    
    let redisErrorLogged = false;
    redisClient.on('error', (err) => {
      // Ne logger que les erreurs importantes, pas les timeouts initiaux qui se résolvent
      if (!redisErrorLogged && !err.message.includes('Connection timeout')) {
        console.error('❌ Redis session store error:', {
          message: err.message,
          code: err.code,
          redisUrl: process.env.REDIS_URL ? 'REDIS_URL is set' : 'REDIS_URL is NOT set'
        });
        redisErrorLogged = true;
      }
    });
    
    redisClient.on('connect', () => {
      console.log('🔄 Redis session store connecting...');
      redisErrorLogged = false; // Réinitialiser le flag lors d'une nouvelle connexion
    });
    
    redisClient.on('ready', () => {
      console.log('✅ Redis session store ready');
      redisErrorLogged = false; // Réinitialiser le flag quand Redis est prêt
    });
    
    redisClient.connect().catch((err) => {
      // Ne logger que si ce n'est pas un timeout initial (qui se résout souvent)
      if (!err.message.includes('Connection timeout') || redisErrorLogged) {
        console.error('❌ Redis session store connection failed:', {
          message: err.message,
          code: err.code,
          redisUrl: process.env.REDIS_URL ? 'REDIS_URL is set' : 'REDIS_URL is NOT set'
        });
        redisErrorLogged = true;
      }
    });
    sessionStore = new RedisStore({ client: redisClient });
    console.log('✅ Redis session store configured');
  } catch (error) {
    // Si connect-redis n'est pas installé ou erreur, utiliser MemoryStore
    console.warn('⚠️  Redis session store not available, using MemoryStore');
    sessionStore = undefined; // Utilisera MemoryStore par défaut
  }
} else {
  // Pas de Redis configuré, utiliser MemoryStore (avertissement en production)
  if (process.env.NODE_ENV === 'production') {
    console.warn('⚠️  Using MemoryStore for sessions (not recommended for production). Configure REDIS_URL to use Redis.');
  }
}

// Session middleware pour OAuth (doit être avant Passport)
app.use(session({
  store: sessionStore,
  secret: process.env.SESSION_SECRET || config.jwt.secret || 'fylora-session-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 heures
    sameSite: 'lax',
  }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Body parser middleware - ne pas parser pour multipart/form-data (géré par multer)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true, parameterLimit: 10000 }));

// Servir les fichiers statiques avec les bons en-têtes CORS
app.use('/public', express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.ico')) {
      res.setHeader('Content-Type', 'image/x-icon');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
  }
}));

// Servir les avatars
app.use('/avatars', express.static(path.join(__dirname, 'uploads', 'avatars'), {
  setHeaders: (res, filePath) => {
    if (filePath.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'public, max-age=31536000');
    }
  }
}));

// Favicon handler - retourne un favicon avec les bons en-têtes CORS
app.get('/favicon.ico', (req, res) => {
  const faviconPath = path.join(__dirname, 'public', 'favicon.ico');
  
  // Vérifier si le fichier existe
  fs.access(faviconPath)
    .then(() => {
      res.setHeader('Content-Type', 'image/x-icon');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET');
      res.setHeader('Cache-Control', 'public, max-age=31536000');
      res.sendFile(faviconPath);
    })
    .catch(() => {
      // Si le fichier n'existe pas, retourner un favicon minimal en mémoire
      const minimalFavicon = Buffer.from([
        0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x10, 0x10, 0x00, 0x00, 0x01, 0x00,
        0x20, 0x00, 0x68, 0x04, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00, 0x28, 0x00,
        0x00, 0x00, 0x10, 0x00, 0x00, 0x00, 0x20, 0x00, 0x00, 0x00, 0x01, 0x00,
        0x20, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
      ]);
      
      res.setHeader('Content-Type', 'image/x-icon');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET');
      res.setHeader('Cache-Control', 'public, max-age=31536000');
      res.status(200).send(minimalFavicon);
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'Fylora API is running',
    timestamp: new Date().toISOString(),
    port: PORT
  });
});

// Page d'accueil de l'API - Réponse JSON simple
app.get('/', (req, res) => {
  res.status(200).json({
    name: 'Fylora API',
    version: '1.0.0',
    description: 'API REST pour le stockage cloud',
    status: 'online',
    environment: config.server.nodeEnv,
    endpoints: {
      health: 'GET /health',
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        logout: 'POST /api/auth/logout',
        refresh: 'POST /api/auth/refresh'
      },
      files: {
        list: 'GET /api/files',
        upload: 'POST /api/files/upload',
        get: 'GET /api/files/:id',
        delete: 'DELETE /api/files/:id'
      },
      folders: {
        list: 'GET /api/folders',
        create: 'POST /api/folders',
        get: 'GET /api/folders/:id',
        delete: 'DELETE /api/folders/:id'
      },
      dashboard: 'GET /api/dashboard',
      search: 'GET /api/search',
      share: 'GET /api/share'
    },
    documentation: 'Consultez les fichiers dans le dossier docs/ pour plus d\'informations',
    frontend: process.env.FRONTEND_URL || 'http://localhost:3001'
  });
});

// Route temporaire pour définir l'admin automatiquement au démarrage (à supprimer après utilisation)
// ⚠️ Cette route doit être supprimée après avoir défini l'admin pour des raisons de sécurité
app.get('/api/init-admin', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const User = mongoose.models.User || mongoose.model('User');
    
    const adminEmail = 'kouroumaelisee@gmail.com';
    const user = await User.findOne({ email: adminEmail.toLowerCase().trim() });
    
    if (!user) {
      return res.status(404).json({
        error: { message: `Utilisateur ${adminEmail} non trouvé` }
      });
    }

    if (user.is_admin) {
      return res.status(200).json({
        data: {
          message: `${adminEmail} est déjà administrateur`,
          user: {
            id: user._id.toString(),
            email: user.email,
            is_admin: user.is_admin
          }
        }
      });
    }

    user.is_admin = true;
    await user.save();

    return res.status(200).json({
      data: {
        message: `${adminEmail} est maintenant administrateur`,
        user: {
          id: user._id.toString(),
          email: user.email,
          is_admin: user.is_admin
        }
      }
    });
  } catch (err) {
    return res.status(500).json({
      error: { message: err.message }
    });
  }
});

// Health check (avant les autres routes pour monitoring)
app.use('/api/health', require('./routes/health'));

// Performance stats endpoint (pour monitoring)
app.get('/api/performance/stats', (req, res) => {
  const performanceMonitor = require('./utils/performanceMonitor');
  const stats = performanceMonitor.getStats();
  res.status(200).json({ data: stats });
});

// Vérifier la connexion MongoDB pour toutes les routes API (sauf health)
app.use('/api', dbCheckMiddleware);

// API Routes avec rate limiting spécifique et cache
app.use('/api/auth', authLimiter, require('./routes/auth'));
app.use('/api/users', metadataCacheHeaders(), require('./routes/users'));
app.use('/api/files', require('./routes/files'));
// Routes Pre-signed URLs (pour décharger le backend)
app.use('/api/presigned', require('./routes/presigned'));
app.use('/api/files', require('./routes/fileVersions'));
// Routes de stockage Object (S3) - Architecture de niveau industrie
app.use('/api/storage', require('./routes/storage'));
// Routes fichiers V2 (avec S3)
const filesV2Router = express.Router();
const filesV2Controller = require('./controllers/filesControllerV2');
filesV2Router.post('/upload-url', filesV2Controller.generateUploadUrl);
filesV2Router.post('/finalize', filesV2Controller.finalizeUpload);
filesV2Router.get('/:id/download-url', filesV2Controller.generateDownloadUrl);
filesV2Router.get('/:id/preview-url', filesV2Controller.generatePreviewUrl);
filesV2Router.post('/multipart/initiate', filesV2Controller.initiateMultipartUpload);
filesV2Router.post('/multipart/chunk-url', filesV2Controller.generateChunkUploadUrl);
filesV2Router.post('/multipart/complete', filesV2Controller.completeMultipartUpload);
app.use('/api/files/v2', require('./middlewares/authMiddleware').authMiddleware, filesV2Router);
app.use('/api/folders', validateName, require('./routes/folders'));
app.use('/api/share', shareLimiter, require('./routes/share'));
app.use('/api/search', require('./routes/search'));
// Dashboard (cache géré dans la route)
app.use('/api/dashboard', metadataCacheHeaders(), require('./routes/dashboard'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/activity', require('./routes/activity'));
app.use('/api/tags', require('./routes/tags'));
app.use('/api/notes', require('./routes/notes'));
app.use('/api/comments', require('./routes/comments'));
app.use('/api/note-templates', require('./routes/noteTemplates'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/mfa', require('./routes/mfa'));
app.use('/api/multipart', require('./routes/multipart'));
app.use('/api/gdpr', require('./routes/gdpr'));
app.use('/api/security', require('./routes/security'));
app.use('/api/observability', require('./routes/observability'));

// Nouvelles fonctionnalités intelligentes
app.use('/api/intelligence', require('./routes/intelligence'));
app.use('/api/statistics', require('./routes/statistics'));
app.use('/api/cleanup', require('./routes/cleanup'));
app.use('/api/natural-search', require('./routes/naturalSearch'));
app.use('/api/fingerprint', require('./routes/fingerprint'));
app.use('/api/file-comments', require('./routes/fileComments'));
app.use('/api/file-annotations', require('./routes/fileAnnotations'));
app.use('/api/file-validations', require('./routes/fileValidations'));
app.use('/api/file-expirations', require('./routes/fileExpirations'));
app.use('/api/temporary-access', require('./routes/temporaryAccess'));
app.use('/api/suspicious-activity', require('./routes/suspiciousActivity'));
app.use('/api/webhooks', require('./routes/webhooks'));
app.use('/api/chunked-upload', require('./routes/chunkedUpload'));
app.use('/api/batch', require('./routes/batch'));
app.use('/api/signed-urls', require('./routes/signedUrls'));
app.use('/api/kpi', require('./routes/kpi'));
app.use('/api/kpi', require('./routes/frontendMetrics'));

// Route pour monitoring production (protégée)
app.get('/api/monitoring/dashboard', async (req, res, next) => {
  try {
    const productionMonitoring = require('./services/productionMonitoring');
    const dashboard = await productionMonitoring.getDashboard();
    res.status(200).json({ data: dashboard });
  } catch (err) {
    next(err);
  }
});
app.use('/api/2fa', require('./routes/twoFactor'));
app.use('/api/teams', require('./routes/teams'));
app.use('/api/backups', require('./routes/scheduledBackups'));
app.use('/api/plugins', require('./routes/plugins'));
app.use('/api/offline-sync', require('./routes/offlineSync'));
// Routes de gestion des plans
app.use('/api/plans', require('./routes/plans'));
// Routes de billing (Stripe & PayPal)
app.use('/api/billing', require('./routes/billing'));

// 404 handler (doit être avant errorHandler)
app.use((req, res) => {
  res.status(404).json({ error: { message: 'Route not found', status: 404 } });
});

// Error handling middleware (DOIT être en dernier)
app.use(errorHandler);

const PORT = config.server.port;
const HOST = config.server.host;

// Gestion du graceful shutdown
let server;
let isShuttingDown = false;

const gracefulShutdown = async (signal) => {
  // Éviter les shutdowns multiples
  if (isShuttingDown) {
    return;
  }
  isShuttingDown = true;

  logger.logInfo(`Received ${signal}, shutting down gracefully...`);
  
  // Fermer la connexion MongoDB (Mongoose v7+ utilise des promesses)
  const closeMongoDB = async () => {
    try {
      if (mongoose.connection.readyState !== 0) { // 0 = disconnected
        await mongoose.connection.close();
        logger.logInfo('MongoDB connection closed');
      }
    } catch (err) {
      logger.logError(err, { context: 'MongoDB close error' });
    }
  };

  if (server) {
    // Fermer le serveur HTTP
    server.close(() => {
      logger.logInfo('HTTP server closed');
      
      // Fermer MongoDB après la fermeture du serveur
      closeMongoDB()
        .then(() => {
          process.exit(0);
        })
        .catch((err) => {
          logger.logError(err, { context: 'Shutdown error' });
          process.exit(1);
        });
    });
    
    // Forcer la fermeture après 10 secondes
    setTimeout(async () => {
      logger.logError(new Error('Forced shutdown after timeout'), { context: 'graceful shutdown' });
      await closeMongoDB();
      process.exit(1);
    }, 10000);
  } else {
    // Si pas de serveur, fermer directement MongoDB
    await closeMongoDB();
    process.exit(0);
  }
};

// Écouter les signaux de fermeture
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Gestion des erreurs non capturées
process.on('uncaughtException', (err) => {
  logger.logError(err, { context: 'uncaughtException' });
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  // Ne pas faire planter l'application pour les erreurs Redis (non critiques)
  if (reason && typeof reason === 'object' && reason.message) {
    const errorMessage = reason.message;
    // Ignorer les erreurs Redis de connexion - elles ne sont pas critiques
    if (errorMessage.includes('ECONNREFUSED') || 
        errorMessage.includes('Redis') || 
        errorMessage.includes('127.0.0.1:6379')) {
      logger.logWarn(`Redis connection error (non-critical): ${errorMessage}`, { context: 'unhandledRejection' });
      return; // Ne pas faire planter l'application
    }
  }
  
  // Pour les autres erreurs, logger et continuer (ne pas faire planter en production)
  logger.logError(new Error(`Unhandled Rejection: ${reason}`), { context: 'unhandledRejection', promise });
  
  // En production, ne pas faire planter l'application pour les rejets non gérés
  // (sauf si c'est une erreur critique)
  if (process.env.NODE_ENV === 'production') {
    console.warn('Unhandled rejection in production, continuing...');
    return;
  }
  
  // En développement, faire planter pour déboguer
  gracefulShutdown('unhandledRejection');
});

// Démarrer le serveur IMMÉDIATEMENT (sans attendre MongoDB)
// Les initialisations se feront en arrière-plan
server = app.listen(PORT, HOST, () => {
  logger.logInfo(`Fylora API listening on http://${HOST}:${PORT}`, {
    environment: config.server.nodeEnv,
    port: PORT,
  });
  // Afficher le port pour que Render le détecte
  console.log(`Port ${PORT} is now listening`);
});

// Gestion des erreurs du serveur
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    logger.logError(err, { context: 'port already in use', port: PORT });
    process.exit(1);
  } else {
    logger.logError(err, { context: 'server error' });
  }
});

// Initialiser les services en arrière-plan (ne bloque pas le démarrage)
startServer().catch((err) => {
  logger.logError(err, { context: 'background initialization' });
  // Ne pas faire planter l'application si l'initialisation échoue
});

module.exports = app;
