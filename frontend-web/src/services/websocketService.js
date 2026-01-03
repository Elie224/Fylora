/**
 * Service WebSocket pour la collaboration en temps réel
 */
import { io as socketIOClient } from 'socket.io-client';
import { API_URL } from '../config';

let socket = null;
let isConnected = false;
let isDisabled = false; // Désactiver après trop d'échecs
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 3;
const RECONNECT_DELAY = 5000; // 5 secondes

/**
 * Initialiser la connexion WebSocket
 */
export function connectWebSocket(token) {
  // Ne pas essayer de se connecter si désactivé
  if (isDisabled) {
    console.warn('⚠️ WebSocket désactivé après trop d\'échecs');
    return null;
  }

  if (socket && isConnected) {
    return socket;
  }

  // Si on a déjà un socket qui essaie de se reconnecter, ne pas en créer un nouveau
  if (socket && !isConnected && reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.warn('⚠️ Trop de tentatives de reconnexion, WebSocket désactivé');
    isDisabled = true;
    disconnectWebSocket();
    return null;
  }

  socket = socketIOClient(API_URL, {
    auth: {
      token,
    },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: RECONNECT_DELAY,
    reconnectionDelayMax: RECONNECT_DELAY * 2,
    reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
    timeout: 10000, // 10 secondes de timeout
    forceNew: false,
  });

  socket.on('connect', () => {
    console.log('✅ WebSocket connected');
    isConnected = true;
    reconnectAttempts = 0; // Réinitialiser le compteur après connexion réussie
  });

  socket.on('disconnect', (reason) => {
    console.log('❌ WebSocket disconnected:', reason);
    isConnected = false;
    
    // Désactiver si c'est une erreur de connexion permanente
    if (reason === 'io server disconnect' || reason === 'transport close') {
      reconnectAttempts++;
      if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        console.warn('⚠️ Trop de déconnexions, WebSocket désactivé');
        isDisabled = true;
        disconnectWebSocket();
      }
    }
  });

  socket.on('connect_error', (error) => {
    console.error('WebSocket connection error:', error.message);
    reconnectAttempts++;
    
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.warn('⚠️ Trop d\'erreurs de connexion, WebSocket désactivé');
      isDisabled = true;
      disconnectWebSocket();
    }
  });

  socket.on('reconnect_attempt', (attemptNumber) => {
    console.log(`🔄 Tentative de reconnexion WebSocket ${attemptNumber}/${MAX_RECONNECT_ATTEMPTS}`);
    if (attemptNumber >= MAX_RECONNECT_ATTEMPTS) {
      console.warn('⚠️ Limite de reconnexions atteinte, WebSocket désactivé');
      isDisabled = true;
      disconnectWebSocket();
    }
  });

  socket.on('reconnect_failed', () => {
    console.error('❌ Échec de la reconnexion WebSocket');
    isDisabled = true;
    disconnectWebSocket();
  });

  socket.on('error', (error) => {
    console.error('WebSocket error:', error);
  });

  return socket;
}

/**
 * Déconnecter WebSocket
 */
export function disconnectWebSocket() {
  if (socket) {
    socket.disconnect();
    socket.removeAllListeners(); // Nettoyer tous les listeners
    socket = null;
    isConnected = false;
  }
}

/**
 * Réinitialiser l'état WebSocket (pour réessayer après un certain temps)
 */
export function resetWebSocketState() {
  isDisabled = false;
  reconnectAttempts = 0;
  disconnectWebSocket();
}

/**
 * Vérifier si WebSocket est disponible
 */
export function isWebSocketAvailable() {
  return !isDisabled && (socket !== null && isConnected);
}

/**
 * Rejoindre une note pour la collaboration
 */
export function joinNote(noteId, callbacks = {}) {
  if (isDisabled) {
    console.warn('WebSocket désactivé, impossible de rejoindre la note');
    return;
  }

  if (!socket || !isConnected) {
    console.warn('WebSocket not connected, tentative de connexion...');
    // Ne pas essayer de se reconnecter automatiquement ici pour éviter les boucles
    return;
  }

  try {
    socket.emit('join-note', { note_id: noteId });

    // Écouter les événements
    if (callbacks.onUserJoined) {
      socket.on('user-joined', callbacks.onUserJoined);
    }

    if (callbacks.onUserLeft) {
      socket.on('user-left', callbacks.onUserLeft);
    }

    if (callbacks.onNoteChanged) {
      socket.on('note-changed', callbacks.onNoteChanged);
    }

    if (callbacks.onCursorUpdated) {
      socket.on('cursor-updated', callbacks.onCursorUpdated);
    }

    if (callbacks.onActiveUsers) {
      socket.on('active-users', callbacks.onActiveUsers);
    }

    if (callbacks.onError) {
      socket.on('error', callbacks.onError);
    }
  } catch (error) {
    console.error('Erreur lors de la jointure de la note:', error);
  }
}

/**
 * Quitter une note
 */
export function leaveNote(noteId) {
  if (!socket || !isConnected || isDisabled) return;

  try {
    socket.emit('leave-note', { note_id: noteId });
    
    // Nettoyer les listeners
    socket.off('user-joined');
    socket.off('user-left');
    socket.off('note-changed');
    socket.off('cursor-updated');
    socket.off('active-users');
    socket.off('error');
  } catch (error) {
    console.error('Erreur lors de la sortie de la note:', error);
  }
}

/**
 * Envoyer des changements de contenu
 */
export function sendNoteChange(noteId, changes) {
  if (!socket || !isConnected || isDisabled) return;

  try {
    socket.emit('note-change', {
      note_id: noteId,
      changes,
    });
  } catch (error) {
    console.error('Erreur lors de l\'envoi des changements:', error);
  }
}

/**
 * Envoyer la position du curseur
 */
export function sendCursorPosition(noteId, position) {
  if (!socket || !isConnected) return;

  socket.emit('cursor-position', {
    note_id: noteId,
    position,
  });
}

export default {
  connectWebSocket,
  disconnectWebSocket,
  resetWebSocketState,
  isWebSocketAvailable,
  joinNote,
  leaveNote,
  sendNoteChange,
  sendCursorPosition,
};





