import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { notesService } from '../services/notesService';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { useAuthStore } from '../services/authStore';
import NoteComments from '../components/NoteComments';
import NoteVersions from '../components/NoteVersions';
import NoteTemplates from '../components/NoteTemplates';
import { connectWebSocket, joinNote, leaveNote, sendNoteChange, disconnectWebSocket } from '../services/websocketService';
import { noteVersionsService } from '../services/noteVersionsService';

export default function Notes() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { t } = useLanguage();
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const [notes, setNotes] = useState([]);
  const [currentNote, setCurrentNote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [lastSaved, setLastSaved] = useState(null);
  const saveTimeoutRef = useRef(null);
  const [showComments, setShowComments] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [activeUsers, setActiveUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredNotes, setFilteredNotes] = useState([]);
  const { accessToken } = useAuthStore();

  const cardBg = theme === 'dark' ? '#1e1e1e' : '#ffffff';
  const textColor = theme === 'dark' ? '#e0e0e0' : '#1a202c';
  const borderColor = theme === 'dark' ? '#333333' : '#e2e8f0';
  const textSecondary = theme === 'dark' ? '#b0b0b0' : '#64748b';
  const bgColor = theme === 'dark' ? '#121212' : '#f8fafc';
  const hoverBg = theme === 'dark' ? '#2d2d2d' : '#f1f5f9';
  const shadowColor = theme === 'dark' ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.08)';
  const shadowHover = theme === 'dark' ? 'rgba(0, 0, 0, 0.6)' : 'rgba(0, 0, 0, 0.12)';

  useEffect(() => {
    loadNotes();
  }, []);

  // Filtrer les notes selon la recherche
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredNotes(notes);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredNotes(notes.filter(note => 
        note.title.toLowerCase().includes(query) ||
        (note.content && note.content.toLowerCase().includes(query))
      ));
    }
  }, [searchQuery, notes]);

  useEffect(() => {
    if (id) {
      loadNote(id);
    } else {
      setCurrentNote(null);
      setTitle('');
      setContent('');
    }
  }, [id]);

  // WebSocket pour collaboration en temps réel
  useEffect(() => {
    if (currentNote && accessToken) {
      const socket = connectWebSocket(accessToken);
      
      joinNote(currentNote.id || currentNote._id, {
        onUserJoined: (data) => {
          console.log('User joined:', data);
          setActiveUsers(prev => {
            if (!prev.find(u => u.user_id === data.user_id)) {
              return [...prev, data.user];
            }
            return prev;
          });
        },
        onUserLeft: (data) => {
          console.log('User left:', data);
          setActiveUsers(prev => prev.filter(u => u.user_id !== data.user_id));
        },
        onNoteChanged: (data) => {
          // Appliquer les changements si ce n'est pas l'utilisateur actuel
          if (data.user_id !== user.id) {
            if (data.changes.title) {
              setTitle(data.changes.title);
            }
            if (data.changes.content) {
              setContent(data.changes.content);
            }
          }
        },
        onActiveUsers: (data) => {
          setActiveUsers(data.users || []);
        },
        onError: (error) => {
          console.error('WebSocket error:', error);
        },
      });

      return () => {
        leaveNote(currentNote.id || currentNote._id);
      };
    }
  }, [currentNote, accessToken, user.id]);

  // Sauvegarde automatique après 2 secondes d'inactivité
  useEffect(() => {
    if (currentNote && (title !== currentNote.title || content !== currentNote.content)) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        saveNote();
        // Envoyer les changements via WebSocket
        if (currentNote && accessToken) {
          sendNoteChange(currentNote.id || currentNote._id, {
            title,
            content,
          });
        }
      }, 2000);
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [title, content, currentNote, accessToken]);

  const loadNotes = async () => {
    try {
      setLoading(true);
      const response = await notesService.listNotes();
      setNotes(response.data?.notes || []);
    } catch (err) {
      console.error('Failed to load notes:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadNote = async (noteId) => {
    // Vérifier que noteId est valide
    if (!noteId || noteId === 'undefined' || noteId === '[object Object]') {
      console.error('Invalid note ID:', noteId);
      alert('Erreur: ID de note invalide');
      navigate('/notes');
      return;
    }
    
    try {
      setLoading(true);
      const response = await notesService.getNote(noteId);
      const note = response.data?.note;
      
      if (!note) {
        console.error('Note not found:', noteId);
        alert('Note non trouvée');
        navigate('/notes');
        return;
      }
      
      setCurrentNote(note);
      setTitle(note.title || '');
      setContent(note.content || '');
    } catch (err) {
      console.error('Failed to load note:', err);
      const errorMsg = err.response?.data?.error?.message || err.message || 'Erreur lors du chargement de la note';
      alert(`Erreur lors du chargement de la note: ${errorMsg}`);
      navigate('/notes');
    } finally {
      setLoading(false);
    }
  };

  const saveNote = async () => {
    if (!currentNote) return;

    try {
      setSaving(true);
      await notesService.updateNote(currentNote.id || currentNote._id, {
        title,
        content,
        version: currentNote.version,
      });
      setLastSaved(new Date());
      await loadNote(currentNote.id || currentNote._id);
    } catch (err) {
      console.error('Failed to save note:', err);
      if (err.response?.status === 409) {
        alert('La note a été modifiée par un autre utilisateur. Rechargement...');
        await loadNote(currentNote.id || currentNote._id);
      }
    } finally {
      setSaving(false);
    }
  };

  const createNote = async () => {
    try {
      const response = await notesService.createNote('Nouvelle note');
      const note = response.data?.note;
      navigate(`/notes/${note.id || note._id}`);
    } catch (err) {
      console.error('Failed to create note:', err);
      alert('Erreur lors de la création de la note');
    }
  };

  const deleteNote = async (noteId) => {
    if (!confirm('Voulez-vous vraiment supprimer cette note ?')) return;

    try {
      await notesService.deleteNote(noteId);
      if (currentNote && (currentNote.id || currentNote._id) === noteId) {
        navigate('/notes');
      }
      loadNotes();
    } catch (err) {
      console.error('Failed to delete note:', err);
      alert('Erreur lors de la suppression');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div style={{
      display: 'flex',
      height: 'calc(100vh - 64px)',
      backgroundColor: bgColor,
    }}>
      {/* Sidebar avec liste des notes */}
      <div style={{
        width: '300px',
        borderRight: `1px solid ${theme === 'dark' ? borderColor : '#e2e8f0'}`,
        backgroundColor: cardBg,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: theme === 'dark' ? 'none' : '2px 0 8px rgba(0,0,0,0.04)',
      }}>
        <div style={{
          padding: '20px',
          borderBottom: `1px solid ${theme === 'dark' ? borderColor : '#e2e8f0'}`,
          backgroundColor: theme === 'dark' ? 'transparent' : '#ffffff',
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px',
          }}>
            <h2 style={{
              margin: 0,
              fontSize: '20px',
              fontWeight: '700',
              color: textColor,
            }}>
              📝 Notes
            </h2>
          </div>
          
          {/* Barre de recherche */}
          <div style={{ marginBottom: '12px' }}>
            <input
              type="text"
              placeholder="🔍 Rechercher une note..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                backgroundColor: theme === 'dark' ? '#2d2d2d' : '#ffffff',
                color: textColor,
                border: `1.5px solid ${theme === 'dark' ? borderColor : '#cbd5e1'}`,
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                transition: 'all 0.2s',
                boxShadow: theme === 'dark' ? 'none' : '0 1px 3px rgba(0,0,0,0.1)',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#2196F3';
                e.currentTarget.style.boxShadow = theme === 'dark' 
                  ? '0 0 0 2px rgba(33,150,243,0.2)' 
                  : '0 0 0 3px rgba(33,150,243,0.1)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = theme === 'dark' ? borderColor : '#cbd5e1';
                e.currentTarget.style.boxShadow = theme === 'dark' ? 'none' : '0 1px 3px rgba(0,0,0,0.1)';
              }}
            />
          </div>

          {/* Boutons d'action */}
          <div style={{
            display: 'flex',
            gap: '8px',
            marginBottom: '12px',
          }}>
            <button
              onClick={createNote}
              style={{
                flex: 1,
                padding: '10px 16px',
                backgroundColor: '#2196F3',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.2s',
                boxShadow: theme === 'dark' ? '0 2px 4px rgba(0,0,0,0.3)' : '0 2px 4px rgba(33,150,243,0.2)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#1976D2';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#2196F3';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              ➕ Nouvelle note
            </button>
            <button
              onClick={() => setShowTemplates(true)}
              style={{
                padding: '10px 16px',
                backgroundColor: theme === 'dark' ? '#2d2d2d' : '#ffffff',
                color: theme === 'dark' ? textColor : '#475569',
                border: `1.5px solid ${theme === 'dark' ? borderColor : '#cbd5e1'}`,
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
                boxShadow: theme === 'dark' ? 'none' : '0 1px 3px rgba(0,0,0,0.1)',
              }}
              title="Créer depuis un template"
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = theme === 'dark' ? '#333333' : '#f1f5f9';
                e.currentTarget.style.borderColor = theme === 'dark' ? borderColor : '#94a3b8';
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = theme === 'dark' ? 'none' : '0 2px 6px rgba(0,0,0,0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = theme === 'dark' ? '#2d2d2d' : '#ffffff';
                e.currentTarget.style.borderColor = theme === 'dark' ? borderColor : '#cbd5e1';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = theme === 'dark' ? 'none' : '0 1px 3px rgba(0,0,0,0.1)';
              }}
            >
              📋 Templates
            </button>
          </div>
        </div>

        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px',
          backgroundColor: theme === 'dark' ? 'transparent' : '#f8fafc',
        }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '20px', color: textSecondary }}>
              Chargement...
            </div>
          ) : filteredNotes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: textSecondary }}>
              {searchQuery ? 'Aucune note trouvée' : 'Aucune note'}
            </div>
          ) : (
            <>
              {filteredNotes.map((note, index) => {
              // S'assurer que la clé est toujours une string
              const noteId = note.id 
                ? (typeof note.id === 'string' ? note.id : String(note.id))
                : (note._id ? (typeof note._id === 'string' ? note._id : String(note._id)) : `note-${index}`);
              return (
                <div
                  key={noteId}
                  onClick={() => navigate(`/notes/${note.id || note._id}`)}
                  style={{
                    padding: '14px',
                    marginBottom: '10px',
                    borderRadius: '10px',
                    backgroundColor: currentNote && (currentNote.id || currentNote._id) === (note.id || note._id)
                      ? (theme === 'dark' ? hoverBg : '#e0f2fe')
                      : (theme === 'dark' ? 'transparent' : '#ffffff'),
                    border: currentNote && (currentNote.id || currentNote._id) === (note.id || note._id)
                      ? `2px solid ${theme === 'dark' ? '#2196F3' : '#2196F3'}`
                      : `1px solid ${theme === 'dark' ? borderColor : '#e2e8f0'}`,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: currentNote && (currentNote.id || currentNote._id) === (note.id || note._id)
                      ? (theme === 'dark' ? '0 2px 8px rgba(0,0,0,0.3)' : '0 4px 12px rgba(33,150,243,0.15)')
                      : (theme === 'dark' ? 'none' : '0 1px 3px rgba(0,0,0,0.08)'),
                  }}
                  onMouseEnter={(e) => {
                    if (!currentNote || (currentNote.id || currentNote._id) !== (note.id || note._id)) {
                      e.currentTarget.style.backgroundColor = theme === 'dark' ? hoverBg : '#f8fafc';
                      e.currentTarget.style.borderColor = theme === 'dark' ? borderColor : '#cbd5e1';
                      e.currentTarget.style.boxShadow = theme === 'dark' 
                        ? '0 2px 8px rgba(0,0,0,0.2)' 
                        : '0 4px 12px rgba(0,0,0,0.12)';
                      e.currentTarget.style.transform = 'translateX(4px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!currentNote || (currentNote.id || currentNote._id) !== (note.id || note._id)) {
                      e.currentTarget.style.backgroundColor = theme === 'dark' ? 'transparent' : '#ffffff';
                      e.currentTarget.style.borderColor = theme === 'dark' ? borderColor : '#e2e8f0';
                      e.currentTarget.style.boxShadow = theme === 'dark' ? 'none' : '0 1px 3px rgba(0,0,0,0.08)';
                      e.currentTarget.style.transform = 'translateX(0)';
                    }
                  }}
                >
                  <div style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    color: textColor,
                    marginBottom: '4px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {note.title}
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: textSecondary,
                    marginBottom: '4px',
                  }}>
                    {formatDate(note.updated_at)}
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: textSecondary,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  dangerouslySetInnerHTML={{
                    __html: note.content?.replace(new RegExp('<[^>]*>', 'g'), '').substring(0, 50) || ''
                  }}
                  />
                </div>
              );
              })}
            </>
          )}
        </div>
      </div>

      {/* Zone d'édition */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {currentNote ? (
          <>
            {/* En-tête */}
            <div style={{
              padding: '16px 24px',
              borderBottom: `1px solid ${theme === 'dark' ? borderColor : '#e2e8f0'}`,
              backgroundColor: cardBg,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              boxShadow: theme === 'dark' ? 'none' : '0 1px 3px rgba(0,0,0,0.05)',
            }}>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Titre de la note"
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  fontSize: '20px',
                  fontWeight: '600',
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: textColor,
                  outline: 'none',
                  borderRadius: '6px',
                  transition: 'all 0.2s',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.backgroundColor = theme === 'dark' ? '#2d2d2d' : '#f8fafc';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              />
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}>
                {saving && (
                  <span style={{ fontSize: '14px', color: textSecondary }}>
                    💾 Enregistrement...
                  </span>
                )}
                {lastSaved && !saving && (
                  <span style={{ fontSize: '12px', color: textSecondary }}>
                    Enregistré {formatDate(lastSaved)}
                  </span>
                )}
                {activeUsers.length > 0 && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '4px 12px',
                    backgroundColor: theme === 'dark' ? '#2d2d2d' : '#f7fafc',
                    borderRadius: '20px',
                    fontSize: '12px',
                    color: textSecondary,
                  }}>
                    👥 {activeUsers.length} {activeUsers.length === 1 ? 'utilisateur' : 'utilisateurs'} actif{activeUsers.length > 1 ? 's' : ''}
                  </div>
                )}
                <button
                  onClick={saveNote}
                  disabled={saving || !currentNote}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: saving ? (theme === 'dark' ? '#2d2d2d' : '#e2e8f0') : '#2196F3',
                    color: saving ? textSecondary : 'white',
                    border: saving ? `1px solid ${borderColor}` : 'none',
                    borderRadius: '6px',
                    cursor: saving || !currentNote ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    opacity: saving || !currentNote ? 0.6 : 1,
                    transition: 'all 0.2s',
                  }}
                  title={saving ? 'Enregistrement en cours...' : 'Enregistrer la note'}
                >
                  {saving ? '⏳' : '💾'} {saving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
                <button
                  onClick={() => setShowComments(true)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: theme === 'dark' ? '#2d2d2d' : '#2196F3',
                    color: theme === 'dark' ? textColor : '#ffffff',
                    border: theme === 'dark' ? `1px solid ${borderColor}` : 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s',
                    boxShadow: theme === 'dark' ? 'none' : '0 2px 6px rgba(33,150,243,0.3)',
                  }}
                  onMouseEnter={(e) => {
                    if (theme === 'dark') {
                      e.currentTarget.style.backgroundColor = '#333333';
                    } else {
                      e.currentTarget.style.backgroundColor = '#1976D2';
                      e.currentTarget.style.boxShadow = '0 4px 8px rgba(33,150,243,0.4)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (theme === 'dark') {
                      e.currentTarget.style.backgroundColor = '#2d2d2d';
                    } else {
                      e.currentTarget.style.backgroundColor = '#2196F3';
                      e.currentTarget.style.boxShadow = '0 2px 6px rgba(33,150,243,0.3)';
                    }
                  }}
                >
                  💬 Commentaires
                </button>
                <button
                  onClick={() => setShowVersions(true)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: theme === 'dark' ? '#2d2d2d' : '#2196F3',
                    color: theme === 'dark' ? textColor : '#ffffff',
                    border: theme === 'dark' ? `1px solid ${borderColor}` : 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s',
                    boxShadow: theme === 'dark' ? 'none' : '0 2px 6px rgba(33,150,243,0.3)',
                  }}
                  onMouseEnter={(e) => {
                    if (theme === 'dark') {
                      e.currentTarget.style.backgroundColor = '#333333';
                    } else {
                      e.currentTarget.style.backgroundColor = '#1976D2';
                      e.currentTarget.style.boxShadow = '0 4px 8px rgba(33,150,243,0.4)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (theme === 'dark') {
                      e.currentTarget.style.backgroundColor = '#2d2d2d';
                    } else {
                      e.currentTarget.style.backgroundColor = '#2196F3';
                      e.currentTarget.style.boxShadow = '0 2px 6px rgba(33,150,243,0.3)';
                    }
                  }}
                >
                  📚 Versions
                </button>
                <button
                  onClick={() => deleteNote(currentNote.id || currentNote._id)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#f44336',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                  }}
                >
                  🗑️ Supprimer
                </button>
              </div>
            </div>

            {/* Éditeur de texte riche */}
            <div style={{
              flex: 1,
              padding: '32px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: theme === 'dark' ? cardBg : '#ffffff',
              position: 'relative',
            }}
            data-theme={theme}
            >
              {/* Indicateur de statut en haut */}
              <div style={{
                position: 'absolute',
                top: '8px',
                right: '24px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '12px',
                color: textSecondary,
                zIndex: 10,
              }}>
                {saving && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ 
                      width: '8px', 
                      height: '8px', 
                      borderRadius: '50%', 
                      backgroundColor: '#2196F3',
                      animation: 'pulse 1.5s ease-in-out infinite'
                    }}></span>
                    Enregistrement...
                  </span>
                )}
                {lastSaved && !saving && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ 
                      width: '8px', 
                      height: '8px', 
                      borderRadius: '50%', 
                      backgroundColor: '#4CAF50'
                    }}></span>
                    Enregistré {formatDate(lastSaved)}
                  </span>
                )}
              </div>

              <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: theme === 'dark' ? cardBg : '#ffffff',
                minHeight: '500px',
                marginTop: saving || lastSaved ? '24px' : '0',
                borderRadius: '12px',
                border: theme === 'dark' ? `1px solid ${borderColor}` : '1px solid #e2e8f0',
                boxShadow: theme === 'dark' ? 'none' : '0 2px 8px rgba(0,0,0,0.06)',
                overflow: 'hidden',
              }}>
                <style>{`
                  .ql-container {
                    font-family: inherit;
                    font-size: 16px;
                    line-height: 1.7;
                    min-height: 400px;
                    background-color: ${theme === 'dark' ? cardBg : '#ffffff'};
                    color: ${textColor};
                    border-color: ${theme === 'dark' ? borderColor : '#e2e8f0'};
                    border-bottom-left-radius: 12px;
                    border-bottom-right-radius: 12px;
                  }
                  .ql-editor {
                    min-height: 400px;
                    color: ${textColor};
                    padding: 20px;
                  }
                  .ql-toolbar {
                    background-color: ${theme === 'dark' ? '#2d2d2d' : '#f8fafc'};
                    border-color: ${theme === 'dark' ? borderColor : '#e2e8f0'};
                    border-top-left-radius: 12px;
                    border-top-right-radius: 12px;
                    border-bottom: ${theme === 'dark' ? `1px solid ${borderColor}` : '1px solid #e2e8f0'};
                    padding: 12px;
                  }
                  .ql-toolbar .ql-stroke {
                    stroke: ${theme === 'dark' ? textSecondary : '#64748b'};
                  }
                  .ql-toolbar .ql-fill {
                    fill: ${theme === 'dark' ? textSecondary : '#64748b'};
                  }
                  .ql-toolbar button:hover,
                  .ql-toolbar button.ql-active {
                    background-color: ${theme === 'dark' ? hoverBg : '#e2e8f0'};
                    border-radius: 4px;
                  }
                  .ql-editor.ql-blank::before {
                    color: ${theme === 'dark' ? textSecondary : '#94a3b8'};
                    font-style: normal;
                    font-size: 16px;
                  }
                  @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                  }
                `}</style>
                <ReactQuill
                  theme="snow"
                  value={content}
                  onChange={setContent}
                  placeholder="Commencez à écrire..."
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    backgroundColor: cardBg,
                  }}
                  modules={{
                    toolbar: [
                      [{ 'header': [1, 2, 3, false] }],
                      ['bold', 'italic', 'underline', 'strike'],
                      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                      [{ 'color': [] }, { 'background': [] }],
                      [{ 'align': [] }],
                      ['link', 'image'],
                      ['clean']
                    ],
                  }}
                  formats={[
                    'header',
                    'bold', 'italic', 'underline', 'strike',
                    'list', 'bullet',
                    'color', 'background',
                    'align',
                    'link', 'image'
                  ]}
                />
              </div>
            </div>
          </>
        ) : (
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: textSecondary,
            background: theme === 'dark' 
              ? 'linear-gradient(135deg, #1e1e1e 0%, #2d2d2d 100%)'
              : 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)',
          }}>
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div style={{ 
                fontSize: '80px', 
                marginBottom: '24px',
                filter: theme === 'dark' ? 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))' : 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))'
              }}>
                📝
              </div>
              <div style={{ 
                fontSize: '24px', 
                marginBottom: '12px', 
                color: textColor,
                fontWeight: '600',
              }}>
                Bienvenue dans vos notes
              </div>
              <div style={{ 
                fontSize: '16px', 
                marginBottom: '32px', 
                color: textSecondary,
                maxWidth: '400px',
                margin: '0 auto 32px',
              }}>
                Sélectionnez une note dans la liste ou créez-en une nouvelle pour commencer
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  onClick={createNote}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: '#2196F3',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s',
                    boxShadow: '0 4px 12px rgba(33,150,243,0.3)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#1976D2';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(33,150,243,0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#2196F3';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(33,150,243,0.3)';
                  }}
                >
                  ➕ Nouvelle note
                </button>
                <button
                  onClick={() => setShowTemplates(true)}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: theme === 'dark' ? '#2d2d2d' : '#ffffff',
                    color: theme === 'dark' ? textColor : '#475569',
                    border: `2px solid ${theme === 'dark' ? borderColor : '#2196F3'}`,
                    borderRadius: '10px',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s',
                    boxShadow: theme === 'dark' 
                      ? '0 4px 12px rgba(0,0,0,0.2)' 
                      : '0 4px 12px rgba(33,150,243,0.15)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = theme === 'dark' ? '#333333' : '#e0f2fe';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.borderColor = '#2196F3';
                    e.currentTarget.style.boxShadow = theme === 'dark' 
                      ? '0 6px 16px rgba(0,0,0,0.3)' 
                      : '0 6px 16px rgba(33,150,243,0.25)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = theme === 'dark' ? '#2d2d2d' : '#ffffff';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.borderColor = theme === 'dark' ? borderColor : '#2196F3';
                    e.currentTarget.style.boxShadow = theme === 'dark' 
                      ? '0 4px 12px rgba(0,0,0,0.2)' 
                      : '0 4px 12px rgba(33,150,243,0.15)';
                  }}
                >
                  📋 Créer depuis un template
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modaux pour les fonctionnalités */}
      {showComments && currentNote && (
        <NoteComments 
          noteId={currentNote.id || currentNote._id} 
          onClose={() => setShowComments(false)} 
        />
      )}
      {showVersions && currentNote && (
        <NoteVersions 
          noteId={currentNote.id || currentNote._id} 
          onClose={() => setShowVersions(false)} 
          onRestore={() => loadNote(currentNote.id || currentNote._id)} 
        />
      )}
      {showTemplates && (
        <NoteTemplates 
          onClose={() => setShowTemplates(false)} 
          onSelect={() => {
            setShowTemplates(false);
            loadNotes();
          }}
        />
      )}
    </div>
  );
}

