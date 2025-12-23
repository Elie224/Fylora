const mongoose = require('mongoose');
const config = require('../config');

let mongoUri = config.database.mongoUri || process.env.MONGODB_URI || process.env.MONGO_URI;

// ⚠️ PROTECTION STRICTE : Garantir que l'application se connecte toujours à "Fylora"
function garantirBaseFylora(uri) {
  if (!uri) {
    return 'mongodb://localhost:27017/Fylora';
  }
  
  // Détecter toute référence à "supfile" (insensible à la casse)
  const uriLower = uri.toLowerCase();
  if (uriLower.includes('/supfile') || uriLower.includes('supfile')) {
    console.warn('⚠️  Détection de référence à "supfile" dans l\'URI MongoDB');
    console.warn('   Redirection automatique vers "Fylora" (protection active)...');
    uri = uri.replace(/\/supfile(\?|$)/gi, '/Fylora$1');
    uri = uri.replace(/supfile/gi, 'Fylora');
  }
  
  // Extraire le nom de la base de données de l'URI
  const dbMatch = uri.match(/\/([^\/\?]+)(\?|$)/);
  
  // Si une base de données est spécifiée et ce n'est pas Fylora, la remplacer
  if (dbMatch && dbMatch[1].toLowerCase() !== 'fylora') {
    console.warn(`⚠️  Base de données "${dbMatch[1]}" détectée, remplacement par "Fylora"...`);
    uri = uri.replace(/\/([^\/\?]+)(\?|$)/, '/Fylora$2');
  }
  
  // Si aucune base n'est spécifiée, ajouter Fylora
  if (!dbMatch) {
    // Si l'URI se termine par un slash, remplacer, sinon ajouter
    if (uri.endsWith('/')) {
      uri = uri + 'Fylora';
    } else {
      uri = uri.replace(/(\?|$)/, '/Fylora$1');
    }
  }
  
  return uri;
}

// Appliquer la protection stricte
mongoUri = garantirBaseFylora(mongoUri);

if (!mongoUri) {
  console.error('❌ MongoDB connection string not found. Set MONGO_URI in environment.');
  process.exit(1);
}

// Forcer IPv4 si localhost (éviter les problèmes IPv6)
if (mongoUri.includes('localhost') || mongoUri.includes('127.0.0.1')) {
  // S'assurer qu'on utilise 127.0.0.1 au lieu de localhost pour éviter IPv6
  mongoUri = mongoUri.replace(/mongodb:\/\/localhost/, 'mongodb://127.0.0.1');
}

console.log('🔄 Attempting to connect to MongoDB...');
console.log('📍 Connection URI:', mongoUri.replace(/:[^:]*@/, ':****@'));

mongoose.set('strictQuery', false);
// Note: bufferCommands et bufferMaxEntries ne sont plus supportés dans Mongoose 6+
// Le buffering est géré automatiquement par Mongoose

const options = {
  serverSelectionTimeoutMS: 10000, // 10 secondes (réduit pour détecter plus vite les problèmes)
  socketTimeoutMS: 45000, // 45 secondes (timeout pour les opérations socket)
  connectTimeoutMS: 10000, // Timeout de connexion initiale (réduit)
  maxPoolSize: 100, // Augmenté pour meilleure scalabilité et performance
  minPoolSize: 1, // Pool minimum réduit pour éviter les problèmes au démarrage
  maxIdleTimeMS: 60000, // Fermer les connexions inactives après 60s (augmenté pour stabilité)
  heartbeatFrequencyMS: 10000, // Vérifier la santé toutes les 10s
  retryWrites: true, // Réessayer les écritures en cas d'échec
  retryReads: true, // Réessayer les lectures en cas d'échec
  w: 'majority', // Écrire sur la majorité des nœuds (pour répliques)
  journal: true, // Journaling activé pour la durabilité (remplace l'option dépréciée 'j')
  // Note: bufferMaxEntries et bufferCommands ne sont plus supportés dans Mongoose 6+
  // Le buffering est géré automatiquement par Mongoose
  // Forcer IPv4
  family: 4, // Forcer IPv4 pour éviter les problèmes IPv6
};

// Fonction pour vérifier si MongoDB est connecté
function isConnected() {
  return mongoose.connection.readyState === 1;
}

// Fonction pour attendre la connexion
async function waitForConnection(maxWait = 30000) {
  const startTime = Date.now();
  while (!isConnected() && (Date.now() - startTime) < maxWait) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  if (!isConnected()) {
    throw new Error('MongoDB connection timeout');
  }
}

// Fonction pour reconnecter MongoDB
async function reconnectMongoDB() {
  try {
    if (mongoose.connection.readyState === 1) {
      return mongoose.connection;
    }
    
    console.log('🔄 Tentative de reconnexion à MongoDB...');
    await mongoose.connect(mongoUri, options);
    const dbName = mongoose.connection.db.databaseName;
    console.log(`✓ Reconnecté à MongoDB - Base de données: "${dbName}"`);
    return mongoose.connection;
  } catch (err) {
    console.error('✗ Échec de la reconnexion MongoDB:', err.message);
    return null;
  }
}

// Connecter à MongoDB avec gestion d'erreur améliorée
let connectionPromise = mongoose.connect(mongoUri, options)
  .then(() => {
    // Vérifier que la connexion est bien à Fylora
    const dbName = mongoose.connection.db.databaseName;
    
    if (dbName.toLowerCase() === 'supfile') {
      console.error(`❌ ERREUR CRITIQUE : Connexion à la base "supfile" détectée!`);
      console.error('   La connexion sera fermée immédiatement pour protéger la base "supfile".');
      mongoose.connection.close().then(() => {
        process.exit(1);
      });
      return null;
    }
    
    if (dbName.toLowerCase() !== 'fylora') {
      console.warn(`⚠️  Attention : Connexion à la base "${dbName}" au lieu de "Fylora"`);
    } else {
      console.log(`✓ Connected to MongoDB - Base de données: "${dbName}"`);
    }
    
    return mongoose.connection;
  })
  .catch(async (err) => {
    console.error('✗ MongoDB connection error:', err.message || err);
    console.error('   Détails:', err.name, err.code);
    console.error('Ensure MongoDB is running on the configured URI.');
    
    // Essayer de reconnecter après 5 secondes
    setTimeout(() => {
      reconnectMongoDB();
    }, 5000);
    
    // Ne pas throw l'erreur pour permettre au serveur de démarrer quand même
    return null;
  });

// Exposer la promesse de connexion
mongoose.connectionPromise = connectionPromise;

// Handle connection events
mongoose.connection.on('connected', () => {
  console.log('✓ MongoDB connected');
});

mongoose.connection.on('error', (err) => {
  console.error('✗ MongoDB error:', err.message || err);
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠ MongoDB disconnected - Tentative de reconnexion...');
  // Tenter de reconnecter après 3 secondes
  setTimeout(() => {
    reconnectMongoDB();
  }, 3000);
});

mongoose.connection.on('reconnected', () => {
  console.log('✓ MongoDB reconnected');
});

// Middleware pour vérifier la connexion avant les requêtes
mongoose.connection.on('connecting', () => {
  console.log('🔄 MongoDB connecting...');
});

// Export avec fonction de vérification
module.exports = mongoose;
module.exports.isConnected = isConnected;
module.exports.waitForConnection = waitForConnection;
module.exports.reconnectMongoDB = reconnectMongoDB;
module.exports.connectionPromise = connectionPromise;
