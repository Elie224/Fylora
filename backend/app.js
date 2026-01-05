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

// Attendre que MongoDB soit connecté avant de démarrer le serveur
async function startServer() {
  try {
    // Attendre la connexion MongoDB (max 30 secondes)
    const maxWait = 30000;
    const startTime = Date.now();
    
    // Attendre que la promesse de connexion soit résolue
    try {
      await db.connectionPromise;
      console.log('✅ MongoDB ready, starting server...');
    } catch (connErr) {
      // Si la connexion échoue, attendre un peu et vérifier l'état
      while (db.connection.readyState !== 1 && (Date.now() - startTime) < maxWait) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      if (db.connection.readyState !== 1) {
        console.error('❌ MongoDB connection timeout. Server will start but database operations may fail.');
        console.error('   Please ensure MongoDB is running and accessible.');
      } else {
        console.log('✅ MongoDB ready, creating indexes...');
        // Créer les index pour optimiser les performances
        try {
          const { createIndexes } = require('./models/indexes');
          await createIndexes();
        } catch (indexError) {
          console.warn('⚠️  Could not create indexes:', indexError.message);
        }
        console.log('✅ MongoDB ready, starting server...');
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

    // Initialiser les templates de notes par défaut
    try {
      const { initTemplates } = require('./utils/initTemplates');
      await initTemplates();
    } catch (templateError) {
      console.warn('⚠️  Could not initialize note templates:', templateError.message);
    }
  } catch (err) {
    console.error('❌ Error waiting for MongoDB:', err.message);
  }
}

const app = express();

// Trust proxy pour Render (nécessaire pour express-rate-limit et les IPs)
// Render utilise un reverse proxy, donc on doit faire confiance aux headers X-Forwarded-*
app.set('trust proxy', 1);

// Compression HTTP optimisée pour améliorer les performances (DOIT être avant les routes)
const { optimizedCompression, cacheHeaders, optimizeJsonResponse } = require('./middlewares/performanceOptimized');
app.use(optimizedCompression);
app.use(cacheHeaders);
app.use(optimizeJsonResponse);

// Performance monitoring
app.use(performanceMiddleware);

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
      scriptSrc: ["'self'", "https://accounts.google.com", "https://apis.google.com"],
      imgSrc: ["'self'", "data:", "https:", "https://accounts.google.com", "https://lh3.googleusercontent.com"],
      connectSrc: [
        "'self'",
        "https://accounts.google.com",
        "https://www.googleapis.com",
        "https://api.github.com",
        "https://github.com"
      ],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: [
        "'self'",
        "https://accounts.google.com",
        "https://github.com"
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
app.use('/api/users', require('./routes/users'));
app.use('/api/files', require('./routes/files'));
app.use('/api/files', require('./routes/fileVersions'));
app.use('/api/folders', validateName, require('./routes/folders'));
app.use('/api/share', shareLimiter, require('./routes/share'));
app.use('/api/search', require('./routes/search'));
// Dashboard (cache géré dans la route)
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/activity', require('./routes/activity'));
app.use('/api/tags', require('./routes/tags'));
app.use('/api/notes', require('./routes/notes'));
app.use('/api/comments', require('./routes/comments'));
app.use('/api/note-templates', require('./routes/noteTemplates'));
app.use('/api/admin', require('./routes/admin'));

// Routes GDPR/RGPD pour la conformité avec le Règlement Général sur la Protection des Données
app.use('/api/gdpr', require('./routes/gdpr'));

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
  logger.logError(new Error(`Unhandled Rejection: ${reason}`), { context: 'unhandledRejection', promise });
  gracefulShutdown('unhandledRejection');
});

// Démarrer le serveur après vérification MongoDB
startServer().then(() => {
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
}).catch((err) => {
  logger.logError(err, { context: 'server startup' });
  process.exit(1);
});

module.exports = app;
