import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fileService } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';

export default function Preview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { theme } = useTheme();
  const [file, setFile] = useState(null);
  const [fileMetadata, setFileMetadata] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [previewType, setPreviewType] = useState(null);

  useEffect(() => {
    loadFile();
  }, [id]);

  const loadFile = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';
      const token = localStorage.getItem('access_token');
      
      if (!token) {
        throw new Error('Vous devez être connecté pour voir ce fichier');
      }
      
      // Récupérer tous les fichiers pour trouver celui avec cet ID
      // On récupère sans filtre pour trouver le fichier même s'il est dans un autre dossier
      let fileInfo = null;
      
      try {
        // Essayer de récupérer depuis la liste des fichiers (tous les dossiers)
        const fileListResponse = await fetch(`${apiUrl}/api/files`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (fileListResponse.ok) {
          const fileListData = await fileListResponse.json();
          // Chercher dans tous les fichiers
          fileInfo = fileListData.data?.items?.find(f => 
            f.id === id || f._id === id || String(f.id) === String(id) || String(f._id) === String(id)
          );
        }
      } catch (listErr) {
        console.warn('Could not fetch file list:', listErr);
      }
      
      // Si pas trouvé dans la liste, essayer aussi dans la corbeille
      if (!fileInfo) {
        try {
          const trashResponse = await fetch(`${apiUrl}/api/files/trash`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (trashResponse.ok) {
            const trashData = await trashResponse.json();
            fileInfo = trashData.data?.items?.find(f => 
              f.id === id || f._id === id || String(f.id) === String(id) || String(f._id) === String(id)
            );
          }
        } catch (trashErr) {
          console.warn('Could not fetch trash list:', trashErr);
        }
      }
      
      // Récupérer le Content-Type depuis l'endpoint preview pour déterminer le type
      let contentType = '';
      try {
        const previewHeadResponse = await fetch(`${apiUrl}/api/files/${id}/preview`, {
          method: 'HEAD',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (previewHeadResponse.ok) {
          contentType = previewHeadResponse.headers.get('content-type') || '';
        }
      } catch (headErr) {
        console.warn('Could not fetch preview headers:', headErr);
      }
      
      // Construire les métadonnées du fichier
      const mimeType = fileInfo?.mime_type || contentType || 'application/octet-stream';
      const previewUrl = `${apiUrl}/api/files/${id}/preview`;
      const streamUrl = `${apiUrl}/api/files/${id}/stream`;
      
      // Stocker les métadonnées complètes
      setFileMetadata({
        name: fileInfo?.name || 'Fichier',
        mime_type: mimeType,
        size: fileInfo?.size || null,
        created_at: fileInfo?.created_at || null,
        updated_at: fileInfo?.updated_at || fileInfo?.created_at || null,
        folder_id: fileInfo?.folder_id || null,
        owner_id: fileInfo?.owner_id || null,
        id: id
      });
      
      setFile({ 
        previewUrl, 
        streamUrl, 
        contentType: mimeType, 
        name: fileInfo?.name || 'Fichier', 
        size: fileInfo?.size || null 
      });
      
      // Déterminer le type de prévisualisation basé sur le MIME type
      if (mimeType.startsWith('image/')) {
        setPreviewType('image');
      } else if (mimeType === 'application/pdf') {
        setPreviewType('pdf');
      } else if (mimeType.startsWith('text/') || mimeType.includes('markdown')) {
        setPreviewType('text');
      } else if (mimeType.startsWith('video/')) {
        setPreviewType('video');
      } else if (mimeType.startsWith('audio/')) {
        setPreviewType('audio');
      } else {
        setPreviewType('download');
      }
      
    } catch (err) {
      console.error('Failed to load file:', err);
      setError('Impossible de charger le fichier: ' + (err.message || 'Erreur inconnue'));
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '-';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  // Couleurs dynamiques selon le thème - Thème clair amélioré
  const cardBg = theme === 'dark' ? '#1e1e1e' : '#ffffff';
  const textColor = theme === 'dark' ? '#e0e0e0' : '#1a202c';
  const borderColor = theme === 'dark' ? '#333333' : '#e2e8f0';
  const textSecondary = theme === 'dark' ? '#b0b0b0' : '#4a5568';
  const bgColor = theme === 'dark' ? '#121212' : '#fafbfc';
  const shadowColor = theme === 'dark' ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.08)';

  if (loading) {
    return (
      <div style={{ 
        padding: 24, 
        textAlign: 'center',
        backgroundColor: theme === 'dark' ? '#121212' : 'transparent',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 16
      }}>
        <div style={{ fontSize: '48px' }}>⏳</div>
        <div style={{ color: textColor, fontSize: '18px' }}>Chargement...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        padding: 24, 
        textAlign: 'center',
        backgroundColor: theme === 'dark' ? '#121212' : 'transparent',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 16
      }}>
        <div style={{ fontSize: '48px' }}>⚠️</div>
        <h2 style={{ color: textColor, margin: 0 }}>Erreur</h2>
        <p style={{ color: textSecondary, maxWidth: '600px' }}>{error}</p>
        <a 
          href={`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/files/${id}/download`} 
          download
          style={{
            padding: '12px 24px',
            backgroundColor: '#2196F3',
            color: 'white',
            textDecoration: 'none',
            borderRadius: 8,
            fontWeight: '500',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => e.target.style.backgroundColor = '#1976D2'}
          onMouseLeave={(e) => e.target.style.backgroundColor = '#2196F3'}
        >
          ⬇️ Télécharger le fichier
        </a>
      </div>
    );
  }

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';
  const downloadUrl = `${apiUrl}/api/files/${id}/download`;
  const token = localStorage.getItem('access_token');

  return (
    <div style={{ 
      padding: 24,
      backgroundColor: theme === 'dark' ? '#1e1e1e' : '#ffffff',
      minHeight: '100vh'
    }}>
      <div style={{ 
        marginBottom: 16, 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 16
      }}>
        <div>
          <button
            onClick={() => navigate(-1)}
            style={{
              padding: '8px 16px',
              backgroundColor: 'transparent',
              color: theme === 'dark' ? '#90caf9' : '#2196F3',
              border: `1px solid ${theme === 'dark' ? '#404040' : '#e0e0e0'}`,
              borderRadius: 6,
              cursor: 'pointer',
              marginBottom: 8,
              fontSize: '14px'
            }}
          >
            ← {t('back') || 'Retour'}
          </button>
          <h1 style={{ 
            margin: 0,
            fontSize: '28px',
            fontWeight: '700',
            color: textColor
          }}>
            {t('preview') || 'Prévisualisation'}
          </h1>
        </div>
        <a
          href={downloadUrl}
          download
          style={{
            padding: '10px 20px',
            backgroundColor: '#2196F3',
            color: 'white',
            textDecoration: 'none',
            borderRadius: 8,
            fontWeight: '500',
            transition: 'background-color 0.2s',
            display: 'inline-block'
          }}
          onMouseEnter={(e) => e.target.style.backgroundColor = '#1976D2'}
          onMouseLeave={(e) => e.target.style.backgroundColor = '#2196F3'}
        >
          ⬇️ {t('download') || 'Télécharger'}
        </a>
      </div>

      <div style={{ 
        border: `1px solid ${borderColor}`, 
        borderRadius: 8, 
        overflow: 'hidden', 
        backgroundColor: theme === 'dark' ? '#2d2d2d' : '#f5f5f5',
        boxShadow: theme === 'dark' ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        {previewType === 'image' && (
          <div style={{ textAlign: 'center', padding: 24 }}>
            <ImagePreview url={file.previewUrl} token={token} />
          </div>
        )}

        {previewType === 'pdf' && (
          <div style={{ height: '80vh' }}>
            <PdfPreview url={file.previewUrl} token={token} />
          </div>
        )}

        {previewType === 'text' && (
          <div style={{ padding: 24, backgroundColor: 'white', height: '80vh', overflow: 'auto' }}>
            <TextPreview url={`${file.previewUrl}`} token={token} />
          </div>
        )}

        {previewType === 'video' && (
          <div style={{ padding: 24, textAlign: 'center' }}>
            <VideoPreview url={file.streamUrl} token={token} />
          </div>
        )}

        {previewType === 'audio' && (
          <div style={{ padding: 24, textAlign: 'center' }}>
            <AudioPreview url={file.streamUrl} token={token} />
          </div>
        )}

        {previewType === 'download' && (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <p>Ce type de fichier ne peut pas être prévisualisé.</p>
            <a
              href={downloadUrl}
              download
              style={{
                padding: '12px 24px',
                backgroundColor: '#2196F3',
                color: 'white',
                textDecoration: 'none',
                borderRadius: 4,
                display: 'inline-block',
              }}
            >
              Télécharger le fichier
            </a>
          </div>
        )}
      </div>

      {/* Toujours afficher les détails du fichier */}
      <div style={{ 
        marginTop: 24, 
        padding: 20, 
        backgroundColor: cardBg, 
        borderRadius: 8,
        border: `1px solid ${borderColor}`,
        boxShadow: theme === 'dark' ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ 
          marginTop: 0, 
          marginBottom: 20,
          fontSize: '20px',
          fontWeight: '600',
          color: textColor
        }}>
          📋 {t('technicalDetails') || 'Détails techniques'}
        </h3>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
          gap: 20 
        }}>
          <div>
            <strong style={{ 
              color: theme === 'dark' ? '#90caf9' : '#2196F3',
              fontSize: '14px',
              display: 'block',
              marginBottom: 8
            }}>
              {t('name') || 'Nom'}:
            </strong>
            <div style={{ 
              marginTop: 4, 
              color: textColor,
              fontSize: '15px',
              wordBreak: 'break-word'
            }}>
              {fileMetadata?.name || file?.name || 'Non spécifié'}
            </div>
          </div>
          <div>
            <strong style={{ 
              color: theme === 'dark' ? '#90caf9' : '#2196F3',
              fontSize: '14px',
              display: 'block',
              marginBottom: 8
            }}>
              {t('mimeType') || 'Type MIME'}:
            </strong>
            <div style={{ 
              marginTop: 4, 
              color: textColor,
              fontSize: '15px',
              fontFamily: 'monospace'
            }}>
              {fileMetadata?.mime_type || file?.contentType || 'Non spécifié'}
            </div>
          </div>
          <div>
            <strong style={{ 
              color: theme === 'dark' ? '#90caf9' : '#2196F3',
              fontSize: '14px',
              display: 'block',
              marginBottom: 8
            }}>
              {t('size') || 'Taille'}:
            </strong>
            <div style={{ 
              marginTop: 4, 
              color: textColor,
              fontSize: '15px'
            }}>
              {fileMetadata?.size ? formatBytes(fileMetadata.size) : (file?.size ? formatBytes(file.size) : '-')}
            </div>
          </div>
          {fileMetadata?.created_at && (
            <div>
              <strong style={{ 
                color: theme === 'dark' ? '#90caf9' : '#2196F3',
                fontSize: '14px',
                display: 'block',
                marginBottom: 8
              }}>
                {t('createdAt') || 'Créé le'}:
              </strong>
              <div style={{ 
                marginTop: 4, 
                color: textColor,
                fontSize: '15px'
              }}>
                {new Date(fileMetadata.created_at).toLocaleString(language === 'en' ? 'en-US' : 'fr-FR', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                })}
              </div>
            </div>
          )}
          {fileMetadata?.updated_at && (
            <div>
              <strong style={{ 
                color: theme === 'dark' ? '#90caf9' : '#2196F3',
                fontSize: '14px',
                display: 'block',
                marginBottom: 8
              }}>
                {t('modifiedAt') || 'Modifié le'}:
              </strong>
              <div style={{ 
                marginTop: 4, 
                color: textColor,
                fontSize: '15px'
              }}>
                {new Date(fileMetadata.updated_at).toLocaleString(language === 'en' ? 'en-US' : 'fr-FR', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                })}
              </div>
            </div>
          )}
          <div>
            <strong style={{ 
              color: theme === 'dark' ? '#90caf9' : '#2196F3',
              fontSize: '14px',
              display: 'block',
              marginBottom: 8
            }}>
              {t('fileId') || 'ID du fichier'}:
            </strong>
            <div style={{ 
              marginTop: 4, 
              color: textColor,
              fontSize: '12px',
              fontFamily: 'monospace',
              wordBreak: 'break-all',
              backgroundColor: theme === 'dark' ? '#1a1a1a' : '#f5f5f5',
              padding: '8px 12px',
              borderRadius: 4,
              border: `1px solid ${borderColor}`
            }}>
              {id}
            </div>
          </div>
          {fileMetadata?.folder_id && (
            <div>
              <strong style={{ 
                color: theme === 'dark' ? '#90caf9' : '#2196F3',
                fontSize: '14px',
                display: 'block',
                marginBottom: 8
              }}>
                {t('folderId') || 'ID du dossier'}:
              </strong>
              <div style={{ 
                marginTop: 4, 
                color: textColor,
                fontSize: '12px',
                fontFamily: 'monospace',
                wordBreak: 'break-all'
              }}>
                {fileMetadata.folder_id}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Composant pour prévisualiser les images avec authentification
function ImagePreview({ url, token }) {
  const [imageUrl, setImageUrl] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadImage = async () => {
      try {
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          throw new Error('Impossible de charger l\'image');
        }
        
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        setImageUrl(objectUrl);
      } catch (err) {
        console.error('Failed to load image:', err);
        setError(err.message);
      }
    };
    
    loadImage();
    
    return () => {
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [url, token]);

  if (error) {
    return <div style={{ padding: 24, color: 'red' }}>Erreur: {error}</div>;
  }

  if (!imageUrl) {
    return <div style={{ padding: 24, textAlign: 'center' }}>Chargement de l'image...</div>;
  }

  return (
    <img
      src={imageUrl}
      alt="Preview"
      style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain' }}
    />
  );
}

// Composant pour prévisualiser les PDF avec authentification
function PdfPreview({ url, token }) {
  const [pdfUrl, setPdfUrl] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadPdf = async () => {
      try {
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          throw new Error('Impossible de charger le PDF');
        }
        
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        setPdfUrl(objectUrl);
      } catch (err) {
        console.error('Failed to load PDF:', err);
        setError(err.message);
      }
    };
    
    loadPdf();
    
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [url, token]);

  if (error) {
    return <div style={{ padding: 24, color: 'red' }}>Erreur: {error}</div>;
  }

  if (!pdfUrl) {
    return <div style={{ padding: 24, textAlign: 'center' }}>Chargement du PDF...</div>;
  }

  return (
    <iframe
      src={pdfUrl}
      style={{ width: '100%', height: '100%', border: 'none' }}
      title="PDF Preview"
    />
  );
}

// Composant pour prévisualiser les vidéos avec authentification et contrôles avancés
function VideoPreview({ url, token }) {
  const [videoUrl, setVideoUrl] = useState(null);
  const [error, setError] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const videoRef = React.useRef(null);
  const { theme } = useTheme();

  useEffect(() => {
    const loadVideo = async () => {
      try {
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          throw new Error('Impossible de charger la vidéo');
        }
        
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        setVideoUrl(objectUrl);
      } catch (err) {
        console.error('Failed to load video:', err);
        setError(err.message);
      }
    };
    
    loadVideo();
    
    return () => {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [url, token]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateTime = () => setCurrentTime(video.currentTime);
    const updateDuration = () => setDuration(video.duration);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);

    video.addEventListener('timeupdate', updateTime);
    video.addEventListener('loadedmetadata', updateDuration);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('timeupdate', updateTime);
      video.removeEventListener('loadedmetadata', updateDuration);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
    };
  }, [videoUrl]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  };

  const handleSeek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    if (videoRef.current) {
      videoRef.current.currentTime = percent * duration;
    }
  };

  const toggleFullscreen = () => {
    if (!videoRef.current) return;
    if (!isFullscreen) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    setIsFullscreen(!isFullscreen);
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (error) {
    return <div style={{ padding: 24, color: 'red' }}>Erreur: {error}</div>;
  }

  if (!videoUrl) {
    return <div style={{ padding: 24, textAlign: 'center' }}>Chargement de la vidéo...</div>;
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const cardBg = theme === 'dark' ? '#1e1e1e' : '#ffffff';
  const textColor = theme === 'dark' ? '#e0e0e0' : '#1a202c';

  return (
    <div style={{ position: 'relative', maxWidth: '100%' }}>
      <video
        ref={videoRef}
        style={{ 
          maxWidth: '100%', 
          maxHeight: '80vh',
          display: 'block',
          borderRadius: '8px',
        }}
        src={videoUrl}
        volume={volume}
        playbackRate={playbackRate}
      >
        Votre navigateur ne supporte pas la lecture vidéo.
      </video>
      
      {/* Contrôles personnalisés */}
      <div style={{
        marginTop: '12px',
        padding: '12px',
        backgroundColor: cardBg,
        borderRadius: '8px',
        border: `1px solid ${theme === 'dark' ? '#333' : '#e2e8f0'}`,
      }}>
        {/* Barre de progression */}
        <div
          onClick={handleSeek}
          style={{
            width: '100%',
            height: '6px',
            backgroundColor: theme === 'dark' ? '#333' : '#e2e8f0',
            borderRadius: '3px',
            cursor: 'pointer',
            marginBottom: '12px',
            position: 'relative',
          }}
        >
          <div
            style={{
              width: `${progress}%`,
              height: '100%',
              backgroundColor: '#2196F3',
              borderRadius: '3px',
              transition: 'width 0.1s',
            }}
          />
        </div>

        {/* Contrôles */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap',
        }}>
          <button
            onClick={togglePlay}
            style={{
              padding: '8px 16px',
              backgroundColor: '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            {isPlaying ? '⏸️ Pause' : '▶️ Play'}
          </button>

          <span style={{ color: textColor, fontSize: '12px' }}>
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: textColor }}>
            Volume:
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={(e) => {
                const newVolume = parseFloat(e.target.value);
                setVolume(newVolume);
                if (videoRef.current) {
                  videoRef.current.volume = newVolume;
                }
              }}
              style={{ width: '80px' }}
            />
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: textColor }}>
            Vitesse:
            <select
              value={playbackRate}
              onChange={(e) => {
                const newRate = parseFloat(e.target.value);
                setPlaybackRate(newRate);
                if (videoRef.current) {
                  videoRef.current.playbackRate = newRate;
                }
              }}
              style={{
                padding: '4px 8px',
                backgroundColor: cardBg,
                color: textColor,
                border: `1px solid ${theme === 'dark' ? '#333' : '#e2e8f0'}`,
                borderRadius: '4px',
                fontSize: '12px',
              }}
            >
              <option value="0.5">0.5x</option>
              <option value="0.75">0.75x</option>
              <option value="1">1x</option>
              <option value="1.25">1.25x</option>
              <option value="1.5">1.5x</option>
              <option value="2">2x</option>
            </select>
          </label>

          <button
            onClick={toggleFullscreen}
            style={{
              padding: '8px 16px',
              backgroundColor: theme === 'dark' ? '#2d2d2d' : '#f5f5f5',
              color: textColor,
              border: `1px solid ${theme === 'dark' ? '#333' : '#e2e8f0'}`,
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            {isFullscreen ? '⤓ Sortir' : '⤢ Plein écran'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Composant pour prévisualiser les fichiers audio avec authentification
function AudioPreview({ url, token }) {
  const [audioUrl, setAudioUrl] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadAudio = async () => {
      try {
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          throw new Error('Impossible de charger l\'audio');
        }
        
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        setAudioUrl(objectUrl);
      } catch (err) {
        console.error('Failed to load audio:', err);
        setError(err.message);
      }
    };
    
    loadAudio();
    
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [url, token]);

  if (error) {
    return <div style={{ padding: 24, color: 'red' }}>Erreur: {error}</div>;
  }

  if (!audioUrl) {
    return <div style={{ padding: 24, textAlign: 'center' }}>Chargement de l'audio...</div>;
  }

  return (
    <audio controls style={{ width: '100%', maxWidth: '600px' }} src={audioUrl}>
      Votre navigateur ne supporte pas la lecture audio.
    </audio>
  );
}

// Composant pour prévisualiser les fichiers texte
function TextPreview({ url, token }) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadText = async () => {
      try {
        setLoading(true);
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          throw new Error('Impossible de charger le fichier texte');
        }
        
        const text = await response.text();
        setContent(text);
      } catch (err) {
        console.error('Failed to load text:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    loadText();
  }, [url, token]);

  if (loading) {
    return <div style={{ padding: 24, textAlign: 'center' }}>Chargement du texte...</div>;
  }

  if (error) {
    return <div style={{ padding: 24, color: 'red' }}>Erreur: {error}</div>;
  }

  return (
    <pre style={{ 
      margin: 0, 
      whiteSpace: 'pre-wrap', 
      fontFamily: 'monospace', 
      fontSize: 14,
      lineHeight: 1.6,
      padding: 16,
      backgroundColor: '#fff',
      border: '1px solid #ddd',
      borderRadius: 4
    }}>
      {content}
    </pre>
  );
}
