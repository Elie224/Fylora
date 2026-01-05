import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { fileService } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuthStore } from '../services/authStore';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../components/Toast';

// Composant pour charger et afficher les miniatures avec authentification
function ThumbnailImage({ fileId, fileName, isImage, style, onError, onOrphanDetected }) {
  const [imageUrl, setImageUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const { theme } = useTheme();
  const textSecondary = theme === 'dark' ? '#b0b0b0' : '#64748b';

  useEffect(() => {
    if (!isImage || !fileId) {
      setLoading(false);
      return;
    }

    // Vérifier si le fichier est déjà marqué comme orphelin
    // (via le callback parent si disponible)
    const loadThumbnail = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';
        const token = localStorage.getItem('access_token');
        
        if (!token) {
          throw new Error('No token');
        }

        const response = await fetch(`${apiUrl}/api/files/${fileId}/preview`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          // Si 404, le fichier n'existe plus sur le disque (orphan file)
          if (response.status === 404) {
            console.warn('File not found on disk (orphan file):', fileId);
            setError(true);
            setLoading(false);
            // Notifier le parent que ce fichier est orphelin
            if (onOrphanDetected) {
              onOrphanDetected(fileId);
            }
            return;
          }
          throw new Error('Failed to load');
        }

        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        setImageUrl(objectUrl);
      } catch (err) {
        console.error('Failed to load thumbnail:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    loadThumbnail();

    return () => {
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [fileId, isImage]);

  if (!isImage) {
    return (
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme === 'dark' ? '#2d2d2d' : '#f5f5f5',
        position: 'relative',
        ...style
      }}>
        <div style={{ fontSize: '48px' }}>🎬</div>
        <div style={{
          position: 'absolute',
          bottom: '8px',
          right: '8px',
          backgroundColor: 'rgba(0,0,0,0.7)',
          color: 'white',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '12px',
        }}>
          ▶️
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme === 'dark' ? '#2d2d2d' : '#f5f5f5',
        color: textSecondary,
        ...style
      }}>
        <div>⏳</div>
      </div>
    );
  }

  if (error || !imageUrl) {
    return (
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme === 'dark' ? '#2d2d2d' : '#f5f5f5',
        color: textSecondary,
        padding: '12px',
        textAlign: 'center',
        ...style
      }}>
        <div style={{ fontSize: '32px', marginBottom: '8px', opacity: 0.5 }}>🖼️</div>
        <div style={{ fontSize: '11px', wordBreak: 'break-word', opacity: 0.7 }}>
          {fileName}
        </div>
        <div style={{ fontSize: '10px', marginTop: '4px', opacity: 0.5 }}>
          Fichier non disponible
        </div>
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={fileName}
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        ...style
      }}
      onError={() => {
        setError(true);
        if (onError) onError();
      }}
    />
  );
}

export default function Gallery() {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { theme } = useTheme();
  const { showToast, ToastContainer } = useToast();
  const [mediaFiles, setMediaFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'timeline'
  const [filterType, setFilterType] = useState('all'); // 'all' | 'images' | 'videos'
  const [selectedFile, setSelectedFile] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [groupedByDate, setGroupedByDate] = useState({});
  const [orphanFiles, setOrphanFiles] = useState(new Set()); // Fichiers orphelins détectés

  const cardBg = theme === 'dark' ? '#1e1e1e' : '#ffffff';
  const textColor = theme === 'dark' ? '#e0e0e0' : '#1a202c';
  const borderColor = theme === 'dark' ? '#333333' : '#e2e8f0';
  const textSecondary = theme === 'dark' ? '#b0b0b0' : '#64748b';
  const bgColor = theme === 'dark' ? '#121212' : '#f8fafc';
  const hoverBg = theme === 'dark' ? '#2d2d2d' : '#f1f5f9';

  const loadMediaFiles = useCallback(async () => {
    try {
      setLoading(true);
      
      // Charger TOUS les fichiers de l'utilisateur (pas seulement ceux du dossier actuel)
      // Utiliser l'endpoint de recherche avec un filtre pour images et vidéos
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';
      const token = localStorage.getItem('access_token');
      
      if (!token) {
        throw new Error('Non authentifié');
      }

      // Utiliser l'API de recherche pour récupérer TOUS les fichiers images et vidéos
      // de tous les dossiers, pas seulement ceux du dossier actuel
      let allMediaFiles = [];
      
      try {
        // Méthode 1 : Utiliser l'endpoint de recherche avec filtre mime_type
        // Rechercher les images
        const imagesResponse = await fetch(
          `${apiUrl}/api/search?mime_type=image&limit=1000`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        // Rechercher les vidéos
        const videosResponse = await fetch(
          `${apiUrl}/api/search?mime_type=video&limit=1000`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (imagesResponse.ok) {
          const imagesData = await imagesResponse.json();
          const images = imagesData?.data?.items || imagesData?.items || [];
          allMediaFiles = [...allMediaFiles, ...images];
        }

        if (videosResponse.ok) {
          const videosData = await videosResponse.json();
          const videos = videosData?.data?.items || videosData?.items || [];
          allMediaFiles = [...allMediaFiles, ...videos];
        }
      } catch (searchErr) {
        console.warn('Erreur lors de la recherche par type MIME:', searchErr);
      }

      // Méthode 2 : Si la recherche ne retourne rien, utiliser fileService avec un filtre
      // Récupérer tous les fichiers et filtrer côté client
      if (allMediaFiles.length === 0) {
        try {
          // Récupérer tous les fichiers (sans limite de dossier)
          const response = await fileService.list(null, { limit: 1000, sort_by: 'updated_at', sort_order: 'desc' });
          const allFiles = response?.data?.data?.items || response?.data?.items || [];
          
          // Filtrer uniquement les images et vidéos
          allMediaFiles = allFiles.filter(file => {
            if (!file) return false;
            const mimeType = file.mime_type || '';
            return mimeType.startsWith('image/') || mimeType.startsWith('video/');
          });
        } catch (listErr) {
          console.error('Erreur lors du chargement des fichiers:', listErr);
          throw listErr;
        }
      }

      // Trier par date de création (plus récent en premier)
      allMediaFiles.sort((a, b) => {
        const dateA = new Date(a.created_at || a.updated_at || 0);
        const dateB = new Date(b.created_at || b.updated_at || 0);
        return dateB - dateA;
      });

      // Note: Les fichiers orphelins (qui n'existent plus sur le disque) seront détectés
      // lors du chargement des miniatures et affichés avec un message d'erreur
      // Le système de nettoyage automatique les supprimera de la base de données
      setMediaFiles(allMediaFiles);

      // Note: Le groupement par date sera mis à jour dynamiquement
      // quand les fichiers orphelins seront détectés et filtrés
      setGroupedByDate({});
    } catch (err) {
      console.error('Failed to load media files:', err);
      const errorMessage = err.response?.data?.error?.message || err.message || 'Erreur inconnue';
      setMediaFiles([]); // Vider la liste en cas d'erreur
      setGroupedByDate({});
      
      // Afficher l'erreur avec showToast si disponible (sans dépendance pour éviter les re-renders)
      const toastFn = showToast;
      if (toastFn && typeof toastFn === 'function') {
        try {
          toastFn(`Erreur lors du chargement de la galerie: ${errorMessage}`, 'error');
        } catch (toastErr) {
          console.error('Erreur lors de l\'affichage du toast:', toastErr);
        }
      }
    } finally {
      setLoading(false);
    }
  }, []); // Pas de dépendances pour éviter les re-renders infinis

  useEffect(() => {
    loadMediaFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Charger une seule fois au montage

  // Filtrer les fichiers orphelins de la liste
  const validFiles = useMemo(() => {
    return mediaFiles.filter(file => {
      if (!file) return false;
      const fileId = file.id || file._id;
      return fileId && !orphanFiles.has(String(fileId));
    });
  }, [mediaFiles, orphanFiles]);

  const filteredFiles = useMemo(() => {
    let files = validFiles;
    if (filterType === 'all') return files;
    if (filterType === 'images') {
      return files.filter(f => (f.mime_type || '').startsWith('image/'));
    }
    if (filterType === 'videos') {
      return files.filter(f => (f.mime_type || '').startsWith('video/'));
    }
    return files;
  }, [validFiles, filterType]);

  // Callback pour détecter les fichiers orphelins
  const handleOrphanDetected = useCallback((fileId) => {
    setOrphanFiles(prev => new Set([...prev, String(fileId)]));
  }, []);

  const openLightbox = useCallback((file, index) => {
    setSelectedFile(file);
    setCurrentIndex(index);
  }, []);

  const closeLightbox = useCallback(() => {
    setSelectedFile(null);
  }, []);

  const navigateLightbox = useCallback((direction) => {
    const newIndex = direction === 'next' 
      ? (currentIndex + 1) % filteredFiles.length
      : (currentIndex - 1 + filteredFiles.length) % filteredFiles.length;
    setCurrentIndex(newIndex);
    setSelectedFile(filteredFiles[newIndex]);
  }, [currentIndex, filteredFiles]);

  const formatDate = useCallback((dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const locale = language === 'en' ? 'en-US' : 'fr-FR';
    return date.toLocaleDateString(locale, { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }, [language]);

  const getPreviewUrl = useCallback((fileId) => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';
    return `${apiUrl}/api/files/${fileId}/preview`;
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: textSecondary }}>
        {t('loadingGallery')}
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', backgroundColor: bgColor, minHeight: '100vh' }}>
      {/* En-tête */}
      <div style={{
        marginBottom: '24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
      }}>
        <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '700', color: textColor }}>
          📸 {t('gallery')}
        </h1>
        
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {/* Filtres */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={{
              padding: '8px 16px',
              backgroundColor: cardBg,
              color: textColor,
              border: `1px solid ${borderColor}`,
              borderRadius: '8px',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            <option value="all">{t('allMedia')}</option>
            <option value="images">{t('imagesOnly')}</option>
            <option value="videos">{t('videosOnly')}</option>
          </select>

          {/* Vue */}
          <div style={{
            display: 'flex',
            gap: '4px',
            backgroundColor: cardBg,
            padding: '4px',
            borderRadius: '8px',
            border: `1px solid ${borderColor}`,
          }}>
            <button
              onClick={() => setViewMode('grid')}
              style={{
                padding: '8px 12px',
                backgroundColor: viewMode === 'grid' ? '#2196F3' : 'transparent',
                color: viewMode === 'grid' ? 'white' : textColor,
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              ⬜ {t('grid')}
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              style={{
                padding: '8px 12px',
                backgroundColor: viewMode === 'timeline' ? '#2196F3' : 'transparent',
                color: viewMode === 'timeline' ? 'white' : textColor,
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              📅 {t('timeline')}
            </button>
          </div>
        </div>
      </div>

      {/* Statistiques */}
      <div style={{
        marginBottom: '24px',
        padding: '16px',
        backgroundColor: cardBg,
        borderRadius: '12px',
        border: `1px solid ${borderColor}`,
        display: 'flex',
        gap: '24px',
        flexWrap: 'wrap',
      }}>
        <div>
          <div style={{ fontSize: '12px', color: textSecondary, marginBottom: '4px' }}>{t('total')}</div>
          <div style={{ fontSize: '20px', fontWeight: '700', color: textColor }}>
            {validFiles.length} {validFiles.length === 1 ? t('media') : t('medias')}
            {orphanFiles.size > 0 && (
              <span style={{ fontSize: '12px', color: textSecondary, marginLeft: '8px', fontWeight: 'normal' }}>
                ({orphanFiles.size} {t('language') === 'en' ? 'unavailable' : 'indisponible'})
              </span>
            )}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '12px', color: textSecondary, marginBottom: '4px' }}>{t('images')}</div>
          <div style={{ fontSize: '20px', fontWeight: '700', color: '#4CAF50' }}>
            {validFiles.filter(f => (f.mime_type || '').startsWith('image/')).length}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '12px', color: textSecondary, marginBottom: '4px' }}>{t('videos')}</div>
          <div style={{ fontSize: '20px', fontWeight: '700', color: '#FF9800' }}>
            {validFiles.filter(f => (f.mime_type || '').startsWith('video/')).length}
          </div>
        </div>
      </div>

      {/* Vue Grille */}
      {viewMode === 'grid' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '16px',
        }}>
          {filteredFiles.map((file, index) => {
            if (!file) return null;
            const fileId = file.id || file._id;
            if (!fileId) return null;
            
            const isImage = (file.mime_type || '').startsWith('image/');

            return (
              <div
                key={file.id || file._id}
                onClick={() => openLightbox(file, index)}
                style={{
                  aspectRatio: '1',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  backgroundColor: cardBg,
                  border: `1px solid ${borderColor}`,
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'all 0.2s',
                  boxShadow: theme === 'dark' ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.1)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = theme === 'dark' 
                    ? '0 8px 16px rgba(0,0,0,0.4)' 
                    : '0 8px 16px rgba(0,0,0,0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = theme === 'dark' 
                    ? '0 2px 8px rgba(0,0,0,0.3)' 
                    : '0 2px 8px rgba(0,0,0,0.1)';
                }}
              >
                <ThumbnailImage
                  fileId={fileId}
                  fileName={file.name}
                  isImage={isImage}
                  onOrphanDetected={handleOrphanDetected}
                />
                <div style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)',
                  padding: '8px',
                  color: 'white',
                  fontSize: '12px',
                  fontWeight: '500',
                }}>
                  {file.name}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Vue Timeline */}
      {viewMode === 'timeline' && (() => {
        // Grouper les fichiers valides par date
        const grouped = {};
        validFiles.forEach(file => {
          try {
            const date = new Date(file.created_at || file.uploaded_at || Date.now());
            if (isNaN(date.getTime())) return;
            
            const dateKey = date.toLocaleDateString(language === 'en' ? 'en-US' : 'fr-FR', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            });
            if (!grouped[dateKey]) {
              grouped[dateKey] = [];
            }
            grouped[dateKey].push(file);
          } catch (dateErr) {
            console.warn('Erreur lors du traitement de la date:', dateErr);
          }
        });

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {Object.entries(grouped)
              .sort(([dateA], [dateB]) => new Date(dateB) - new Date(dateA))
              .map(([date, files]) => (
                <div key={date}>
                  <h2 style={{
                    margin: '0 0 16px 0',
                    fontSize: '20px',
                    fontWeight: '600',
                    color: textColor,
                    paddingBottom: '8px',
                    borderBottom: `2px solid ${borderColor}`,
                  }}>
                    {date}
                  </h2>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                    gap: '12px',
                  }}>
                    {files
                      .filter(file => {
                        if (filterType === 'all') return true;
                        if (filterType === 'images') return (file.mime_type || '').startsWith('image/');
                        if (filterType === 'videos') return (file.mime_type || '').startsWith('video/');
                        return true;
                      })
                      .map((file, index) => {
                        if (!file) return null;
                        const fileId = file.id || file._id;
                        if (!fileId) return null;
                        
                        const isImage = (file.mime_type || '').startsWith('image/');
                        const fileIndex = filteredFiles.findIndex(f => 
                          f && (f.id || f._id) === fileId
                        );

                        return (
                          <div
                            key={file.id || file._id}
                            onClick={() => openLightbox(file, fileIndex)}
                            style={{
                              aspectRatio: '1',
                              borderRadius: '8px',
                              overflow: 'hidden',
                              backgroundColor: cardBg,
                              border: `1px solid ${borderColor}`,
                              cursor: 'pointer',
                              position: 'relative',
                              transition: 'all 0.2s',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = 'scale(1.05)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'scale(1)';
                            }}
                          >
                            <ThumbnailImage
                              fileId={fileId}
                              fileName={file.name}
                              isImage={isImage}
                              onOrphanDetected={handleOrphanDetected}
                            />
                          </div>
                        );
                      })}
                  </div>
                </div>
              ))}
          </div>
        );
      })()}

      {/* Lightbox */}
      {selectedFile && (() => {
        const fileId = selectedFile.id || selectedFile._id;
        const previewUrl = getPreviewUrl(fileId);
        const token = localStorage.getItem('access_token');
        const isImage = selectedFile.mime_type?.startsWith('image/');
        
        return (
          <div
            onClick={closeLightbox}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.95)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'relative',
                maxWidth: '90vw',
                maxHeight: '90vh',
              }}
            >
              {isImage ? (
                <ImagePreview url={previewUrl} token={token} />
              ) : (
                <video
                  controls
                  src={`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/files/${fileId}/stream`}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '90vh',
                    borderRadius: '8px',
                  }}
                />
              )}
              
              {/* Contrôles */}
              <div style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                display: 'flex',
                gap: '8px',
              }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigateLightbox('prev');
                  }}
                  style={{
                    padding: '12px',
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    border: 'none',
                    borderRadius: '50%',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '20px',
                  }}
                >
                  ⬅️
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigateLightbox('next');
                  }}
                  style={{
                    padding: '12px',
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    border: 'none',
                    borderRadius: '50%',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '20px',
                  }}
                >
                  ➡️
                </button>
                <button
                  onClick={closeLightbox}
                  style={{
                    padding: '12px',
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    border: 'none',
                    borderRadius: '50%',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '20px',
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Informations */}
              <div style={{
                position: 'absolute',
                bottom: '20px',
                left: '20px',
                right: '20px',
                backgroundColor: 'rgba(0,0,0,0.7)',
                color: 'white',
                padding: '16px',
                borderRadius: '8px',
              }}>
                <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                  {selectedFile.name}
                </div>
                <div style={{ fontSize: '12px', opacity: 0.8 }}>
                  {formatDate(selectedFile.created_at)} • {currentIndex + 1} / {filteredFiles.length}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {filteredFiles.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          color: textSecondary,
        }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>📸</div>
          <div style={{ fontSize: '18px', fontWeight: '500', marginBottom: '8px' }}>
            {t('noMediaFound')}
          </div>
          <div style={{ fontSize: '14px' }}>
            {filterType === 'all' 
              ? t('noPhotosOrVideos')
              : filterType === 'images' ? t('noImagesFound') : t('noVideosFound')}
          </div>
        </div>
      )}

      <ToastContainer />
    </div>
  );
}

// Composant pour prévisualiser les images dans le lightbox
function ImagePreview({ url, token }) {
  const [imageUrl, setImageUrl] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadImage = async () => {
      try {
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          // Si 404, le fichier n'existe plus sur le disque (orphan file)
          if (response.status === 404) {
            console.warn('File not found on disk (orphan file)');
            setError('Fichier non disponible sur le serveur');
            setLoading(false);
            return;
          }
          throw new Error('Failed to load image');
        }
        
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        setImageUrl(objectUrl);
      } catch (err) {
        console.error('Failed to load image:', err);
        setError(err.message || 'Erreur de chargement');
      } finally {
        setLoading(false);
      }
    };
    
    if (url && token) {
      loadImage();
    }
    
    return () => {
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [url, token]);

  if (loading) {
    return <div style={{ padding: 24, textAlign: 'center', color: 'white' }}>⏳ Chargement...</div>;
  }

  if (error || !imageUrl) {
    return (
      <div style={{ 
        padding: 24, 
        textAlign: 'center', 
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px'
      }}>
        <div style={{ fontSize: '48px', opacity: 0.7 }}>🖼️</div>
        <div style={{ fontSize: '16px', fontWeight: '500' }}>
          {error || 'Erreur de chargement'}
        </div>
        <div style={{ fontSize: '12px', opacity: 0.7 }}>
          Le fichier n'est plus disponible sur le serveur
        </div>
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt="Preview"
      style={{
        maxWidth: '100%',
        maxHeight: '90vh',
        objectFit: 'contain',
        borderRadius: '8px',
      }}
    />
  );
}
