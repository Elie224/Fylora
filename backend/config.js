// Configuration centralisée du serveur
require('dotenv').config();

module.exports = {
  server: {
    // Render utilise PORT, sinon SERVER_PORT, sinon 5001 par défaut (changé pour éviter conflit)
    port: process.env.PORT || process.env.SERVER_PORT || 5001,
    host: process.env.SERVER_HOST || '0.0.0.0',
    nodeEnv: process.env.NODE_ENV || 'development',
  },
  database: {
    // MongoDB connection string (mongodb://user:pass@host:port/db)
    mongoUri: process.env.MONGODB_URI || process.env.MONGO_URI || process.env.DB_URI,
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 27017,
    user: process.env.MONGO_INITDB_ROOT_USERNAME,
    password: process.env.MONGO_INITDB_ROOT_PASSWORD,
    database: process.env.POSTGRES_DB || process.env.MONGO_INITDB_DATABASE,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    expiresIn: '1h',
    refreshExpiresIn: '7d',
  },
  cors: {
    origin: function (origin, callback) {
      // En développement, autoriser toutes les origines localhost
      if (process.env.NODE_ENV !== 'production') {
        // Autoriser les requêtes sans origine (preflight OPTIONS)
        if (!origin) {
          return callback(null, true);
        }
        
        // Autoriser toutes les origines localhost avec n'importe quel port
        if (origin.includes('localhost') || 
            origin.includes('127.0.0.1') ||
            origin.match(/^http:\/\/192\.168\.\d+\.\d+/) ||
            origin.match(/^http:\/\/10\.\d+\.\d+\.\d+/) ||
            origin.match(/^http:\/\/localhost:\d+/) ||
            origin.match(/^http:\/\/127\.0\.0\.1:\d+/)) {
          return callback(null, true);
        }
      }
      
      // En production, utiliser la liste des origines autorisées
      const defaultOrigins = process.env.NODE_ENV === 'production' 
        ? '' 
        : 'http://localhost:3001,http://127.0.0.1:3001,http://localhost:19000,exp://localhost:19000';
      const corsOriginValue = process.env.CORS_ORIGIN || defaultOrigins;
      const allowedOrigins = (typeof corsOriginValue === 'string' ? corsOriginValue : String(corsOriginValue))
        .split(',')
        .map(origin => origin.trim())
        .filter(origin => origin.length > 0);
      
      // Autoriser les requêtes sans origine (health checks Render, Postman, curl, applications mobiles)
      if (!origin) {
        // En production, autoriser les health checks et requêtes système
        return callback(null, true);
        return callback(null, true);
      }
      
      // Vérifier si l'origine est autorisée
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        console.warn(`CORS blocked origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    maxAge: 86400, // 24 heures pour le cache preflight
  },
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || 1099511627776), // 1 TO par défaut (1 * 1024 * 1024 * 1024 * 1024 bytes)
    uploadDir: process.env.UPLOAD_DIR || './uploads',
  },
  oauth: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: process.env.GOOGLE_REDIRECT_URI || (process.env.NODE_ENV === 'production' 
        ? 'https://fylora-api.onrender.com/api/auth/google/callback'
        : 'http://localhost:5001/api/auth/google/callback'),
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      redirectUri: process.env.GITHUB_REDIRECT_URI || (process.env.NODE_ENV === 'production'
        ? 'https://fylora-api.onrender.com/api/auth/github/callback'
        : 'http://localhost:5001/api/auth/github/callback'),
    },
  },
};
