import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { dashboardService, fileService } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { useDebounce } from '../utils/debounce';
import { useToast } from '../components/Toast';

export default function Search() {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { theme } = useTheme();
  const { showToast } = useToast();
  const [query, setQuery] = useState('');
  
  // Détecter la taille de l'écran pour le responsive
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const isMobile = windowWidth < 768;
  const isTablet = windowWidth >= 768 && windowWidth < 1024;
  
  // Couleurs dynamiques selon le thème - Thème clair amélioré
  const cardBg = theme === 'dark' ? '#1e1e1e' : '#ffffff';
  const textColor = theme === 'dark' ? '#e0e0e0' : '#1a202c';
  const borderColor = theme === 'dark' ? '#333333' : '#e2e8f0';
  const secondaryBg = theme === 'dark' ? '#2d2d2d' : '#f7fafc';
  const hoverBg = theme === 'dark' ? '#2d2d2d' : '#f0f4f8';
  const textSecondary = theme === 'dark' ? '#b0b0b0' : '#4a5568';
  const bgColor = theme === 'dark' ? '#121212' : '#fafbfc';
  const shadowColor = theme === 'dark' ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.08)';
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [itemActionMenuOpen, setItemActionMenuOpen] = useState(null); // ID de l'item dont le menu est ouvert
  const [filters, setFilters] = useState({
    type: 'all',
    mime_type: '',
    date_from: '',
    date_to: '',
  });

  // Debounce de la requête de recherche (300ms)
  const debouncedQuery = useDebounce(query, 300);

  // Recherche automatique quand la requête debouncée ou les filtres changent
  useEffect(() => {
    if (debouncedQuery.trim() || filters.date_from || filters.date_to || filters.mime_type || filters.type !== 'all') {
      handleSearch(debouncedQuery).catch(err => {
        console.error('Search error in useEffect:', err);
        setResults([]);
      });
    } else {
      setResults([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, filters.type, filters.mime_type, filters.date_from, filters.date_to]);

  // Fermer le menu d'actions au clic extérieur (mobile)
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (itemActionMenuOpen && !e.target.closest('[data-action-menu]')) {
        setItemActionMenuOpen(null);
      }
    };
    if (itemActionMenuOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [itemActionMenuOpen]);

  // Memoization de la fonction de recherche avec gestion d'erreur robuste
  const handleSearch = useCallback(async (searchQuery = query) => {
    // Permettre la recherche même sans query si des filtres sont appliqués
    const hasQuery = searchQuery && searchQuery.trim();
    const hasFilters = filters.date_from || filters.date_to || filters.mime_type || filters.type !== 'all';
    
    if (!hasQuery && !hasFilters) {
      setResults([]);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      // Préparer les paramètres de recherche avec validation
      const searchParams = {
        q: hasQuery ? String(searchQuery).trim() : '',
        type: filters.type === 'files' ? 'file' : filters.type === 'folders' ? 'folder' : (filters.type || 'all'),
        mime_type: filters.mime_type || undefined,
        date_from: filters.date_from || undefined,
        date_to: filters.date_to || undefined,
      };
      
      // Supprimer les paramètres undefined ou vides
      Object.keys(searchParams).forEach(key => {
        if (searchParams[key] === undefined || searchParams[key] === '' || searchParams[key] === 'all') {
          delete searchParams[key];
        }
      });
      
      // Validation supplémentaire pour éviter les erreurs
      if (!searchParams.q && !searchParams.type && !searchParams.mime_type && !searchParams.date_from && !searchParams.date_to) {
        setResults([]);
        setLoading(false);
        return;
      }
      
      const response = await dashboardService.search(searchParams.q || '', searchParams);
      
      // Validation de la réponse
      if (response && response.data && response.data.data) {
        setResults(Array.isArray(response.data.data.items) ? response.data.data.items : []);
      } else {
        setResults([]);
      }
    } catch (err) {
      console.error('Search failed:', err);
      console.error('Error details:', err.response?.data || err.message || err);
      setResults([]);
      // Afficher un message d'erreur à l'utilisateur seulement si ce n'est pas une erreur de réseau silencieuse
      const errorMessage = err.response?.data?.error?.message || err.message || 'Erreur inconnue';
      if (!errorMessage.includes('Network') && !errorMessage.includes('network')) {
        showToast(t('searchError') || 'Erreur lors de la recherche: ' + errorMessage, 'error');
      }
    } finally {
      setLoading(false);
    }
  }, [query, filters.type, filters.mime_type, filters.date_from, filters.date_to, t, showToast]);

  // Memoization de la fonction formatBytes
  const formatBytes = useCallback((bytes) => {
    if (!bytes) return '-';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }, []);

  // Memoization des résultats filtrés
  const filteredResults = useMemo(() => {
    return results;
  }, [results]);

  const handleFilterChange = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  // Gestion d'erreur avec try-catch pour éviter les crashes
  try {
    return (
      <div style={{ 
        padding: isMobile ? '16px' : isTablet ? '20px' : '24px', 
        maxWidth: '1400px', 
        margin: '0 auto',
        backgroundColor: bgColor,
        minHeight: '100vh',
        width: '100%',
        boxSizing: 'border-box'
      }}>
      <h1 style={{ 
        fontSize: isMobile ? '22px' : isTablet ? '26px' : '28px', 
        marginBottom: isMobile ? '16px' : '24px',
        fontWeight: '700',
        color: textColor
      }}>🔍 {t('search')}</h1>
      
      <div style={{ 
        marginBottom: isMobile ? 16 : 24, 
        padding: isMobile ? '16px' : isTablet ? '20px' : '24px', 
        backgroundColor: cardBg,
        border: `1px solid ${borderColor}`, 
        borderRadius: '12px',
        boxShadow: shadowColor
      }}>
        <div style={{ marginBottom: isMobile ? 16 : 20 }}>
          <div style={{ display: 'flex', gap: isMobile ? '8px' : '12px', flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('searchPlaceholder')}
              style={{ 
                padding: isMobile ? '12px 14px' : '14px 18px', 
                flex: 1,
                fontSize: isMobile ? '16px' : '16px',
                minWidth: isMobile ? '100%' : 'auto', 
                boxSizing: 'border-box',
                border: `1px solid ${borderColor}`,
                borderRadius: '8px',
                outline: 'none',
                transition: 'border-color 0.2s',
                backgroundColor: theme === 'dark' ? '#2d2d2d' : '#ffffff',
                color: textColor
              }}
              onFocus={(e) => e.target.style.borderColor = '#2196F3'}
              onBlur={(e) => e.target.style.borderColor = borderColor}
            />
            <button
              onClick={() => handleSearch()}
              disabled={loading}
              style={{ 
                padding: isMobile ? '12px 16px' : '14px 24px',
                fontSize: isMobile ? '14px' : '16px',
                backgroundColor: loading ? '#ccc' : '#2196F3',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: '500',
                transition: 'background-color 0.2s',
                minHeight: isMobile ? '44px' : 'auto',
                width: isMobile ? '100%' : 'auto'
              }}
            >
              {loading ? t('loading') || 'Chargement...' : t('search') || 'Rechercher'}
            </button>
          </div>
        </div>

        {/* Filtres */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: isMobile ? '1fr' : isTablet ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: isMobile ? '8px' : '12px',
          marginTop: isMobile ? '16px' : '20px'
        }}>
          <select
            value={filters.type}
            onChange={(e) => handleFilterChange('type', e.target.value)}
            style={{
              padding: '12px',
              fontSize: '14px',
              border: `1px solid ${borderColor}`,
              borderRadius: '8px',
              outline: 'none',
              backgroundColor: theme === 'dark' ? '#2d2d2d' : '#ffffff',
              color: textColor
            }}
          >
            <option value="all">{t('allTypes') || 'Tous les types'}</option>
            <option value="file">{t('files') || 'Fichiers'}</option>
            <option value="folder">{t('folders') || 'Dossiers'}</option>
          </select>

          <select
            value={filters.mime_type}
            onChange={(e) => handleFilterChange('mime_type', e.target.value)}
            style={{
              padding: '12px',
              fontSize: '14px',
              border: `1px solid ${borderColor}`,
              borderRadius: '8px',
              outline: 'none',
              backgroundColor: theme === 'dark' ? '#2d2d2d' : '#ffffff',
              color: textColor
            }}
          >
            <option value="">{t('allFormats') || 'Tous les formats'}</option>
            <option value="image/">{t('images') || 'Images'}</option>
            <option value="video/">{t('videos') || 'Vidéos'}</option>
            <option value="audio/">{t('audio') || 'Audio'}</option>
            <option value="application/pdf">{t('documents') || 'Documents'}</option>
          </select>

          <input
            type="date"
            value={filters.date_from}
            onChange={(e) => handleFilterChange('date_from', e.target.value)}
            placeholder={t('dateFrom') || 'Date début'}
            style={{
              padding: '12px',
              fontSize: '14px',
              border: `1px solid ${borderColor}`,
              borderRadius: '8px',
              outline: 'none',
              backgroundColor: theme === 'dark' ? '#2d2d2d' : '#ffffff',
              color: textColor
            }}
          />

          <input
            type="date"
            value={filters.date_to}
            onChange={(e) => handleFilterChange('date_to', e.target.value)}
            placeholder={t('dateTo') || 'Date fin'}
            style={{
              padding: '12px',
              fontSize: '14px',
              border: `1px solid ${borderColor}`,
              borderRadius: '8px',
              outline: 'none',
              backgroundColor: theme === 'dark' ? '#2d2d2d' : '#ffffff',
              color: textColor
            }}
          />
        </div>
      </div>

      {/* Résultats */}
      {loading && (
        <div style={{ 
          padding: '40px', 
          textAlign: 'center',
          color: textSecondary
        }}>
          <div style={{ color: textColor }}>{t('loading') || 'Chargement...'}</div>
        </div>
      )}

      {!loading && filteredResults.length === 0 && query && (
        <div style={{ 
          padding: '40px', 
          textAlign: 'center',
          color: textSecondary
        }}>
          <div style={{ color: textColor }}>{t('noResults') || 'Aucun résultat trouvé'}</div>
        </div>
      )}

      {!loading && filteredResults.length > 0 && (
        isMobile ? (
          /* Vue mobile optimisée - Cards au lieu de table */
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: isMobile ? '8px' : '12px'
          }}>
            {filteredResults.map((item) => {
              const itemId = item.id || item._id;
              const isFolder = item.item_type === 'folder' || item.type === 'folder';
              return (
                <div
                  key={itemId}
                  style={{
                    backgroundColor: cardBg,
                    border: `1px solid ${borderColor}`,
                    borderRadius: isMobile ? '8px' : '12px',
                    padding: isMobile ? '12px' : '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: isMobile ? '8px' : '12px',
                    transition: 'all 0.2s',
                    boxShadow: shadowColor
                  }}
                >
                  {/* Ligne 1: Nom + Menu Actions */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: isMobile ? '8px' : '12px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: isMobile ? '6px' : '8px',
                        marginBottom: isMobile ? '2px' : '4px'
                      }}>
                        <span style={{ fontSize: isMobile ? '18px' : '20px' }}>
                          {isFolder ? '📁' : '📄'}
                        </span>
                        <span style={{ 
                          fontSize: isMobile ? '14px' : '16px', 
                          fontWeight: '600', 
                          color: isFolder ? '#2196F3' : textColor,
                          wordBreak: 'break-word'
                        }}>
                          {item.name}
                        </span>
                      </div>
                      {item.updated_at && (
                        <div style={{ fontSize: isMobile ? '11px' : '12px', color: textSecondary, marginTop: isMobile ? '2px' : '4px' }}>
                          {new Date(item.updated_at).toLocaleDateString(language === 'en' ? 'en-US' : 'fr-FR', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      )}
                    </div>
                    {/* Menu Actions (⋮) */}
                    <div style={{ position: 'relative' }} data-action-menu>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setItemActionMenuOpen(itemActionMenuOpen === itemId ? null : itemId);
                        }}
                        style={{
                          padding: isMobile ? '6px' : '8px',
                          backgroundColor: 'transparent',
                          border: 'none',
                          borderRadius: isMobile ? '6px' : '8px',
                          cursor: 'pointer',
                          fontSize: isMobile ? '18px' : '20px',
                          color: textColor,
                          minWidth: isMobile ? '32px' : '36px',
                          minHeight: isMobile ? '32px' : '36px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.backgroundColor = hoverBg;
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.backgroundColor = 'transparent';
                        }}
                      >
                        ⋮
                      </button>
                      {/* Menu déroulant */}
                      {itemActionMenuOpen === itemId && (
                        <div
                          style={{
                            position: 'absolute',
                            right: 0,
                            top: '100%',
                            marginTop: '4px',
                            backgroundColor: cardBg,
                            border: `1px solid ${borderColor}`,
                            borderRadius: '8px',
                            boxShadow: theme === 'dark' ? '0 4px 12px rgba(0,0,0,0.6)' : '0 4px 12px rgba(0,0,0,0.15)',
                            zIndex: 1000,
                            minWidth: isMobile ? '160px' : '180px',
                            overflow: 'hidden'
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setItemActionMenuOpen(null);
                              if (isFolder) {
                                navigate(`/files?folder=${itemId}`);
                              } else {
                                navigate(`/preview/${itemId}`);
                              }
                            }}
                            style={{
                              width: '100%',
                              padding: isMobile ? '10px 14px' : '12px 16px',
                              backgroundColor: 'transparent',
                              border: 'none',
                              textAlign: 'left',
                              cursor: 'pointer',
                              fontSize: isMobile ? '13px' : '14px',
                              color: textColor,
                              display: 'flex',
                              alignItems: 'center',
                              gap: isMobile ? '6px' : '8px',
                              transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.backgroundColor = hoverBg;
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.backgroundColor = 'transparent';
                            }}
                          >
                            👁️ {t('view') || 'Voir'}
                          </button>
                          {!isFolder && (
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                setItemActionMenuOpen(null);
                                try {
                                  const response = await fileService.download(itemId);
                                  let blob;
                                  if (response.data instanceof Blob) {
                                    blob = response.data;
                                  } else if (response.data instanceof ArrayBuffer) {
                                    blob = new Blob([response.data]);
                                  } else {
                                    blob = new Blob([JSON.stringify(response.data)]);
                                  }
                                  const url = window.URL.createObjectURL(blob);
                                  const a = document.createElement('a');
                                  a.href = url;
                                  a.download = item.name || 'file';
                                  a.style.display = 'none';
                                  document.body.appendChild(a);
                                  a.click();
                                  setTimeout(() => {
                                    window.URL.revokeObjectURL(url);
                                    if (document.body.contains(a)) {
                                      document.body.removeChild(a);
                                    }
                                  }, 100);
                                } catch (err) {
                                  showToast(err.response?.data?.error?.message || err.message || t('downloadError') || 'Erreur lors du téléchargement', 'error');
                                }
                              }}
                              style={{
                                width: '100%',
                                padding: '12px 16px',
                                backgroundColor: 'transparent',
                                border: 'none',
                                textAlign: 'left',
                                cursor: 'pointer',
                                fontSize: '14px',
                                color: textColor,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                transition: 'all 0.2s'
                              }}
                              onMouseEnter={(e) => {
                                e.target.style.backgroundColor = hoverBg;
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.backgroundColor = 'transparent';
                              }}
                            >
                              ⬇️ {t('download') || 'Télécharger'}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Ligne 2: Type et Taille */}
                  <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: textSecondary }}>
                    <span>{isFolder ? '📁 Dossier' : item.mime_type || '-'}</span>
                    {item.size && <span>{formatBytes(item.size)}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{
            backgroundColor: cardBg,
            border: `1px solid ${borderColor}`,
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: shadowColor
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: secondaryBg, borderBottom: `2px solid ${borderColor}` }}>
                <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: textColor }}>
                  {t('name') || 'Nom'}
                </th>
                <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: textColor }}>
                  {t('type') || 'Type'}
                </th>
                <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: textColor }}>
                  {t('size') || 'Taille'}
                </th>
                <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: textColor }}>
                  {t('modified') || 'Modifié'}
                </th>
                <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: textColor }}>
                  {t('actions') || 'Actions'}
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredResults.map((item) => (
                <tr 
                  key={item.id} 
                  style={{ 
                    borderBottom: `1px solid ${borderColor}`,
                    transition: 'background-color 0.2s',
                    backgroundColor: cardBg
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = hoverBg}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = cardBg}
                >
                  <td style={{ padding: '16px', color: textColor }}>
                    {item.item_type === 'folder' || item.type === 'folder' ? '📁 ' : ''}
                    {item.name}
                  </td>
                  <td style={{ padding: '16px', color: textSecondary }}>
                    {item.item_type === 'folder' || item.type === 'folder' ? '📁 Dossier' : item.mime_type || '-'}
                  </td>
                  <td style={{ padding: '16px', color: textSecondary }}>
                    {item.size ? formatBytes(item.size) : '-'}
                  </td>
                  <td style={{ padding: '16px', color: textSecondary }}>
                    {item.updated_at ? new Date(item.updated_at).toLocaleDateString(language === 'en' ? 'en-US' : 'fr-FR', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : '-'}
                  </td>
                  <td style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => {
                          if (item.item_type === 'folder' || item.type === 'folder') {
                            navigate(`/files?folder=${item.id}`);
                          } else {
                            // Pour les fichiers, naviguer vers la page de prévisualisation
                            navigate(`/preview/${item.id}`);
                          }
                        }}
                        style={{
                          padding: '8px 16px',
                          fontSize: '14px',
                          backgroundColor: '#2196F3',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#1976D2'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = '#2196F3'}
                      >
                        {t('view') || 'Voir'}
                      </button>
                      {item.item_type !== 'folder' && item.type !== 'folder' && (
                        <button
                          onClick={async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            try {
                              const itemId = item.id || item._id;
                              if (!itemId) {
                                showToast(t('errorNoItemId') || 'Erreur: l\'élément n\'a pas d\'identifiant', 'error');
                                return;
                              }
                              
                              // Utiliser le service API pour le téléchargement avec responseType: 'blob'
                              const response = await fileService.download(itemId);
                              
                              // La réponse devrait déjà être un blob
                              let blob;
                              if (response.data instanceof Blob) {
                                blob = response.data;
                              } else if (response.data instanceof ArrayBuffer) {
                                blob = new Blob([response.data]);
                              } else {
                                // Si ce n'est pas un blob, essayer de le convertir
                                blob = new Blob([JSON.stringify(response.data)]);
                              }
                              
                              // Créer un lien de téléchargement
                              const url = window.URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = item.name || 'file';
                              a.style.display = 'none';
                              document.body.appendChild(a);
                              a.click();
                              
                              // Nettoyer après un court délai
                              setTimeout(() => {
                                window.URL.revokeObjectURL(url);
                                if (document.body.contains(a)) {
                                  document.body.removeChild(a);
                                }
                              }, 100);
                            } catch (err) {
                              console.error('Download error:', err);
                              const errorMessage = err.response?.data?.error?.message 
                                || err.message 
                                || t('downloadError') 
                                || 'Erreur lors du téléchargement';
                              showToast(errorMessage, 'error');
                            }
                          }}
                          style={{
                            padding: '8px 16px',
                            fontSize: '14px',
                            backgroundColor: '#4CAF50',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = '#45a049'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = '#4CAF50'}
                        >
                          {t('download') || 'Télécharger'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )
      )}
    </div>
  );
}
