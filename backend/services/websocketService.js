/**
 * Service WebSocket pour la collaboration en temps réel
 */
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const config = require('../config');
const Note = require('../models/Note');
const User = require('../models/userModel');

let io = null;
const activeUsers = new Map(); // note_id -> Set of user_ids
const noteCursors = new Map(); // note_id -> { user_id: { position, name } }

/**
 * Initialiser le serveur WebSocket
 */
function initializeWebSocket(server) {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3001',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    path: '/socket.io',
  });

  // Middleware d'authentification
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, config.jwt.secret);
      const user = await User.findById(decoded.userId).select('email display_name avatar_url');
      
      if (!user) {
        return next(new Error('User not found'));
      }

      socket.userId = decoded.userId;
      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`✅ User connected: ${socket.user.email} (${socket.userId})`);

    // Rejoindre une note pour la collaboration
    socket.on('join-note', async ({ note_id }) => {
      try {
        // Vérifier les permissions
        const note = await Note.findById(note_id);
        if (!note || note.is_deleted) {
          socket.emit('error', { message: 'Note not found' });
          return;
        }

        if (!note.hasPermission(socket.userId, 'read')) {
          socket.emit('error', { message: 'Access denied' });
          return;
        }

        socket.join(`note:${note_id}`);

        // Ajouter l'utilisateur aux utilisateurs actifs
        if (!activeUsers.has(note_id)) {
          activeUsers.set(note_id, new Set());
        }
        activeUsers.get(note_id).add(socket.userId);

        // Notifier les autres utilisateurs
        socket.to(`note:${note_id}`).emit('user-joined', {
          user_id: socket.userId,
          user: socket.user,
        });

        // Envoyer la liste des utilisateurs actifs
        const activeUsersList = Array.from(activeUsers.get(note_id))
          .map(uid => ({ user_id: uid }));
        
        socket.emit('active-users', { users: activeUsersList });

        console.log(`📝 User ${socket.user.email} joined note ${note_id}`);
      } catch (error) {
        console.error('Error joining note:', error);
        socket.emit('error', { message: 'Error joining note' });
      }
    });

    // Quitter une note
    socket.on('leave-note', ({ note_id }) => {
      socket.leave(`note:${note_id}`);
      
      if (activeUsers.has(note_id)) {
        activeUsers.get(note_id).delete(socket.userId);
        if (activeUsers.get(note_id).size === 0) {
          activeUsers.delete(note_id);
        }
      }

      socket.to(`note:${note_id}`).emit('user-left', {
        user_id: socket.userId,
      });

      console.log(`📝 User ${socket.user.email} left note ${note_id}`);
    });

    // Changements de contenu en temps réel
    socket.on('note-change', ({ note_id, changes }) => {
      // Diffuser les changements aux autres utilisateurs
      socket.to(`note:${note_id}`).emit('note-changed', {
        user_id: socket.userId,
        user: socket.user,
        changes,
        timestamp: new Date(),
      });
    });

    // Position du curseur
    socket.on('cursor-position', ({ note_id, position }) => {
      if (!noteCursors.has(note_id)) {
        noteCursors.set(note_id, new Map());
      }
      noteCursors.get(note_id).set(socket.userId, {
        position,
        user: socket.user,
        timestamp: new Date(),
      });

      // Diffuser la position du curseur
      socket.to(`note:${note_id}`).emit('cursor-updated', {
        user_id: socket.userId,
        user: socket.user,
        position,
      });
    });

    // Déconnexion
    socket.on('disconnect', () => {
      console.log(`❌ User disconnected: ${socket.user.email}`);
      
      // Retirer de toutes les notes actives
      activeUsers.forEach((users, note_id) => {
        if (users.has(socket.userId)) {
          users.delete(socket.userId);
          io.to(`note:${note_id}`).emit('user-left', {
            user_id: socket.userId,
          });
        }
      });
    });
  });

  return io;
}

/**
 * Émettre un événement à tous les clients d'une note
 */
function emitToNote(note_id, event, data) {
  if (io) {
    io.to(`note:${note_id}`).emit(event, data);
  }
}

module.exports = {
  initializeWebSocket,
  emitToNote,
};





