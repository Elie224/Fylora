import React, { useEffect, useState } from 'react';
import { noteVersionsService } from '../services/noteVersionsService';
import { useTheme } from '../contexts/ThemeContext';

export default function NoteVersions({ noteId, onClose, onRestore }) {
  const { theme } = useTheme();
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVersions, setSelectedVersions] = useState([]);
  const [comparison, setComparison] = useState(null);

  const cardBg = theme === 'dark' ? '#1e1e1e' : '#ffffff';
  const textColor = theme === 'dark' ? '#e0e0e0' : '#1a202c';
  const borderColor = theme === 'dark' ? '#333333' : '#e2e8f0';
  const textSecondary = theme === 'dark' ? '#b0b0b0' : '#4a5568';

  useEffect(() => {
    if (noteId) {
      loadVersions();
    }
  }, [noteId]);

  const loadVersions = async () => {
    try {
      setLoading(true);
      const response = await noteVersionsService.listVersions(noteId);
      setVersions(response.data?.versions || []);
    } catch (err) {
      console.error('Failed to load versions:', err);
    } finally {
      setLoading(false);
    }
  };

  const compareVersions = async () => {
    if (selectedVersions.length !== 2) {
      alert('Sélectionnez exactement 2 versions à comparer');
      return;
    }

    try {
      const response = await noteVersionsService.compareVersions(
        noteId,
        selectedVersions[0],
        selectedVersions[1]
      );
      setComparison(response.data?.comparison);
    } catch (err) {
      console.error('Failed to compare versions:', err);
      alert('Erreur lors de la comparaison');
    }
  };

  const restoreVersion = async (versionId) => {
    if (!confirm('Voulez-vous restaurer cette version ?')) return;

    try {
      await noteVersionsService.restoreVersion(noteId, versionId);
      alert('Version restaurée avec succès');
      if (onRestore) onRestore();
      loadVersions();
    } catch (err) {
      console.error('Failed to restore version:', err);
      alert('Erreur lors de la restauration');
    }
  };

  const formatDate = (dateString) => {
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
      position: 'fixed',
      right: 0,
      top: 0,
      bottom: 0,
      width: '500px',
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
        <h3 style={{ margin: 0, color: textColor }}>📚 Historique des versions</h3>
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
        padding: '16px',
        borderBottom: `1px solid ${borderColor}`,
      }}>
        <button
          onClick={compareVersions}
          disabled={selectedVersions.length !== 2}
          style={{
            width: '100%',
            padding: '8px',
            backgroundColor: selectedVersions.length === 2 ? '#2196F3' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: selectedVersions.length === 2 ? 'pointer' : 'not-allowed',
            fontSize: '14px',
          }}
        >
          Comparer ({selectedVersions.length}/2)
        </button>
      </div>

      {comparison && (
        <div style={{
          padding: '16px',
          borderBottom: `1px solid ${borderColor}`,
          backgroundColor: theme === 'dark' ? '#2d2d2d' : '#f7fafc',
        }}>
          <h4 style={{ margin: '0 0 12px 0', color: textColor }}>Comparaison</h4>
          <div style={{ fontSize: '14px', color: textColor }}>
            <div>Titre changé: {comparison.differences.title_changed ? 'Oui' : 'Non'}</div>
            <div>Contenu changé: {comparison.differences.content_changed ? 'Oui' : 'Non'}</div>
            <div>Différence de taille: {comparison.differences.content_length_diff} caractères</div>
          </div>
          <button
            onClick={() => setComparison(null)}
            style={{
              marginTop: '8px',
              padding: '4px 8px',
              backgroundColor: 'transparent',
              border: `1px solid ${borderColor}`,
              color: textColor,
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Fermer
          </button>
        </div>
      )}

      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px',
      }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: textSecondary }}>Chargement...</div>
        ) : versions.length === 0 ? (
          <div style={{ textAlign: 'center', color: textSecondary, padding: '20px' }}>
            Aucune version sauvegardée
          </div>
        ) : (
          versions.map((version) => (
            <div
              key={version._id || version.id}
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
                <div>
                  <div style={{ fontWeight: '600', color: textColor }}>
                    Version {version.version_number}
                  </div>
                  <div style={{ fontSize: '12px', color: textSecondary }}>
                    {formatDate(version.created_at)}
                  </div>
                </div>
                <div>
                  <input
                    type="checkbox"
                    checked={selectedVersions.includes(version._id || version.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        if (selectedVersions.length < 2) {
                          setSelectedVersions([...selectedVersions, version._id || version.id]);
                        }
                      } else {
                        setSelectedVersions(selectedVersions.filter(id => id !== (version._id || version.id)));
                      }
                    }}
                    style={{ marginRight: '8px' }}
                  />
                  <button
                    onClick={() => restoreVersion(version._id || version.id)}
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
                    Restaurer
                  </button>
                </div>
              </div>
              <div style={{ fontSize: '12px', color: textSecondary }}>
                {version.title}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}





