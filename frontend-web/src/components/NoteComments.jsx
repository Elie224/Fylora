import React, { useEffect, useState } from 'react';
import { commentsService } from '../services/commentsService';
import { useAuthStore } from '../services/authStore';
import { useTheme } from '../contexts/ThemeContext';

export default function NoteComments({ noteId, onClose }) {
  const { user } = useAuthStore();
  const { theme } = useTheme();
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);

  const cardBg = theme === 'dark' ? '#1e1e1e' : '#ffffff';
  const textColor = theme === 'dark' ? '#e0e0e0' : '#1a202c';
  const borderColor = theme === 'dark' ? '#333333' : '#e2e8f0';
  const textSecondary = theme === 'dark' ? '#b0b0b0' : '#4a5568';

  useEffect(() => {
    if (noteId) {
      loadComments();
    }
  }, [noteId]);

  const loadComments = async () => {
    try {
      setLoading(true);
      const response = await commentsService.listComments(noteId, { unresolved_only: true });
      setComments(response.data?.comments || []);
    } catch (err) {
      console.error('Failed to load comments:', err);
    } finally {
      setLoading(false);
    }
  };

  const addComment = async () => {
    if (!newComment.trim()) return;

    try {
      await commentsService.createComment(noteId, newComment.trim());
      setNewComment('');
      loadComments();
    } catch (err) {
      console.error('Failed to add comment:', err);
      alert('Erreur lors de l\'ajout du commentaire');
    }
  };

  const resolveComment = async (commentId) => {
    try {
      await commentsService.resolveComment(commentId);
      loadComments();
    } catch (err) {
      console.error('Failed to resolve comment:', err);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      right: 0,
      top: 0,
      bottom: 0,
      width: '400px',
      backgroundColor: cardBg,
      borderLeft: `1px solid ${borderColor}`,
      display: 'flex',
      flexDirection: 'column',
      zIndex: 1000,
      boxShadow: theme === 'dark' ? '-4px 0 12px rgba(0,0,0,0.5)' : '-4px 0 12px rgba(0,0,0,0.1)',
    }}>
      <div style={{
        padding: '16px',
        borderBottom: `1px solid ${borderColor}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <h3 style={{ margin: 0, color: textColor }}>💬 Commentaires</h3>
        <button
          onClick={onClose}
          style={{
            padding: '4px 8px',
            backgroundColor: 'transparent',
            border: 'none',
            color: textColor,
            cursor: 'pointer',
            fontSize: '20px',
          }}
        >
          ×
        </button>
      </div>

      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px',
      }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: textSecondary }}>Chargement...</div>
        ) : comments.length === 0 ? (
          <div style={{ textAlign: 'center', color: textSecondary, padding: '20px' }}>
            Aucun commentaire
          </div>
        ) : (
          comments.map((comment) => (
            <div
              key={comment._id || comment.id}
              style={{
                padding: '12px',
                marginBottom: '12px',
                backgroundColor: theme === 'dark' ? '#2d2d2d' : '#f7fafc',
                borderRadius: '8px',
                border: `1px solid ${borderColor}`,
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px',
              }}>
                <div style={{ fontWeight: '600', color: textColor }}>
                  {comment.user_id?.display_name || comment.user_id?.email}
                </div>
                {!comment.resolved && (
                  <button
                    onClick={() => resolveComment(comment._id || comment.id)}
                    style={{
                      padding: '4px 8px',
                      backgroundColor: '#4CAF50',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px',
                    }}
                  >
                    Résoudre
                  </button>
                )}
              </div>
              <div style={{ color: textColor, marginBottom: '8px' }}>
                {comment.content}
              </div>
              {comment.replies && comment.replies.length > 0 && (
                <div style={{
                  marginTop: '8px',
                  paddingLeft: '16px',
                  borderLeft: `2px solid ${borderColor}`,
                }}>
                  {comment.replies.map((reply, idx) => (
                    <div key={idx} style={{ marginBottom: '8px' }}>
                      <div style={{ fontSize: '12px', fontWeight: '600', color: textSecondary }}>
                        {reply.user_id?.display_name || reply.user_id?.email}
                      </div>
                      <div style={{ fontSize: '14px', color: textColor }}>
                        {reply.content}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div style={{
        padding: '16px',
        borderTop: `1px solid ${borderColor}`,
      }}>
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Ajouter un commentaire..."
          style={{
            width: '100%',
            minHeight: '80px',
            padding: '8px',
            backgroundColor: theme === 'dark' ? '#2d2d2d' : '#ffffff',
            color: textColor,
            border: `1px solid ${borderColor}`,
            borderRadius: '6px',
            fontSize: '14px',
            resize: 'vertical',
          }}
        />
        <button
          onClick={addComment}
          style={{
            marginTop: '8px',
            width: '100%',
            padding: '8px',
            backgroundColor: '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
          }}
        >
          Ajouter
        </button>
      </div>
    </div>
  );
}





