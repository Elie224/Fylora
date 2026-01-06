import React, { useEffect, useState } from 'react';
import { fileService, folderService } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../components/Toast';

export default function Trash() {
  const { t, language } = useLanguage(); // Inclure language pour forcer le re-render
  const { theme } = useTheme();
  const { showToast } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Couleurs dynamiques selon le thème - Thème clair amélioré
  const cardBg = theme === 'dark' ? '#1e1e1e' : '#ffffff';
  const textColor = theme === 'dark' ? '#e0e0e0' : '#1a202c';
  const borderColor = theme === 'dark' ? '#333333' : '#e2e8f0';
  const secondaryBg = theme === 'dark' ? '#2d2d2d' : '#f7fafc';
  const hoverBg = theme === 'dark' ? '#2d2d2d' : '#f0f4f8';
  const textSecondary = theme === 'dark' ? '#b0b0b0' : '#4a5568';
  const bgColor = theme === 'dark' ? '#121212' : '#fafbfc';
  const shadowColor = theme === 'dark' ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.08)';

  useEffect(() => {
    loadTrash();
  }, []);

  const loadTrash = async (forceRefresh = false) => {
    try {
      setLoading(true);
      
      // Ne pas vider immédiatement pour éviter le flash blanc
      // setFiles([]);
      // setFolders([]);
      
      // Forcer le rechargement sans cache si demandé
      const params = forceRefresh ? { _t: Date.now() } : {};
      
      // Charger les fichiers supprimés
      const filesResponse = await fileService.listTrash(forceRefresh ? params : {});
      if (filesResponse?.data?.data?.items) {
        setFiles(filesResponse.data.data.items);
      } else {
        setFiles([]);
      }
      
      // Charger les dossiers supprimés
      const foldersResponse = await folderService.listTrash(forceRefresh ? params : {});
      if (foldersResponse?.data?.data?.items) {
        setFolders(foldersResponse.data.data.items);
      } else {
        setFolders([]);
      }
    } catch (err) {
      console.error('Failed to load trash:', err);
      console.error('Error response:', err.response?.data);
      const errorMsg = err.response?.data?.error?.message || err.message || t('loadError');
      showToast(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const restoreFile = async (fileId) => {
    try {
      // Mise à jour optimiste : supprimer le fichier de la liste immédiatement
      setFiles(prevFiles => prevFiles.filter(file => (file.id || file._id) !== fileId));
      
      await fileService.restore(fileId);
      
      // Recharger la liste immédiatement (forcer le rechargement)
      await loadTrash(true);
      
      // Naviguer automatiquement vers Files pour voir le fichier restauré
      setTimeout(() => {
        window.location.href = '/files';
      }, 300);
    } catch (err) {
      console.error('Failed to restore file:', err);
      showToast(t('restoreError'), 'error');
      // Recharger en cas d'erreur pour récupérer l'état correct
      await loadTrash(true);
    }
  };

  const restoreFolder = async (folderId) => {
    try {
      // Mise à jour optimiste : supprimer le dossier de la liste immédiatement
      setFolders(prevFolders => prevFolders.filter(folder => (folder.id || folder._id) !== folderId));
      
      await folderService.restore(folderId);
      
      // Recharger la liste immédiatement (forcer le rechargement)
      await loadTrash(true);
      
      // Naviguer automatiquement vers Files pour voir le dossier restauré
      setTimeout(() => {
        window.location.href = '/files';
      }, 300);
    } catch (err) {
      console.error('Failed to restore folder:', err);
      showToast(t('restoreError'), 'error');
      // Recharger en cas d'erreur pour récupérer l'état correct
      await loadTrash(true);
    }
  };

  const permanentDeleteFile = async (fileId) => {
    const confirmMessage = t('permanentDeleteConfirm') || 'Êtes-vous sûr de vouloir supprimer définitivement ce fichier ? Cette action est irréversible.';
    const confirmed = await confirm(confirmMessage, t('confirmAction'));
    if (!confirmed) {
      return;
    }
    try {
      await fileService.permanentDelete(fileId);
      // Mise à jour optimiste : supprimer le fichier de la liste immédiatement
      setFiles(prevFiles => prevFiles.filter(file => (file.id || file._id) !== fileId));
      // Recharger la liste (forcer le rechargement)
      await loadTrash(true);
      showToast(t('permanentDeleteSuccess') || 'Fichier supprimé définitivement', 'success');
    } catch (err) {
      console.error('Failed to permanently delete file:', err);
      const errorMsg = err.response?.data?.error?.message || err.message || (t('permanentDeleteError') || 'Erreur lors de la suppression définitive');
      showToast(errorMsg, 'error');
      // Recharger en cas d'erreur pour récupérer l'état correct
      await loadTrash();
    }
  };

  const permanentDeleteFolder = async (folderId) => {
    const confirmMessage = t('permanentDeleteFolderConfirm') || 'Êtes-vous sûr de vouloir supprimer définitivement ce dossier et tous ses fichiers ? Cette action est irréversible.';
    const confirmed = await confirm(confirmMessage, t('confirmAction'));
    if (!confirmed) {
      return;
    }
    try {
      await folderService.permanentDelete(folderId);
      // Mise à jour optimiste : supprimer le dossier de la liste immédiatement
      setFolders(prevFolders => prevFolders.filter(folder => (folder.id || folder._id) !== folderId));
      // Recharger la liste (forcer le rechargement)
      await loadTrash(true);
      showToast(t('permanentDeleteSuccess') || 'Dossier supprimé définitivement', 'success');
    } catch (err) {
      console.error('Failed to permanently delete folder:', err);
      const errorMsg = err.response?.data?.error?.message || err.message || (t('permanentDeleteError') || 'Erreur lors de la suppression définitive');
      showToast(errorMsg, 'error');
      // Recharger en cas d'erreur pour récupérer l'état correct
      await loadTrash();
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '-';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (date) => {
    if (!date) return '-';
    const locale = language === 'en' ? 'en-US' : 'fr-FR';
    return new Date(date).toLocaleString(locale);
  };

  if (loading) {
    return (
      <div style={{ 
        padding: 24, 
        textAlign: 'center',
        color: theme === 'dark' ? '#b0b0b0' : '#666',
        backgroundColor: theme === 'dark' ? '#121212' : 'transparent',
        minHeight: '100vh'
      }}>
        {t('loading')}
      </div>
    );
  }

  const allItems = [
    ...files.map(f => ({ ...f, type: 'file' })),
    ...folders.map(f => ({ ...f, type: 'folder' }))
  ].sort((a, b) => {
    const dateA = new Date(a.deleted_at || a.created_at);
    const dateB = new Date(b.deleted_at || b.created_at);
    return dateB - dateA;
  });

  return (
    <>
      <ConfirmDialog />
      <div style={{ 
      padding: '24px', 
      maxWidth: '1400px', 
      margin: '0 auto',
      backgroundColor: bgColor,
      minHeight: '100vh'
    }}>
      <h1 style={{ 
        fontSize: '28px',
        marginBottom: '24px',
        fontWeight: '700',
        color: textColor
      }}>🗑️ {t('trash')}</h1>
      
      {allItems.length === 0 ? (
        <div style={{ 
          padding: '48px 24px', 
          textAlign: 'center', 
          backgroundColor: cardBg,
          borderRadius: '12px',
          boxShadow: shadowColor,
          border: `1px solid ${borderColor}`
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🗑️</div>
          <p style={{ fontSize: '18px', color: textSecondary, margin: 0 }}>{t('trashEmpty')}</p>
        </div>
      ) : (
        <>
          <div style={{ 
            marginBottom: '20px',
            padding: '16px 20px',
            backgroundColor: theme === 'dark' ? '#3d2f0f' : '#fff3e0',
            borderRadius: '8px',
            border: `1px solid ${theme === 'dark' ? '#5d4f2f' : '#ffcc80'}`
          }}>
            <p style={{ margin: 0, color: theme === 'dark' ? '#ffb74d' : '#e65100', fontSize: '15px', fontWeight: '500' }}>
              📊 {allItems.length} {allItems.length > 1 ? t('itemsInTrashPlural') : t('itemsInTrash')}
            </p>
          </div>
          
          <div style={{ 
            overflowX: 'auto', 
            borderRadius: '12px',
            boxShadow: shadowColor,
            backgroundColor: cardBg,
            border: `1px solid ${borderColor}`
          }}>
            <table style={{ 
              width: '100%', 
              borderCollapse: 'separate',
              borderSpacing: 0,
              minWidth: '600px'
            }}>
              <thead>
                <tr style={{ 
                  backgroundColor: secondaryBg,
                  borderBottom: `2px solid ${borderColor}`
                }}>
                  <th style={{ 
                    textAlign: 'left', 
                    padding: '16px',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: textColor,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>{t('name')}</th>
                  <th style={{ 
                    textAlign: 'left', 
                    padding: '16px',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: textColor,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>{t('type')}</th>
                  <th style={{ 
                    textAlign: 'left', 
                    padding: '16px',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: textColor,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>{t('size')}</th>
                  <th style={{ 
                    textAlign: 'left', 
                    padding: '16px',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: textColor,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>{t('deletedOn')}</th>
                  <th style={{ 
                    textAlign: 'left', 
                    padding: '16px',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: textColor,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {allItems.map((item, index) => (
                  <tr 
                    key={item.id} 
                    style={{ 
                      borderBottom: index < allItems.length - 1 ? `1px solid ${borderColor}` : 'none',
                      backgroundColor: index % 2 === 0 ? cardBg : (theme === 'dark' ? '#252525' : '#fafafa'),
                      transition: 'background-color 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = hoverBg;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = index % 2 === 0 ? cardBg : (theme === 'dark' ? '#252525' : '#fafafa');
                    }}
                  >
                    <td style={{ padding: '16px', fontSize: '15px' }}>
                      <span style={{ 
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <span style={{ fontSize: item.type === 'folder' ? '20px' : '18px' }}>
                          {item.type === 'folder' ? '📁' : '📄'}
                        </span>
                        <span style={{ fontWeight: item.type === 'folder' ? '600' : '400', color: item.type === 'folder' ? '#2196F3' : textColor }}>
                          {item.name}
                        </span>
                      </span>
                    </td>
                    <td style={{ padding: '16px', fontSize: '14px', color: textSecondary }}>
                      {item.type === 'folder' ? t('folder') : item.mime_type || t('file')}
                    </td>
                    <td style={{ padding: '16px', fontSize: '14px', color: textSecondary }}>
                      {item.type === 'file' ? formatBytes(item.size) : '-'}
                    </td>
                    <td style={{ padding: '16px', fontSize: '14px', color: textSecondary }}>
                      {formatDate(item.deleted_at)}
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => item.type === 'file' ? restoreFile(item.id) : restoreFolder(item.id)}
                          style={{
                            padding: '8px 16px',
                            backgroundColor: '#4CAF50',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '600',
                            transition: 'background-color 0.2s',
                            boxShadow: '0 2px 4px rgba(76, 175, 80, 0.3)'
                          }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = '#45a049'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = '#4CAF50'}
                        >
                          {t('restore') || 'Restaurer'}
                        </button>
                        <button
                          onClick={() => item.type === 'file' ? permanentDeleteFile(item.id) : permanentDeleteFolder(item.id)}
                          style={{
                            padding: '8px 16px',
                            backgroundColor: '#f44336',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '600',
                            transition: 'background-color 0.2s',
                            boxShadow: '0 2px 4px rgba(244, 67, 54, 0.3)'
                          }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = '#d32f2f'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = '#f44336'}
                        >
                          {t('permanentDelete') || 'Supprimer définitivement'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
    </>
  );
}

