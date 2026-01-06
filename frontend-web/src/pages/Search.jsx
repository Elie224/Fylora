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
      handleSearch(debouncedQuery);
    } else {
      setResults([]);
    }
  }, [debouncedQuery, filters]);

  // Memoization de la fonction de recherche
  const handleSearch = useCallback(async (searchQuery = query) => {
    // Permettre la recherche même sans query si des filtres sont appliqués
    const hasQuery = searchQuery && searchQuery.trim();
    const hasFilters = filters.date_from || filters.date_to || filters.mime_type || filters.type !== 'all';
    
    if (!hasQuery && !hasFilters) {
      setResults([]);
      return;
    }
    
    setLoading(true);
    try {
      // Préparer les paramètres de recherche
      const searchParams = {
        q: hasQuery ? searchQuery.trim() : '',
        type: filters.type === 'files' ? 'file' : filters.type === 'folders' ? 'folder' : filters.type,
        mime_type: filters.mime_type || undefined,
        date_from: filters.date_from || undefined,
        date_to: filters.date_to || undefined,
      };
      
      // Supprimer les paramètres undefined
      Object.keys(searchParams).forEach(key => {
        if (searchParams[key] === undefined || searchParams[key] === '') {
          delete searchParams[key];
        }
      });
      
      const response = await dashboardService.search(searchParams.q || '', searchParams);
      setResults(response.data.data.items || []);
    } catch (err) {
      console.error('Search failed:', err);
      console.error('Error details:', err.response?.data || err.message);
      setResults([]);
      // Afficher un message d'erreur à l'utilisateur
      showToast(t('searchError') || 'Erreur lors de la recherche: ' + (err.response?.data?.error?.message || err.message || 'Erreur inconnue'), 'error');
    } finally {
      setLoading(false);
    }
  }, [query, filters]);

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

  return (
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
      }}>🔍 {t('search')}</h1>
      
      <div style={{ 
        marginBottom: 24, 
        padding: '24px', 
        backgroundColor: cardBg,
        border: `1px solid ${borderColor}`, 
        borderRadius: '12px',
        boxShadow: shadowColor
      }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: '12px' }}>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('searchPlaceholder')}
              style={{ 
                padding: '14px 18px', 
                flex: 1,
                fontSize: '16px', 
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
                padding: '14px 24px',
                fontSize: '16px',
                backgroundColor: loading ? '#ccc' : '#2196F3',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: '500',
                transition: 'background-color 0.2s'
              }}
            >
              {loading ? t('loading') || 'Chargement...' : t('search') || 'Rechercher'}
            </button>
          </div>
        </div>

        {/* Filtres */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px',
          marginTop: '20px'
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
      )}
    </div>
  );
}
