import React, { useState, useCallback } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';

export default function AdvancedFilters({ filters, onFiltersChange, onReset, availableTags = [] }) {
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(false);
  const [localFilters, setLocalFilters] = useState(filters || {
    type: 'all',
    mime_type: '',
    date_from: '',
    date_to: '',
    size_min: '',
    size_max: '',
    tags: [],
    search: '',
  });

  const cardBg = theme === 'dark' ? '#1e1e1e' : '#ffffff';
  const textColor = theme === 'dark' ? '#e0e0e0' : '#1a202c';
  const borderColor = theme === 'dark' ? '#333333' : '#e2e8f0';
  const textSecondary = theme === 'dark' ? '#b0b0b0' : '#64748b';
  const hoverBg = theme === 'dark' ? '#2d2d2d' : '#f1f5f9';
  const activeBg = '#2196F3';

  const handleFilterChange = useCallback((key, value) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    onFiltersChange?.(newFilters);
  }, [localFilters, onFiltersChange]);

  const handleTagToggle = useCallback((tagId) => {
    const newTags = localFilters.tags.includes(tagId)
      ? localFilters.tags.filter(id => id !== tagId)
      : [...localFilters.tags, tagId];
    handleFilterChange('tags', newTags);
  }, [localFilters.tags, handleFilterChange]);

  const handleReset = useCallback(() => {
    const defaultFilters = {
      type: 'all',
      mime_type: '',
      date_from: '',
      date_to: '',
      size_min: '',
      size_max: '',
      tags: [],
      search: '',
    };
    setLocalFilters(defaultFilters);
    onReset?.(defaultFilters);
    onFiltersChange?.(defaultFilters);
  }, [onReset, onFiltersChange]);

  const hasActiveFilters = Object.entries(localFilters).some(([key, value]) => {
    if (key === 'tags') return Array.isArray(value) && value.length > 0;
    return value && value !== 'all' && value !== '';
  });

  const activeFilterCount = Object.entries(localFilters).filter(([key, value]) => {
    if (key === 'tags') return Array.isArray(value) && value.length > 0;
    return value && value !== 'all' && value !== '';
  }).length;

  return (
    <div style={{
      backgroundColor: cardBg,
      borderRadius: '12px',
      border: `1px solid ${borderColor}`,
      padding: '16px',
      marginBottom: '16px',
    }}>
      {/* En-tête */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: isExpanded ? '16px' : '0',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            style={{
              padding: '8px 16px',
              backgroundColor: isExpanded ? activeBg : 'transparent',
              color: isExpanded ? 'white' : textColor,
              border: `1px solid ${isExpanded ? activeBg : borderColor}`,
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            🔍 {t('advancedFilters')}
            {activeFilterCount > 0 && (
              <span style={{
                backgroundColor: isExpanded ? 'rgba(255,255,255,0.3)' : activeBg,
                color: isExpanded ? 'white' : 'white',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: '700',
              }}>
                {activeFilterCount}
              </span>
            )}
          </button>
          {hasActiveFilters && (
            <button
              onClick={handleReset}
              style={{
                padding: '8px 16px',
                backgroundColor: 'transparent',
                color: textSecondary,
                border: `1px solid ${borderColor}`,
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              ✕ {t('reset')}
            </button>
          )}
        </div>
      </div>

      {/* Filtres */}
      {isExpanded && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
        }}>
          {/* Recherche */}
          <div>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '12px',
              fontWeight: '600',
              color: textSecondary,
              textTransform: 'uppercase',
            }}>
              {t('search')}
            </label>
            <input
              type="text"
              value={localFilters.search || ''}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              placeholder={t('fileNamePlaceholder')}
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: theme === 'dark' ? '#2d2d2d' : '#f5f5f5',
                color: textColor,
                border: `1px solid ${borderColor}`,
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
              }}
            />
          </div>

          {/* Type */}
          <div>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '12px',
              fontWeight: '600',
              color: textSecondary,
              textTransform: 'uppercase',
            }}>
              Type
            </label>
            <select
              value={localFilters.type || 'all'}
              onChange={(e) => handleFilterChange('type', e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: theme === 'dark' ? '#2d2d2d' : '#f5f5f5',
                color: textColor,
                border: `1px solid ${borderColor}`,
                borderRadius: '8px',
                fontSize: '14px',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value="all">{t('all')}</option>
              <option value="file">{t('files')}</option>
              <option value="folder">{t('folders')}</option>
            </select>
          </div>

          {/* Format MIME */}
          <div>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '12px',
              fontWeight: '600',
              color: textSecondary,
              textTransform: 'uppercase',
            }}>
              Format
            </label>
            <select
              value={localFilters.mime_type || ''}
              onChange={(e) => handleFilterChange('mime_type', e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: theme === 'dark' ? '#2d2d2d' : '#f5f5f5',
                color: textColor,
                border: `1px solid ${borderColor}`,
                borderRadius: '8px',
                fontSize: '14px',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value="">{t('allFormats')}</option>
              <option value="image/">{t('images')}</option>
              <option value="video/">{t('videos')}</option>
              <option value="audio/">{t('audio')}</option>
              <option value="application/pdf">{t('pdf')}</option>
              <option value="text/">{t('text')}</option>
              <option value="application/">{t('other')}</option>
            </select>
          </div>

          {/* Date début */}
          <div>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '12px',
              fontWeight: '600',
              color: textSecondary,
              textTransform: 'uppercase',
            }}>
              {t('startDate')}
            </label>
            <input
              type="date"
              value={localFilters.date_from || ''}
              onChange={(e) => handleFilterChange('date_from', e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: theme === 'dark' ? '#2d2d2d' : '#f5f5f5',
                color: textColor,
                border: `1px solid ${borderColor}`,
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
              }}
            />
          </div>

          {/* Date fin */}
          <div>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '12px',
              fontWeight: '600',
              color: textSecondary,
              textTransform: 'uppercase',
            }}>
              {t('endDate')}
            </label>
            <input
              type="date"
              value={localFilters.date_to || ''}
              onChange={(e) => handleFilterChange('date_to', e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: theme === 'dark' ? '#2d2d2d' : '#f5f5f5',
                color: textColor,
                border: `1px solid ${borderColor}`,
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
              }}
            />
          </div>

          {/* Taille min */}
          <div>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '12px',
              fontWeight: '600',
              color: textSecondary,
              textTransform: 'uppercase',
            }}>
              {t('minSize')}
            </label>
            <input
              type="number"
              value={localFilters.size_min || ''}
              onChange={(e) => handleFilterChange('size_min', e.target.value)}
              placeholder="0"
              min="0"
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: theme === 'dark' ? '#2d2d2d' : '#f5f5f5',
                color: textColor,
                border: `1px solid ${borderColor}`,
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
              }}
            />
          </div>

          {/* Taille max */}
          <div>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '12px',
              fontWeight: '600',
              color: textSecondary,
              textTransform: 'uppercase',
            }}>
              {t('maxSize')}
            </label>
            <input
              type="number"
              value={localFilters.size_max || ''}
              onChange={(e) => handleFilterChange('size_max', e.target.value)}
              placeholder="∞"
              min="0"
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: theme === 'dark' ? '#2d2d2d' : '#f5f5f5',
                color: textColor,
                border: `1px solid ${borderColor}`,
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
              }}
            />
          </div>
        </div>
      )}

      {/* Tags */}
      {isExpanded && availableTags.length > 0 && (
        <div style={{ marginTop: '16px' }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontSize: '12px',
            fontWeight: '600',
            color: textSecondary,
            textTransform: 'uppercase',
          }}>
            Tags
          </label>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
          }}>
            {availableTags.map(tag => (
              <button
                key={tag.id || tag._id}
                onClick={() => handleTagToggle(tag.id || tag._id)}
                style={{
                  padding: '6px 12px',
                  backgroundColor: localFilters.tags.includes(tag.id || tag._id) 
                    ? tag.color || activeBg 
                    : hoverBg,
                  color: localFilters.tags.includes(tag.id || tag._id) 
                    ? 'white' 
                    : textColor,
                  border: `1px solid ${localFilters.tags.includes(tag.id || tag._id) 
                    ? tag.color || activeBg 
                    : borderColor}`,
                  borderRadius: '20px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: '500',
                  transition: 'all 0.2s',
                }}
              >
                {tag.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filtres actifs (chips) */}
      {hasActiveFilters && (
        <div style={{
          marginTop: '16px',
          paddingTop: '16px',
          borderTop: `1px solid ${borderColor}`,
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
        }}>
          <span style={{
            fontSize: '12px',
            color: textSecondary,
            fontWeight: '600',
          }}>
            {t('activeFilters')}
          </span>
          {localFilters.type !== 'all' && (
            <span style={{
              padding: '4px 12px',
              backgroundColor: activeBg,
              color: 'white',
              borderRadius: '16px',
              fontSize: '12px',
            }}>
              {t('type')}: {localFilters.type}
            </span>
          )}
          {localFilters.mime_type && (
            <span style={{
              padding: '4px 12px',
              backgroundColor: activeBg,
              color: 'white',
              borderRadius: '16px',
              fontSize: '12px',
            }}>
              {t('mimeType')}: {localFilters.mime_type}
            </span>
          )}
          {localFilters.date_from && (
            <span style={{
              padding: '4px 12px',
              backgroundColor: activeBg,
              color: 'white',
              borderRadius: '16px',
              fontSize: '12px',
            }}>
              {t('since')} {new Date(localFilters.date_from).toLocaleDateString(language === 'en' ? 'en-US' : 'fr-FR')}
            </span>
          )}
          {localFilters.date_to && (
            <span style={{
              padding: '4px 12px',
              backgroundColor: activeBg,
              color: 'white',
              borderRadius: '16px',
              fontSize: '12px',
            }}>
              {t('until')} {new Date(localFilters.date_to).toLocaleDateString(language === 'en' ? 'en-US' : 'fr-FR')}
            </span>
          )}
          {localFilters.tags.length > 0 && (
            <span style={{
              padding: '4px 12px',
              backgroundColor: activeBg,
              color: 'white',
              borderRadius: '16px',
              fontSize: '12px',
            }}>
              {t('tags')}: {localFilters.tags.length}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

