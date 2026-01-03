import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
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
import { useToast } from '../components/Toast';

export default function Notes() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { t } = useLanguage();
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const { accessToken } = useAuthStore();
  const { showToast, ToastContainer } = useToast();
  
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
  const [sortBy, setSortBy] = useState('updated'); // 'updated', 'title', 'created'
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc', 'desc'
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filterFavorite, setFilterFavorite] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterFavorite, dateFrom, dateTo, searchQuery, sortBy, sortOrder]);

  // Recharger les notes quand les filtres changent (avec debounce)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadNotes();
    }, 300); // Debounce de 300ms pour éviter trop de requêtes
    
    return () => clearTimeout(timeoutId);
  }, [filterFavorite, dateFrom, dateTo, searchQuery, sortBy, sortOrder, loadNotes]);

  // Les notes sont déjà filtrées et triées côté serveur, on les utilise directement
  const filteredAndSortedNotes = useMemo(() => {
    // Trier les favoris en premier si nécessaire
    return [...notes].sort((a, b) => {
      if (a.is_favorite && !b.is_favorite) return -1;
      if (!a.is_favorite && b.is_favorite) return 1;
      return 0;
    });
  }, [notes]);

  useEffect(() => {
    if (id) {
      loadNote(id);
    } else {
      setCurrentNote(null);
      setTitle('');
      setContent('');
    }
  }, [id, loadNote]);

  // WebSocket pour collaboration en temps réel
  useEffect(() => {
    if (currentNote && accessToken) {
      const socket = connectWebSocket(accessToken);
      const noteId = getNoteId(currentNote);
      if (!noteId) return;
      
      joinNote(noteId, {
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
        const noteId = getNoteId(currentNote);
        if (noteId) {
          leaveNote(noteId);
        }
      };
    }
  }, [currentNote, accessToken, user.id, getNoteId]);

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
          const noteId = getNoteId(currentNote);
          if (noteId) {
            sendNoteChange(noteId, {
              title,
              content,
            });
          }
        }
      }, 2000);
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [title, content, currentNote, accessToken, saveNote, getNoteId]);

  const loadNotes = useCallback(async () => {
    try {
      setLoading(true);
      const filters = {};
      if (filterFavorite) filters.is_favorite = 'true';
      if (dateFrom) filters.date_from = dateFrom;
      if (dateTo) filters.date_to = dateTo;
      if (searchQuery.trim()) filters.search = searchQuery.trim();
      filters.sort_by = sortBy === 'updated' ? 'updated_at' : sortBy === 'created' ? 'created_at' : 'title';
      filters.sort_order = sortOrder;
      
      const response = await notesService.listNotes(null, false, filters);
      setNotes(response.data?.notes || []);
    } catch (err) {
      console.error('Failed to load notes:', err);
      showToast('Erreur lors du chargement des notes', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast, filterFavorite, dateFrom, dateTo, searchQuery, sortBy, sortOrder]);

  const loadNote = useCallback(async (noteId) => {
    // Vérifier que noteId est valide et le convertir en string
    if (!noteId) {
      console.error('Invalid note ID: null or undefined');
      navigate('/notes');
      return;
    }
    
    // Convertir en string si c'est un objet
    const noteIdString = typeof noteId === 'string' ? noteId : String(noteId);
    
    if (noteIdString === 'undefined' || noteIdString === '[object Object]' || noteIdString === 'null') {
      console.error('Invalid note ID:', noteIdString);
      navigate('/notes');
      return;
    }
    
    try {
      setLoading(true);
      const response = await notesService.getNote(noteIdString);
      const note = response.data?.note;
      
      if (!note) {
        console.error('Note not found:', noteIdString);
        showToast('Note non trouvée', 'error');
        navigate('/notes');
        return;
      }
      
      setCurrentNote(note);
      setTitle(note.title || '');
      setContent(note.content || '');
    } catch (err) {
      console.error('Failed to load note:', err);
      const errorMsg = err.response?.data?.error?.message || err.message || 'Erreur lors du chargement de la note';
      showToast(`Erreur: ${errorMsg}`, 'error');
      navigate('/notes');
    } finally {
      setLoading(false);
    }
  }, [navigate, showToast]);

  const saveNote = useCallback(async () => {
    if (!currentNote) return;

    const noteId = getNoteId(currentNote);
    if (!noteId) {
      console.error('Cannot save note: invalid ID');
      showToast('Erreur: ID de note invalide', 'error');
      return;
    }

    try {
      setSaving(true);
      await notesService.updateNote(noteId, {
        title,
        content,
        version: currentNote.version,
      });
      setLastSaved(new Date());
      showToast('Note enregistrée avec succès', 'success', 2000);
      await loadNote(noteId);
    } catch (err) {
      console.error('Failed to save note:', err);
      if (err.response?.status === 409) {
        showToast('La note a été modifiée par un autre utilisateur. Rechargement...', 'warning');
        await loadNote(noteId);
      } else {
        showToast('Erreur lors de l\'enregistrement', 'error');
      }
    } finally {
      setSaving(false);
    }
  }, [currentNote, title, content, getNoteId, loadNote, showToast]);

  // Fonction utilitaire pour extraire l'ID de manière sécurisée (mémorisée)
  const getNoteId = useCallback((note) => {
    if (!note) return null;
    if (note.id) {
      return typeof note.id === 'string' ? note.id : String(note.id);
    }
    if (note._id) {
      return typeof note._id === 'string' ? note._id : String(note._id);
    }
    return null;
  }, []);

  const createNote = useCallback(async () => {
    try {
      const response = await notesService.createNote('Nouvelle note');
      const note = response.data?.note;
      const noteId = getNoteId(note);
      if (noteId) {
        showToast('Note créée avec succès', 'success');
        navigate(`/notes/${noteId}`);
      } else {
        console.error('Failed to get note ID from created note:', note);
        showToast('Erreur: Impossible de récupérer l\'ID de la note créée', 'error');
      }
    } catch (err) {
      console.error('Failed to create note:', err);
      showToast('Erreur lors de la création de la note', 'error');
    }
  }, [getNoteId, navigate, showToast]);

  const deleteNote = useCallback(async (noteId) => {
    if (!window.confirm('Voulez-vous vraiment supprimer cette note ?')) return;

    try {
      await notesService.deleteNote(noteId);
      showToast('Note supprimée avec succès', 'success');
      if (currentNote && getNoteId(currentNote) === noteId) {
        navigate('/notes');
      }
      loadNotes();
    } catch (err) {
      console.error('Failed to delete note:', err);
      showToast('Erreur lors de la suppression', 'error');
    }
  }, [currentNote, getNoteId, navigate, loadNotes, showToast]);

  const toggleFavorite = useCallback(async (noteId, e) => {
    e?.stopPropagation(); // Empêcher la navigation
    try {
      const response = await notesService.toggleFavorite(noteId);
      const isFavorite = response.data?.is_favorite;
      showToast(isFavorite ? 'Note ajoutée aux favoris' : 'Note retirée des favoris', 'success', 2000);
      
      // Mettre à jour la note dans la liste
      setNotes(prev => prev.map(note => {
        const noteIdStr = getNoteId(note);
        if (noteIdStr === noteId) {
          return { ...note, is_favorite: isFavorite };
        }
        return note;
      }));
      
      // Mettre à jour la note actuelle si nécessaire
      if (currentNote && getNoteId(currentNote) === noteId) {
        setCurrentNote(prev => ({ ...prev, is_favorite: isFavorite }));
      }
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
      showToast('Erreur lors de la mise à jour', 'error');
    }
  }, [getNoteId, currentNote, showToast]);

  const exportNote = useCallback(async (noteId, format, e) => {
    e?.stopPropagation(); // Empêcher la navigation
    try {
      await notesService.exportNote(noteId, format);
      showToast(`Note exportée en ${format.toUpperCase()}`, 'success', 2000);
    } catch (err) {
      console.error('Failed to export note:', err);
      showToast('Erreur lors de l\'export', 'error');
    }
  }, [showToast]);

  const saveNoteFromList = useCallback(async (noteId, e) => {
    e?.stopPropagation(); // Empêcher la navigation
    const note = notes.find(n => getNoteId(n) === noteId);
    if (!note) return;
    
    try {
      await notesService.updateNote(noteId, {
        title: note.title,
        content: note.content,
        version: note.version,
      });
      showToast('Note sauvegardée', 'success', 2000);
      loadNotes();
    } catch (err) {
      console.error('Failed to save note:', err);
      showToast('Erreur lors de la sauvegarde', 'error');
    }
  }, [notes, getNoteId, loadNotes, showToast]);

  const formatDate = useCallback((dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours} h`;
    if (diffDays < 7) return `Il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
    
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, []);

  // Raccourcis clavier
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+S ou Cmd+S pour sauvegarder
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (currentNote && !saving) {
          saveNote();
        }
      }
      // Ctrl+N ou Cmd+N pour nouvelle note
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        createNote();
      }
      // Ctrl+F ou Cmd+F pour focus recherche (si pas dans un input)
      if ((e.ctrlKey || e.metaKey) && e.key === 'f' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        const searchInput = document.querySelector('input[placeholder*="Rechercher"]');
        if (searchInput) searchInput.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentNote, saving, saveNote, createNote]);

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

          {/* Filtres avancés */}
          <div style={{ marginBottom: '12px' }}>
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              style={{
                width: '100%',
                padding: '8px 12px',
                backgroundColor: theme === 'dark' ? '#2d2d2d' : '#f8fafc',
                color: textColor,
                border: `1px solid ${theme === 'dark' ? borderColor : '#e2e8f0'}`,
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span>🔍 Filtres avancés</span>
              <span>{showAdvancedFilters ? '▲' : '▼'}</span>
            </button>
            
            {showAdvancedFilters && (
              <div style={{
                marginTop: '8px',
                padding: '12px',
                backgroundColor: theme === 'dark' ? '#2d2d2d' : '#f8fafc',
                borderRadius: '6px',
                border: `1px solid ${theme === 'dark' ? borderColor : '#e2e8f0'}`,
              }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '12px', color: textColor }}>
                  <input
                    type="checkbox"
                    checked={filterFavorite}
                    onChange={(e) => setFilterFavorite(e.target.checked)}
                    style={{ cursor: 'pointer' }}
                  />
                  ⭐ Favoris uniquement
                </label>
                <div style={{ marginBottom: '8px' }}>
                  <label style={{ fontSize: '11px', color: textSecondary, display: 'block', marginBottom: '4px' }}>
                    Du
                  </label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px',
                      backgroundColor: theme === 'dark' ? '#1e1e1e' : '#ffffff',
                      color: textColor,
                      border: `1px solid ${borderColor}`,
                      borderRadius: '4px',
                      fontSize: '12px',
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: textSecondary, display: 'block', marginBottom: '4px' }}>
                    Au
                  </label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px',
                      backgroundColor: theme === 'dark' ? '#1e1e1e' : '#ffffff',
                      color: textColor,
                      border: `1px solid ${borderColor}`,
                      borderRadius: '4px',
                      fontSize: '12px',
                    }}
                  />
                </div>
              </div>
            )}
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
          ) : filteredAndSortedNotes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: textSecondary }}>
              {searchQuery ? 'Aucune note trouvée' : 'Aucune note'}
            </div>
          ) : (
            <>
              {/* Options de tri */}
              <div style={{
                padding: '8px 12px',
                borderBottom: `1px solid ${theme === 'dark' ? borderColor : '#e2e8f0'}`,
                display: 'flex',
                gap: '8px',
                alignItems: 'center',
                fontSize: '12px',
                color: textSecondary,
              }}>
                <span>Trier par:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  style={{
                    padding: '4px 8px',
                    backgroundColor: theme === 'dark' ? '#2d2d2d' : '#ffffff',
                    color: textColor,
                    border: `1px solid ${borderColor}`,
                    borderRadius: '4px',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  <option value="updated">Date de modification</option>
                  <option value="created">Date de création</option>
                  <option value="title">Titre</option>
                </select>
                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  style={{
                    padding: '4px 8px',
                    backgroundColor: theme === 'dark' ? '#2d2d2d' : '#ffffff',
                    color: textColor,
                    border: `1px solid ${borderColor}`,
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px',
                  }}
                  title={sortOrder === 'asc' ? 'Tri croissant' : 'Tri décroissant'}
                >
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </button>
              </div>
              {filteredAndSortedNotes.map((note, index) => {
              const noteId = getNoteId(note) || `note-${index}`;
              const currentNoteId = getNoteId(currentNote);
              const isSelected = currentNoteId && currentNoteId === noteId;
              
              return (
                <div
                  key={noteId}
                  onClick={() => {
                    if (noteId && noteId !== `note-${index}`) {
                      navigate(`/notes/${noteId}`);
                    }
                  }}
                  style={{
                    padding: '14px',
                    marginBottom: '10px',
                    borderRadius: '10px',
                    backgroundColor: isSelected
                      ? (theme === 'dark' ? hoverBg : '#e0f2fe')
                      : (theme === 'dark' ? 'transparent' : '#ffffff'),
                    border: isSelected
                      ? `2px solid ${theme === 'dark' ? '#2196F3' : '#2196F3'}`
                      : `1px solid ${theme === 'dark' ? borderColor : '#e2e8f0'}`,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: isSelected
                      ? (theme === 'dark' ? '0 2px 8px rgba(0,0,0,0.3)' : '0 4px 12px rgba(33,150,243,0.15)')
                      : (theme === 'dark' ? 'none' : '0 1px 3px rgba(0,0,0,0.08)'),
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = theme === 'dark' ? hoverBg : '#f8fafc';
                      e.currentTarget.style.borderColor = theme === 'dark' ? borderColor : '#cbd5e1';
                      e.currentTarget.style.boxShadow = theme === 'dark' 
                        ? '0 2px 8px rgba(0,0,0,0.2)' 
                        : '0 4px 12px rgba(0,0,0,0.12)';
                      e.currentTarget.style.transform = 'translateX(4px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = theme === 'dark' ? 'transparent' : '#ffffff';
                      e.currentTarget.style.borderColor = theme === 'dark' ? borderColor : '#e2e8f0';
                      e.currentTarget.style.boxShadow = theme === 'dark' ? 'none' : '0 1px 3px rgba(0,0,0,0.08)';
                      e.currentTarget.style.transform = 'translateX(0)';
                    }
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '4px',
                  }}>
                    <div style={{
                      fontSize: '16px',
                      fontWeight: '600',
                      color: textColor,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      flex: 1,
                    }}>
                      {note.is_favorite && <span style={{ marginRight: '4px' }}>⭐</span>}
                      {note.title}
                    </div>
                    <div style={{
                      display: 'flex',
                      gap: '4px',
                      alignItems: 'center',
                    }}>
                      <button
                        onClick={(e) => toggleFavorite(noteId, e)}
                        style={{
                          padding: '4px 6px',
                          backgroundColor: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '14px',
                          color: note.is_favorite ? '#FFD700' : textSecondary,
                          borderRadius: '4px',
                        }}
                        title={note.is_favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = theme === 'dark' ? '#333333' : '#f1f5f9';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        ⭐
                      </button>
                    </div>
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
                    marginBottom: '8px',
                  }}
                  dangerouslySetInnerHTML={{
                    __html: note.content?.replace(new RegExp('<[^>]*>', 'g'), '').substring(0, 50) || ''
                  }}
                  />
                  {/* Boutons d'action */}
                  <div style={{
                    display: 'flex',
                    gap: '4px',
                    justifyContent: 'flex-end',
                    marginTop: '8px',
                  }}>
                    <button
                      onClick={(e) => saveNoteFromList(noteId, e)}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: theme === 'dark' ? '#2d2d2d' : '#e3f2fd',
                        color: theme === 'dark' ? textColor : '#1976d2',
                        border: `1px solid ${theme === 'dark' ? borderColor : '#90caf9'}`,
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '11px',
                        fontWeight: '500',
                      }}
                      title="Sauvegarder"
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = theme === 'dark' ? '#333333' : '#bbdefb';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = theme === 'dark' ? '#2d2d2d' : '#e3f2fd';
                      }}
                    >
                      💾
                    </button>
                    <button
                      onClick={(e) => exportNote(noteId, 'txt', e)}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: theme === 'dark' ? '#2d2d2d' : '#f3e5f5',
                        color: theme === 'dark' ? textColor : '#7b1fa2',
                        border: `1px solid ${theme === 'dark' ? borderColor : '#ce93d8'}`,
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '11px',
                        fontWeight: '500',
                      }}
                      title="Exporter (TXT)"
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = theme === 'dark' ? '#333333' : '#e1bee7';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = theme === 'dark' ? '#2d2d2d' : '#f3e5f5';
                      }}
                    >
                      📥
                    </button>
                    <button
                      onClick={(e) => exportNote(noteId, 'md', e)}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: theme === 'dark' ? '#2d2d2d' : '#fff3e0',
                        color: theme === 'dark' ? textColor : '#e65100',
                        border: `1px solid ${theme === 'dark' ? borderColor : '#ffcc80'}`,
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '11px',
                        fontWeight: '500',
                      }}
                      title="Exporter (Markdown)"
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = theme === 'dark' ? '#333333' : '#ffe0b2';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = theme === 'dark' ? '#2d2d2d' : '#fff3e0';
                      }}
                    >
                      📄
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNote(noteId);
                      }}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: theme === 'dark' ? '#2d2d2d' : '#ffebee',
                        color: theme === 'dark' ? '#e57373' : '#c62828',
                        border: `1px solid ${theme === 'dark' ? borderColor : '#ef9a9a'}`,
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '11px',
                        fontWeight: '500',
                      }}
                      title="Supprimer"
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = theme === 'dark' ? '#333333' : '#ffcdd2';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = theme === 'dark' ? '#2d2d2d' : '#ffebee';
                      }}
                    >
                      🗑️
                    </button>
                  </div>
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
                  onClick={() => {
                    const noteId = getNoteId(currentNote);
                    if (noteId) {
                      deleteNote(noteId);
                    }
                  }}
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
          noteId={getNoteId(currentNote)} 
          onClose={() => setShowComments(false)} 
        />
      )}
      {showVersions && currentNote && (
        <NoteVersions 
          noteId={getNoteId(currentNote)} 
          onClose={() => setShowVersions(false)} 
          onRestore={() => {
            const noteId = getNoteId(currentNote);
            if (noteId) {
              loadNote(noteId);
            }
          }} 
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
      <ToastContainer />
    </div>
  );
}

