import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { shareService } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../components/Toast';

export default function Share() {
  const { token } = useParams();
  const { t, formatFileSize } = useLanguage();
  const { theme } = useTheme();
  const { showToast } = useToast();
  const [share, setShare] = useState(null);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [passwordRequired, setPasswordRequired] = useState(false);

  useEffect(() => {
    loadShare();
  }, [token]);

  const loadShare = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Essayer de charger le partage sans mot de passe d'abord
      const response = await shareService.getPublicShare(token);
      
      if (response.status === 200) {
        const shareData = response.data.data;
        setShare(shareData);
        // Vérifier si un mot de passe est requis
        if (shareData.share?.password_hash || shareData.share?.requires_password) {
          setPasswordRequired(true);
        }
      } else if (response.status === 401 && response.data?.requires_password) {
        setPasswordRequired(true);
      } else {
        setError(response.data?.error?.message || t('shareNotFound'));
      }
    } catch (err) {
      console.error('Load share error:', err);
      if (err.response?.status === 401 && err.response?.data?.requires_password) {
        setPasswordRequired(true);
      } else if (err.response?.status === 410) {
        setError(t('shareExpired'));
      } else if (err.response?.status === 403) {
        setError(t('shareDeactivated'));
      } else if (err.response?.status === 404) {
        setError(t('shareNotFoundError'));
      } else {
        setError(err.response?.data?.error?.message || t('errorLoadingShare'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!share || !share.resource) return;
    
    try {
      const resource = share.resource;
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';
      
      // Construire l'URL avec le token et le mot de passe si nécessaire
      const params = new URLSearchParams();
      params.append('token', token);
      if (password && password.trim() !== '') {
        params.append('password', password);
      }
      
      const downloadUrl = resource.type === 'file' 
        ? `${apiUrl}/api/files/${resource.id}/download?${params.toString()}`
        : `${apiUrl}/api/folders/${resource.id}/download?${params.toString()}`;
      
      console.log('Downloading from:', downloadUrl);
      
      // Pour les fichiers, utiliser fetch pour gérer les erreurs
      if (resource.type === 'file') {
        const response = await fetch(downloadUrl);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: { message: 'Erreur lors du téléchargement' } }));
          throw new Error(errorData.error?.message || `Erreur ${response.status}`);
        }
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = resource.name || 'download';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        // Pour les dossiers, utiliser fetch pour gérer le blob
        const response = await fetch(downloadUrl);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: { message: 'Erreur lors du téléchargement' } }));
          throw new Error(errorData.error?.message || `Erreur ${response.status}`);
        }
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${resource.name || 'folder'}.zip`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (err) {
      console.error('Download error:', err);
      showToast(err.message || t('downloadError') || 'Erreur lors du téléchargement', 'error');
    }
  };

  const verifyPassword = async () => {
    if (!password) {
      showToast(t('enterPassword'), 'warning');
      return;
    }
    
    try {
      setLoading(true);
      // Recharger le partage avec le mot de passe
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';
      const response = await fetch(`${apiUrl}/api/share/${token}?password=${encodeURIComponent(password)}`);
      
      if (response.ok) {
        const data = await response.json();
        setShare(data.data);
        setPasswordRequired(false);
      } else {
        const error = await response.json();
        showToast(error.error?.message || t('incorrectPassword'), 'error');
      }
    } catch (err) {
      console.error('Password verification error:', err);
      showToast(t('errorVerifyingPassword'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const cardBg = theme === 'dark' ? '#1e1e1e' : '#ffffff';
  const textColor = theme === 'dark' ? '#e0e0e0' : '#1a202c';
  const borderColor = theme === 'dark' ? '#333333' : '#e2e8f0';
  const bgColor = theme === 'dark' ? '#121212' : '#f8fafc';

  if (loading) {
    return <div style={{ padding: 24, textAlign: 'center', color: textColor }}>{t('loading')}</div>;
  }

  if (error) {
    return (
      <div style={{ padding: 24, textAlign: 'center', backgroundColor: bgColor, minHeight: '100vh' }}>
        <h2 style={{ color: textColor }}>{t('error')}</h2>
        <p style={{ color: textColor }}>{error}</p>
      </div>
    );
  }

  if (passwordRequired) {
    return (
      <div style={{ padding: 24, maxWidth: 400, margin: '0 auto', backgroundColor: bgColor, minHeight: '100vh', display: 'flex', alignItems: 'center' }}>
        <div style={{ width: '100%', padding: '24px', backgroundColor: cardBg, borderRadius: '12px', border: `1px solid ${borderColor}` }}>
          <h2 style={{ color: textColor, marginBottom: '16px' }}>{t('passwordProtected')}</h2>
          <div style={{ marginBottom: 16 }}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('enterPassword')}
              style={{ padding: 12, width: '100%', marginBottom: 8, backgroundColor: theme === 'dark' ? '#2d2d2d' : '#f5f5f5', color: textColor, border: `1px solid ${borderColor}`, borderRadius: '8px' }}
              onKeyPress={(e) => e.key === 'Enter' && verifyPassword()}
            />
            <button
              onClick={verifyPassword}
              style={{ padding: '12px 24px', backgroundColor: '#2196F3', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', width: '100%', fontSize: '16px', fontWeight: '600' }}
            >
              {t('access')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!share || !share.resource) {
    return <div style={{ padding: 24, color: textColor, backgroundColor: bgColor, minHeight: '100vh' }}>{t('resourceNotFound')}</div>;
  }

  const resource = share.resource;

  return (
    <div style={{ padding: 24, maxWidth: 600, margin: '0 auto', backgroundColor: bgColor, minHeight: '100vh' }}>
      <h1 style={{ color: textColor, marginBottom: '24px' }}>{t('fileShare')}</h1>
      <div style={{ padding: 24, backgroundColor: cardBg, border: `1px solid ${borderColor}`, borderRadius: 12, marginBottom: 16 }}>
        <h2 style={{ color: textColor, marginBottom: '16px' }}>{resource.name}</h2>
        {resource.type === 'file' && (
          <>
            <p style={{ color: textColor, marginBottom: '8px' }}>{t('size')}: {formatFileSize(resource.size)}</p>
            <p style={{ color: textColor, marginBottom: '16px' }}>{t('type')}: {resource.mime_type}</p>
          </>
        )}
        <button
          onClick={handleDownload}
          style={{ padding: '12px 24px', backgroundColor: '#2196F3', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 16, fontWeight: '600' }}
        >
          {resource.type === 'folder' ? t('downloadFolder') : t('downloadFile')}
        </button>
      </div>
    </div>
  );
}

