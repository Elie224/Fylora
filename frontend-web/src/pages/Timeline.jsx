import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { fileService, folderService } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuthStore } from '../services/authStore';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../components/Toast';

export default function Timeline() {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { theme } = useTheme();
  const { showToast, ToastContainer } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [groupedItems, setGroupedItems] = useState({});
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [zoomLevel, setZoomLevel] = useState('month'); // 'day' | 'week' | 'month' | 'year'

  const cardBg = theme === 'dark' ? '#1e1e1e' : '#ffffff';
  const textColor = theme === 'dark' ? '#e0e0e0' : '#1a202c';
  const borderColor = theme === 'dark' ? '#333333' : '#e2e8f0';
  const textSecondary = theme === 'dark' ? '#b0b0b0' : '#64748b';
  const bgColor = theme === 'dark' ? '#121212' : '#f8fafc';
  const hoverBg = theme === 'dark' ? '#2d2d2d' : '#f1f5f9';

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [filesResponse, foldersResponse] = await Promise.all([
        fileService.list(),
        folderService.list(),
      ]);

      const allItems = [
        ...(filesResponse.data?.items || []).map(f => ({ ...f, type: 'file' })),
        ...(foldersResponse.data?.items || []).map(f => ({ ...f, type: 'folder' })),
      ];

      setItems(allItems);
    } catch (err) {
      console.error('Failed to load data:', err);
      showToast('Erreur lors du chargement', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const groupedByPeriod = useMemo(() => {
    const grouped = {};
    items.forEach(item => {
      const date = new Date(item.created_at || item.uploaded_at);
      let periodKey;

      switch (zoomLevel) {
        case 'day':
          periodKey = date.toISOString().split('T')[0];
          break;
        case 'week':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          periodKey = weekStart.toISOString().split('T')[0];
          break;
        case 'month':
          periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        case 'year':
          periodKey = String(date.getFullYear());
          break;
        default:
          periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }

      if (!grouped[periodKey]) {
        grouped[periodKey] = [];
      }
      grouped[periodKey].push(item);
    });

    // Trier les périodes
    const sorted = Object.entries(grouped).sort(([a], [b]) => {
      return new Date(b) - new Date(a);
    });

    return Object.fromEntries(sorted);
  }, [items, zoomLevel]);

  const formatPeriod = useCallback((periodKey) => {
    switch (zoomLevel) {
      case 'day':
        return new Date(periodKey).toLocaleDateString(language === 'en' ? 'en-US' : 'fr-FR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      case 'week':
        const weekStart = new Date(periodKey);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        return `${weekStart.toLocaleDateString(language === 'en' ? 'en-US' : 'fr-FR', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString(language === 'en' ? 'en-US' : 'fr-FR', { month: 'short', day: 'numeric', year: 'numeric' })}`;
      case 'month':
        const [year, month] = periodKey.split('-');
        return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString(language === 'en' ? 'en-US' : 'fr-FR', {
          year: 'numeric',
          month: 'long',
        });
      case 'year':
        return periodKey;
      default:
        return periodKey;
    }
  }, [zoomLevel, language]);

  const formatDate = useCallback((dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString(language === 'en' ? 'en-US' : 'fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, [language]);

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: textSecondary }}>
        Chargement de la timeline...
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
          ⏱️ Timeline
        </h1>
        
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {/* Zoom */}
          <select
            value={zoomLevel}
            onChange={(e) => setZoomLevel(e.target.value)}
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
            <option value="day">Jour</option>
            <option value="week">Semaine</option>
            <option value="month">Mois</option>
            <option value="year">Année</option>
          </select>
        </div>
      </div>

      {/* Timeline */}
      <div style={{
        position: 'relative',
        paddingLeft: '40px',
      }}>
        {/* Ligne verticale */}
        <div style={{
          position: 'absolute',
          left: '20px',
          top: 0,
          bottom: 0,
          width: '2px',
          backgroundColor: borderColor,
        }} />

        {/* Périodes */}
        {Object.entries(groupedByPeriod).map(([periodKey, periodItems], periodIndex) => (
          <div key={periodKey} style={{ marginBottom: '32px', position: 'relative' }}>
            {/* Point sur la ligne */}
            <div style={{
              position: 'absolute',
              left: '-30px',
              top: '8px',
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              backgroundColor: '#2196F3',
              border: `3px solid ${cardBg}`,
              zIndex: 2,
            }} />

            {/* En-tête de période */}
            <div style={{
              marginBottom: '16px',
              padding: '12px 16px',
              backgroundColor: cardBg,
              borderRadius: '8px',
              border: `1px solid ${borderColor}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <h2 style={{
                margin: 0,
                fontSize: '18px',
                fontWeight: '600',
                color: textColor,
              }}>
                {formatPeriod(periodKey)}
              </h2>
              <span style={{
                fontSize: '14px',
                color: textSecondary,
                backgroundColor: hoverBg,
                padding: '4px 12px',
                borderRadius: '12px',
              }}>
                {periodItems.length} {periodItems.length === 1 ? 'élément' : 'éléments'}
              </span>
            </div>

            {/* Items de la période */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}>
              {periodItems
                .sort((a, b) => new Date(b.created_at || b.uploaded_at) - new Date(a.created_at || a.uploaded_at))
                .map((item, itemIndex) => {
                  const itemId = item.id || item._id;
                  const isFile = item.type === 'file';

                  return (
                    <div
                      key={itemIndex}
                      onClick={() => {
                        if (isFile) {
                          navigate(`/preview/${itemId}`);
                        } else {
                          navigate(`/files?folder=${itemId}`);
                        }
                      }}
                      style={{
                        padding: '16px',
                        backgroundColor: cardBg,
                        borderRadius: '8px',
                        border: `1px solid ${borderColor}`,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateX(8px)';
                        e.currentTarget.style.borderColor = '#2196F3';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateX(0)';
                        e.currentTarget.style.borderColor = borderColor;
                      }}
                    >
                      <div style={{
                        fontSize: '32px',
                        width: '48px',
                        height: '48px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: hoverBg,
                        borderRadius: '8px',
                      }}>
                        {isFile ? '📄' : '📁'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontWeight: '600',
                          color: textColor,
                          marginBottom: '4px',
                          fontSize: '16px',
                        }}>
                          {item.name}
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: textSecondary,
                        }}>
                          {formatDate(item.created_at || item.uploaded_at)} • {isFile ? 'Fichier' : 'Dossier'}
                          {isFile && item.size && ` • ${(item.size / 1024 / 1024).toFixed(2)} MB`}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        ))}
      </div>

      {Object.keys(groupedByPeriod).length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          color: textSecondary,
        }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>⏱️</div>
          <div style={{ fontSize: '18px', fontWeight: '500', marginBottom: '8px', color: textColor }}>
            Aucun élément trouvé
          </div>
          <div style={{ fontSize: '14px' }}>
            Votre timeline apparaîtra ici une fois que vous aurez des fichiers ou dossiers
          </div>
        </div>
      )}

      <ToastContainer />
    </div>
  );
}

