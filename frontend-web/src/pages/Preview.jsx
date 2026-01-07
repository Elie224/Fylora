import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fileService } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../components/Toast';

export default function Preview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { theme } = useTheme();
  const { showToast } = useToast();
  const [file, setFile] = useState(null);
  const [fileMetadata, setFileMetadata] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [previewType, setPreviewType] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

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
        throw new Error(t('mustBeConnectedToView') || 'Vous devez être connecté pour voir ce fichier');
      }
      
      // Essayer d'abord d'obtenir les métadonnées directement depuis l'API
      let fileInfo = null;
      
      try {
        // Utiliser l'endpoint de recherche pour trouver le fichier par ID
        const searchResponse = await fetch(`${apiUrl}/api/search?q=${encodeURIComponent(id)}&limit=1000`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (searchResponse.ok) {
          const searchData = await searchResponse.json();
          const items = searchData.data?.items || [];
          // Chercher le fichier avec cet ID exact
          fileInfo = items.find(f => {
            const fileId = f.id || f._id;
            return String(fileId) === String(id);
          });
        }
      } catch (searchErr) {
        console.warn('Could not search file:', searchErr);
      }
      
      // Si pas trouvé via la recherche, essayer la liste des fichiers
      if (!fileInfo) {
        try {
          const fileListResponse = await fetch(`${apiUrl}/api/files?limit=1000`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (fileListResponse.ok) {
            const fileListData = await fileListResponse.json();
            const items = fileListData.data?.items || [];
            // Chercher dans tous les fichiers
            fileInfo = items.find(f => {
              const fileId = f.id || f._id;
              return String(fileId) === String(id);
            });
          }
        } catch (listErr) {
          console.warn('Could not fetch file list:', listErr);
        }
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
            const items = trashData.data?.items || [];
            fileInfo = items.find(f => {
              const fileId = f.id || f._id;
              return String(fileId) === String(id);
            });
          }
        } catch (trashErr) {
          console.warn('Could not fetch trash list:', trashErr);
        }
      }
      
      // Récupérer le Content-Type depuis l'endpoint preview pour déterminer le type
      let contentType = '';
      let previewError = null;
      let isOrphanFile = false;
      let previewGetResponse = null;
      let responseContentType = '';
      
      try {
        previewGetResponse = await fetch(`${apiUrl}/api/files/${id}/preview`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          redirect: 'follow' // Suivre les redirections
        });
        
        if (previewGetResponse.ok) {
          // Vérifier si c'est une réponse JSON
          responseContentType = previewGetResponse.headers.get('content-type') || '';
          if (responseContentType.includes('application/json')) {
            const data = await previewGetResponse.json();
            if (data.url) {
              // URL normale
              setPreviewUrl(data.url);
              // Si le mimeType est fourni dans la réponse, l'utiliser
              if (data.mimeType && !fileInfo) {
                fileInfo = { mime_type: data.mimeType };
              }
            }
            contentType = responseContentType;
          } else {
            // Réponse normale (fichier local)
            contentType = responseContentType;
          }
        } else if (previewGetResponse.status === 404) {
          // Le fichier n'existe pas physiquement (fichier orphelin)
          isOrphanFile = true;
          try {
            const errorData = await previewGetResponse.json().catch(() => ({}));
            // Utiliser les détails du backend si disponibles
            if (errorData.error?.details) {
              previewError = errorData.error.details;
            } else if (errorData.error?.message) {
              previewError = errorData.error.message;
            } else {
              previewError = 'File not found on disk';
            }
            // Stocker les informations supplémentaires pour l'affichage
            if (errorData.error?.isOrphan) {
              // Le fichier est orphelin, on peut afficher un message plus détaillé
            }
          } catch (e) {
            previewError = 'File not found on disk';
          }
        } else if (previewGetResponse.status === 410) {
          // Fichier sur Cloudinary (non supporté)
          isOrphanFile = true;
          try {
            const errorData = await previewGetResponse.json().catch(() => ({}));
            previewError = errorData.error?.message || 'This file is stored on Cloudinary which is no longer supported. Please re-upload the file.';
          } catch (e) {
            previewError = 'This file is stored on Cloudinary which is no longer supported. Please re-upload the file.';
          }
        } else {
          // Autre erreur
          if (previewGetResponse) {
            try {
              const errorData = await previewGetResponse.json().catch(() => ({}));
              previewError = errorData.error?.message || `Erreur ${previewGetResponse.status}`;
            } catch (e) {
              previewError = `Erreur ${previewGetResponse.status}`;
            }
          } else {
            previewError = 'Erreur lors du chargement du fichier';
          }
        }
      } catch (getErr) {
        console.warn('Could not fetch preview:', getErr);
        // Si previewGetResponse n'a pas été défini, c'est que le fetch a complètement échoué
        if (!previewGetResponse) {
          if (getErr.message && getErr.message.includes('404')) {
            isOrphanFile = true;
            previewError = 'File not found on disk';
          } else {
            previewError = getErr.message || 'Erreur lors du chargement du fichier';
          }
        } else {
          // previewGetResponse existe mais il y a eu une erreur lors du traitement
          try {
            const errorData = await previewGetResponse.json().catch(() => ({}));
            previewError = errorData.error?.message || `Erreur ${previewGetResponse.status}`;
          } catch (e) {
            previewError = getErr.message || 'Erreur lors du chargement du fichier';
          }
        }
      }
      
      // Si le fichier n'existe pas physiquement, afficher un message d'erreur clair
      if (isOrphanFile || (previewError && (previewError.includes('not found') || previewError.includes('missing') || previewError.includes('Cloudinary')))) {
        // Construire un message d'erreur détaillé
        let errorMessage = previewError;
        if (!errorMessage || errorMessage === 'File not found on disk') {
          errorMessage = t('fileNotFoundOnDisk') || 'Le fichier existe dans la base de données mais le fichier physique est manquant. Cela peut arriver si le serveur a été redémarré. Vous pouvez supprimer cette entrée de votre liste de fichiers.';
        }
        setError(errorMessage);
        setLoading(false);
        return;
      }
      
      // Si erreur autre que 404/410
      if (previewError && !isOrphanFile) {
        setError(previewError);
        setLoading(false);
        return;
      }
      
      // Construire les métadonnées du fichier
      let mimeType = fileInfo?.mime_type || contentType || 'application/octet-stream';
      if (!mimeType || mimeType === 'application/octet-stream') {
        // Essayer d'obtenir le mimeType depuis la réponse JSON si disponible
        if (previewGetResponse && responseContentType.includes('application/json')) {
          try {
            const data = await previewGetResponse.clone().json().catch(() => ({}));
            if (data.mimeType) {
              mimeType = data.mimeType;
            }
          } catch (e) {
            // Ignorer l'erreur
          }
        }
      }
      let finalPreviewUrl = `${apiUrl}/api/files/${id}/preview`;
      
      // Si on a reçu une URL dans la réponse JSON, l'utiliser
      if (previewUrl) {
        finalPreviewUrl = previewUrl;
      }
      
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
        previewUrl: finalPreviewUrl, 
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
      } else if (
        mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || // .docx
        mimeType === 'application/msword' || // .doc
        mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' || // .pptx
        mimeType === 'application/vnd.ms-powerpoint' || // .ppt
        mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || // .xlsx
        mimeType === 'application/vnd.ms-excel' // .xls
      ) {
        // Formats Office - utiliser iframe avec viewer en ligne ou téléchargement
        setPreviewType('office');
      } else {
        setPreviewType('download');
      }
      
    } catch (err) {
      console.error('Failed to load file:', err);
      // Si c'est une erreur 404, afficher un message spécifique
      if (err.message && err.message.includes('404') || err.message && err.message.includes('not found')) {
        setError(t('fileNotFoundOnDisk') || 'Le fichier existe dans la base de données mais le fichier physique est manquant. Cela peut arriver si le serveur a été redémarré.');
      } else {
        setError(t('cannotLoadFile') + ' ' + (err.message || t('unknownError')));
      }
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
        <h2 style={{ color: textColor, margin: 0 }}>{t('error')}</h2>
        <p style={{ color: textSecondary, maxWidth: '600px' }}>{error}</p>
      </div>
    );
  }

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';
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
              backgroundColor: theme === 'dark' ? '#2d2d2d' : '#ffffff',
              color: theme === 'dark' ? '#90caf9' : '#1a202c',
              border: `1px solid ${theme === 'dark' ? '#404040' : '#d1d5db'}`,
              borderRadius: 6,
              cursor: 'pointer',
              marginBottom: 8,
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s',
              boxShadow: theme === 'dark' ? 'none' : '0 1px 2px rgba(0,0,0,0.05)'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = theme === 'dark' ? '#3d3d3d' : '#f3f4f6';
              e.target.style.borderColor = theme === 'dark' ? '#555' : '#9ca3af';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = theme === 'dark' ? '#2d2d2d' : '#ffffff';
              e.target.style.borderColor = theme === 'dark' ? '#404040' : '#d1d5db';
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
          <div style={{ padding: 24, backgroundColor: cardBg, height: '80vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <TextEditor 
              url={`${file.previewUrl}`} 
              token={token} 
              fileId={id}
              fileName={file.name}
              mimeType={fileMetadata?.mime_type}
            />
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

        {previewType === 'office' && (
          <OfficePreview 
            fileId={id} 
            fileName={file.name}
            mimeType={fileMetadata?.mime_type}
            token={token}
            previewUrl={previewUrl}
          />
        )}

        {previewType === 'download' && (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <p style={{ fontSize: '16px', color: textColor }}>
              {t('downloadOnly') || 'This file type cannot be previewed'}
            </p>
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
  const { t } = useLanguage();
  const [imageUrl, setImageUrl] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadImage = async () => {
      try {
        // Si l'URL est déjà une URL Cloudinary, l'utiliser directement
        if (url && (url.startsWith('https://res.cloudinary.com') || url.startsWith('http://res.cloudinary.com'))) {
          setImageUrl(url);
          return;
        }
        
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          redirect: 'follow' // Suivre les redirections Cloudinary
        });
        
        if (!response.ok) {
          // Si c'est une redirection (301/302), utiliser l'URL de redirection directement
          if (response.redirected && response.url) {
            setImageUrl(response.url);
            return;
          }
          throw new Error(t('cannotLoadImage') || 'Impossible de charger l\'image');
        }
        
        // Vérifier si c'est une réponse JSON avec URL Cloudinary
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await response.json();
          if (data.url) {
            setImageUrl(data.url);
            return;
          }
        }
        
        // Si c'est une redirection, utiliser l'URL de redirection
        if (response.redirected && response.url) {
          setImageUrl(response.url);
          return;
        }
        
        // Sinon, charger le blob normalement
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
      if (imageUrl && imageUrl.startsWith('blob:')) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [url, token]);

  if (error) {
    return <div style={{ padding: 24, color: 'red' }}>{t('error')}: {error}</div>;
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
  const { t } = useLanguage();
  const [pdfUrl, setPdfUrl] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadPdf = async () => {
      try {
        // Si l'URL est déjà une URL Cloudinary, l'utiliser directement
        if (url && (url.startsWith('https://res.cloudinary.com') || url.startsWith('http://res.cloudinary.com'))) {
          setPdfUrl(url);
          return;
        }
        
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          redirect: 'follow' // Suivre les redirections Cloudinary
        });
        
        if (!response.ok) {
          // Si c'est une redirection (301/302), utiliser l'URL de redirection directement
          if (response.redirected && response.url) {
            setPdfUrl(response.url);
            return;
          }
          throw new Error(t('cannotLoadPDF') || 'Impossible de charger le PDF');
        }
        
        // Vérifier si c'est une réponse JSON avec URL Cloudinary
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await response.json();
          if (data.url) {
            setPdfUrl(data.url);
            return;
          }
        }
        
        // Si c'est une redirection, utiliser l'URL de redirection
        if (response.redirected && response.url) {
          setPdfUrl(response.url);
          return;
        }
        
        // Sinon, charger le blob normalement
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
      if (pdfUrl && pdfUrl.startsWith('blob:')) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [url, token]);

  if (error) {
    return <div style={{ padding: 24, color: 'red' }}>{t('error')}: {error}</div>;
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
  const { t } = useLanguage();
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
    return <div style={{ padding: 24, color: 'red' }}>{t('error')}: {error}</div>;
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
  const { t } = useLanguage();
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
    return <div style={{ padding: 24, color: 'red' }}>{t('error')}: {error}</div>;
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

// Composant pour afficher les fichiers Office directement dans l'application
function OfficePreview({ fileId, fileName, mimeType, token, previewUrl }) {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const { theme } = useTheme();
  const [publicUrl, setPublicUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';
  const cardBg = theme === 'dark' ? '#1e1e1e' : '#ffffff';
  const textColor = theme === 'dark' ? '#e0e0e0' : '#1a202c';
  const borderColor = theme === 'dark' ? '#333333' : '#e2e8f0';
  
  useEffect(() => {
    const loadPublicUrl = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Générer une URL publique temporaire pour afficher le fichier dans un iframe
        const publicUrlResponse = await fetch(`${apiUrl}/api/files/${fileId}/public-preview-url`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (publicUrlResponse.ok) {
          const publicUrlData = await publicUrlResponse.json();
          setPublicUrl(publicUrlData.publicUrl);
        } else {
          throw new Error('Failed to generate public preview URL');
        }
      } catch (err) {
        console.error('Failed to load public URL:', err);
        setError(err.message);
        showToast(t('previewError') || 'Error loading preview', 'error');
      } finally {
        setLoading(false);
      }
    };
    
    loadPublicUrl();
  }, [fileId, token, apiUrl, showToast, t]);
  
  if (loading) {
    return (
      <div style={{ padding: 48, textAlign: 'center' }}>
        <p style={{ color: textColor }}>{t('loading') || 'Loading...'}</p>
      </div>
    );
  }
  
  if (error || !publicUrl) {
    return (
      <div style={{ padding: 48, textAlign: 'center' }}>
        <p style={{ fontSize: '16px', color: textColor }}>
          {t('previewNotAvailable') || 'Preview not available for this file type'}
        </p>
      </div>
    );
  }
  
  // Déterminer le type de viewer selon le type de fichier
  const isWord = mimeType?.includes('wordprocessingml') || mimeType?.includes('msword');
  const isExcel = mimeType?.includes('spreadsheetml') || mimeType?.includes('ms-excel');
  const isPowerPoint = mimeType?.includes('presentationml') || mimeType?.includes('ms-powerpoint');
  
  return (
    <div style={{ height: '80vh', display: 'flex', flexDirection: 'column' }}>
      {/* Barre d'outils */}
      <div style={{
        padding: '12px 16px',
        backgroundColor: cardBg,
        borderBottom: `1px solid ${borderColor}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: '14px', color: textColor, fontWeight: 500 }}>
            {fileName}
          </span>
          {(isWord || isExcel || isPowerPoint) && (
            <span style={{ 
              fontSize: '12px', 
              color: theme === 'dark' ? '#888' : '#666',
              padding: '2px 8px',
              backgroundColor: theme === 'dark' ? '#2d2d2d' : '#f0f0f0',
              borderRadius: 4
            }}>
              {isWord ? 'Word' : isExcel ? 'Excel' : 'PowerPoint'}
            </span>
          )}
        </div>
      </div>
      
      {/* Viewer intégré - Utiliser Google Docs Viewer dans un iframe */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <iframe
          src={`https://docs.google.com/viewer?url=${encodeURIComponent(publicUrl)}&embedded=true`}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            backgroundColor: cardBg
          }}
          title={fileName}
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-downloads"
        />
      </div>
    </div>
  );
}

// Composant éditeur de texte/Markdown avec prévisualisation
function TextEditor({ url, token, fileId, fileName, mimeType }) {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const [content, setContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [viewMode, setViewMode] = useState('edit'); // 'edit' | 'preview' | 'split'
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const { theme } = useTheme();
  const isMarkdown = mimeType?.includes('markdown') || fileName?.endsWith('.md');
  
  const cardBg = theme === 'dark' ? '#1e1e1e' : '#ffffff';
  const textColor = theme === 'dark' ? '#e0e0e0' : '#1a202c';
  const borderColor = theme === 'dark' ? '#333333' : '#e2e8f0';
  const bgColor = theme === 'dark' ? '#121212' : '#fafbfc';
  const codeBg = theme === 'dark' ? '#2d2d2d' : '#f5f5f5';

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
        setOriginalContent(text);
      } catch (err) {
        console.error('Failed to load text:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    loadText();
  }, [url, token]);

  useEffect(() => {
    setHasChanges(content !== originalContent);
  }, [content, originalContent]);

  const handleSave = async () => {
    if (!hasChanges) return;
    
    setIsSaving(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';
      const blob = new Blob([content], { type: mimeType || 'text/plain' });
      const formData = new FormData();
      formData.append('file', blob, fileName);

      const response = await fetch(`${apiUrl}/api/files/${fileId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: { message: 'Erreur inconnue' } }));
        throw new Error(errorData.error?.message || 'Erreur lors de la sauvegarde');
      }

      setOriginalContent(content);
      setHasChanges(false);
      showToast(t('fileSavedSuccessfully') || '✅ Fichier sauvegardé avec succès !', 'success');
    } catch (err) {
      console.error('Failed to save:', err);
      showToast(t('saveError') || '❌ Erreur lors de la sauvegarde: ' + err.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const renderMarkdown = (text) => {
    // Simple markdown renderer (basique, peut être amélioré avec une bibliothèque)
    return text
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/gim, '<em>$1</em>')
      .replace(/`(.*?)`/gim, '<code>$1</code>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2">$1</a>')
      .replace(/\n/gim, '<br />');
  };

  if (loading) {
    return <div style={{ padding: 24, textAlign: 'center', color: textColor }}>Chargement du texte...</div>;
  }

  if (error) {
    return <div style={{ padding: 24, color: 'red' }}>{t('error')}: {error}</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Barre d'outils */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 16px',
        backgroundColor: cardBg,
        borderBottom: `1px solid ${borderColor}`,
        marginBottom: '16px',
        borderRadius: '8px',
      }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          {isMarkdown && (
            <>
              <button
                onClick={() => setViewMode('edit')}
                style={{
                  padding: '6px 12px',
                  backgroundColor: viewMode === 'edit' ? '#2196F3' : 'transparent',
                  color: viewMode === 'edit' ? 'white' : textColor,
                  border: `1px solid ${borderColor}`,
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                ✏️ {t('edit')}
              </button>
              <button
                onClick={() => setViewMode('preview')}
                style={{
                  padding: '6px 12px',
                  backgroundColor: viewMode === 'preview' ? '#2196F3' : 'transparent',
                  color: viewMode === 'preview' ? 'white' : textColor,
                  border: `1px solid ${borderColor}`,
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                👁️ {t('preview')}
              </button>
              <button
                onClick={() => setViewMode('split')}
                style={{
                  padding: '6px 12px',
                  backgroundColor: viewMode === 'split' ? '#2196F3' : 'transparent',
                  color: viewMode === 'split' ? 'white' : textColor,
                  border: `1px solid ${borderColor}`,
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                ⚡ {t('split')}
              </button>
            </>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {hasChanges && (
            <span style={{ fontSize: '12px', color: '#FF9800' }}>● {t('unsavedChanges')}</span>
          )}
          <button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            style={{
              padding: '8px 16px',
              backgroundColor: hasChanges ? '#4CAF50' : '#ccc',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: hasChanges ? 'pointer' : 'not-allowed',
              fontSize: '14px',
              fontWeight: '600',
            }}
          >
            {isSaving ? `💾 ${t('saving')}` : `💾 ${t('save')}`}
          </button>
        </div>
      </div>

      {/* Zone d'édition/prévisualisation */}
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        gap: '16px',
        overflow: 'hidden',
      }}>
        {(viewMode === 'edit' || viewMode === 'split') && (
          <div style={{ 
            flex: viewMode === 'split' ? 1 : 'none',
            width: viewMode === 'split' ? '50%' : '100%',
            display: 'flex',
            flexDirection: 'column',
          }}>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              style={{
                flex: 1,
                width: '100%',
                padding: '16px',
                fontFamily: 'monospace',
                fontSize: '14px',
                lineHeight: 1.6,
                backgroundColor: codeBg,
                color: textColor,
                border: `1px solid ${borderColor}`,
                borderRadius: '8px',
                resize: 'none',
                outline: 'none',
              }}
              placeholder={t('typeYourTextHere')}
            />
          </div>
        )}

        {(viewMode === 'preview' || viewMode === 'split') && isMarkdown && (
          <div style={{ 
            flex: viewMode === 'split' ? 1 : 'none',
            width: viewMode === 'split' ? '50%' : '100%',
            padding: '16px',
            backgroundColor: cardBg,
            border: `1px solid ${borderColor}`,
            borderRadius: '8px',
            overflow: 'auto',
            color: textColor,
          }}>
            <div 
              dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
              style={{
                lineHeight: 1.8,
              }}
            />
          </div>
        )}

        {viewMode === 'preview' && !isMarkdown && (
          <pre style={{ 
            flex: 1,
            margin: 0, 
            whiteSpace: 'pre-wrap', 
            fontFamily: 'monospace', 
            fontSize: 14,
            lineHeight: 1.6,
            padding: 16,
            backgroundColor: codeBg,
            color: textColor,
            border: `1px solid ${borderColor}`,
            borderRadius: 8,
            overflow: 'auto',
          }}>
            {content}
          </pre>
        )}
      </div>
    </div>
  );
}
