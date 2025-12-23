/**
 * Point d'entrée du serveur avec support WebSocket
 */
const http = require('http');
const app = require('./app');
const { initializeWebSocket } = require('./services/websocketService');
const config = require('./config');

// Créer le serveur HTTP
const server = http.createServer(app);

// Initialiser WebSocket
const io = initializeWebSocket(server);

// Démarrer le serveur
const PORT = config.server.port || 5001;

server.listen(PORT, () => {
  console.log(`🚀 Fylora API Server running on port ${PORT}`);
  console.log(`📡 WebSocket server ready at ws://localhost:${PORT}`);
});

// Gestion de l'arrêt gracieux
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    if (io) {
      io.close(() => {
        console.log('WebSocket server closed');
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    if (io) {
      io.close(() => {
        console.log('WebSocket server closed');
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  });
});

module.exports = server;





