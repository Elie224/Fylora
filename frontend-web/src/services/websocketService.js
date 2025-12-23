/**
 * Service WebSocket pour la collaboration en temps réel
 */
import { io as socketIOClient } from 'socket.io-client';
import { API_URL } from '../config';

let socket = null;
let isConnected = false;

/**
 * Initialiser la connexion WebSocket
 */
export function connectWebSocket(token) {
  if (socket && isConnected) {
    return socket;
  }

  socket = socketIOClient(API_URL, {
    auth: {
      token,
    },
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => {
    console.log('✅ WebSocket connected');
    isConnected = true;
  });

  socket.on('disconnect', () => {
    console.log('❌ WebSocket disconnected');
    isConnected = false;
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
    socket = null;
    isConnected = false;
  }
}

/**
 * Rejoindre une note pour la collaboration
 */
export function joinNote(noteId, callbacks = {}) {
  if (!socket || !isConnected) {
    console.warn('WebSocket not connected');
    return;
  }

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
}

/**
 * Quitter une note
 */
export function leaveNote(noteId) {
  if (!socket || !isConnected) return;

  socket.emit('leave-note', { note_id: noteId });
  
  // Nettoyer les listeners
  socket.off('user-joined');
  socket.off('user-left');
  socket.off('note-changed');
  socket.off('cursor-updated');
  socket.off('active-users');
  socket.off('error');
}

/**
 * Envoyer des changements de contenu
 */
export function sendNoteChange(noteId, changes) {
  if (!socket || !isConnected) return;

  socket.emit('note-change', {
    note_id: noteId,
    changes,
  });
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
  joinNote,
  leaveNote,
  sendNoteChange,
  sendCursorPosition,
};





