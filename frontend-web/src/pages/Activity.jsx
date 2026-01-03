import React, { useEffect, useState } from 'react';
import { activityService } from '../services/activityService';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';

export default function Activity() {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    action_type: '',
    resource_type: '',
    date_from: '',
    date_to: '',
  });

  const cardBg = theme === 'dark' ? '#1e1e1e' : '#ffffff';
  const textColor = theme === 'dark' ? '#e0e0e0' : '#1a202c';
  const borderColor = theme === 'dark' ? '#333333' : '#e2e8f0';
  const textSecondary = theme === 'dark' ? '#b0b0b0' : '#4a5568';
  const bgColor = theme === 'dark' ? '#121212' : '#fafbfc';

  useEffect(() => {
    loadActivities();
  }, [page, filters]);

  const loadActivities = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await activityService.listActivities(page, 50, filters);
      setActivities(response.data?.activities || []);
      setTotalPages(response.data?.pagination?.pages || 1);
    } catch (err) {
      console.error('Failed to load activities:', err);
      setError(err.response?.data?.error?.message || 'Erreur lors du chargement des activités');
    } finally {
      setLoading(false);
    }
  };

  const exportActivities = async () => {
    try {
      const blob = await activityService.exportActivities(filters);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `activities_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Failed to export activities:', err);
      alert('Erreur lors de l\'export');
    }
  };

  const getActionIcon = (actionType) => {
    const icons = {
      file_upload: '📤',
      file_download: '⬇️',
      file_delete: '🗑️',
      file_rename: '✏️',
      file_move: '📦',
      file_share: '🔗',
      file_restore: '♻️',
      folder_create: '📁',
      folder_delete: '🗑️',
      folder_rename: '✏️',
      folder_move: '📦',
      folder_restore: '♻️',
      login: '🔐',
      logout: '🚪',
    };
    return icons[actionType] || '📋';
  };

  const formatDate = (dateString) => {
    const locale = language === 'en' ? 'en-US' : 'fr-FR';
    return new Date(dateString).toLocaleString(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div style={{ 
      padding: '24px', 
      maxWidth: '1400px', 
      margin: '0 auto',
      backgroundColor: bgColor,
      minHeight: '100vh'
    }}>
      <div style={{ 
        marginBottom: '24px',
        padding: '20px',
        backgroundColor: cardBg,
        borderRadius: '12px',
        boxShadow: theme === 'dark' ? '0 2px 8px rgba(0,0,0,0.5)' : '0 2px 8px rgba(0,0,0,0.08)',
        border: `1px solid ${borderColor}`
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <h1 style={{ 
            margin: 0, 
            fontSize: '28px',
            fontWeight: '700',
            color: textColor,
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            📋 Historique des activités
          </h1>
          <button
            onClick={exportActivities}
            style={{
              padding: '10px 20px',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            📥 Exporter en CSV
          </button>
        </div>
      </div>

      {/* Filtres */}
      <div style={{ 
        marginBottom: '24px',
        padding: '20px',
        backgroundColor: cardBg,
        borderRadius: '12px',
        boxShadow: theme === 'dark' ? '0 2px 8px rgba(0,0,0,0.5)' : '0 2px 8px rgba(0,0,0,0.08)',
        border: `1px solid ${borderColor}`
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: textColor, fontSize: '14px', fontWeight: '500' }}>
              Type d'action
            </label>
            <select
              value={filters.action_type}
              onChange={(e) => setFilters({ ...filters, action_type: e.target.value })}
              style={{
                width: '100%',
                padding: '8px 12px',
                backgroundColor: theme === 'dark' ? '#2d2d2d' : '#ffffff',
                color: textColor,
                border: `1px solid ${borderColor}`,
                borderRadius: '6px',
                fontSize: '14px'
              }}
            >
              <option value="">Tous</option>
              <option value="file_upload">Upload</option>
              <option value="file_download">Téléchargement</option>
              <option value="file_delete">Suppression</option>
              <option value="file_share">Partage</option>
              <option value="login">Connexion</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: textColor, fontSize: '14px', fontWeight: '500' }}>
              Type de ressource
            </label>
            <select
              value={filters.resource_type}
              onChange={(e) => setFilters({ ...filters, resource_type: e.target.value })}
              style={{
                width: '100%',
                padding: '8px 12px',
                backgroundColor: theme === 'dark' ? '#2d2d2d' : '#ffffff',
                color: textColor,
                border: `1px solid ${borderColor}`,
                borderRadius: '6px',
                fontSize: '14px'
              }}
            >
              <option value="">Tous</option>
              <option value="file">Fichier</option>
              <option value="folder">Dossier</option>
              <option value="user">Utilisateur</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: textColor, fontSize: '14px', fontWeight: '500' }}>
              Date de début
            </label>
            <input
              type="date"
              value={filters.date_from}
              onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
              style={{
                width: '100%',
                padding: '8px 12px',
                backgroundColor: theme === 'dark' ? '#2d2d2d' : '#ffffff',
                color: textColor,
                border: `1px solid ${borderColor}`,
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: textColor, fontSize: '14px', fontWeight: '500' }}>
              Date de fin
            </label>
            <input
              type="date"
              value={filters.date_to}
              onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
              style={{
                width: '100%',
                padding: '8px 12px',
                backgroundColor: theme === 'dark' ? '#2d2d2d' : '#ffffff',
                color: textColor,
                border: `1px solid ${borderColor}`,
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: textSecondary }}>
          <div style={{ fontSize: '18px', marginBottom: '8px' }}>⏳</div>
          <div style={{ color: textColor }}>Chargement...</div>
        </div>
      ) : error ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '40px', 
          color: '#d32f2f',
          backgroundColor: theme === 'dark' ? '#3d1f1f' : '#ffebee',
          borderRadius: '8px',
          border: `1px solid ${borderColor}`
        }}>
          <div style={{ fontSize: '24px', marginBottom: '12px' }}>⚠️</div>
          <div style={{ fontSize: '16px', fontWeight: '500', color: '#d32f2f' }}>
            {error}
          </div>
        </div>
      ) : activities.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: textSecondary }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
          <p style={{ fontSize: '16px', marginBottom: '8px', color: textColor }}>
            Aucune activité enregistrée
          </p>
        </div>
      ) : (
        <div style={{ 
          backgroundColor: cardBg,
          borderRadius: '12px',
          boxShadow: theme === 'dark' ? '0 2px 8px rgba(0,0,0,0.5)' : '0 2px 8px rgba(0,0,0,0.08)',
          border: `1px solid ${borderColor}`,
          overflow: 'hidden'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: theme === 'dark' ? '#2d2d2d' : '#f8f9fa', borderBottom: `2px solid ${borderColor}` }}>
                <th style={{ textAlign: 'left', padding: '16px', fontSize: '14px', fontWeight: '600', color: textColor }}>Action</th>
                <th style={{ textAlign: 'left', padding: '16px', fontSize: '14px', fontWeight: '600', color: textColor }}>Type</th>
                <th style={{ textAlign: 'left', padding: '16px', fontSize: '14px', fontWeight: '600', color: textColor }}>Date</th>
                <th style={{ textAlign: 'left', padding: '16px', fontSize: '14px', fontWeight: '600', color: textColor }}>Détails</th>
              </tr>
            </thead>
            <tbody>
              {activities.map((activity, index) => {
                // S'assurer que la clé est toujours une string
                const activityId = activity._id 
                  ? (typeof activity._id === 'string' ? activity._id : String(activity._id))
                  : `activity-${index}`;
                return (
                <tr 
                  key={activityId}
                  style={{ 
                    borderBottom: index < activities.length - 1 ? `1px solid ${borderColor}` : 'none',
                    backgroundColor: index % 2 === 0 ? cardBg : (theme === 'dark' ? '#252525' : '#fafafa'),
                  }}
                >
                  <td style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '20px' }}>{getActionIcon(activity.action_type)}</span>
                    <span style={{ color: textColor, fontSize: '14px' }}>{activity.action_type}</span>
                  </td>
                  <td style={{ padding: '16px', color: textSecondary, fontSize: '14px' }}>
                    {activity.resource_type}
                  </td>
                  <td style={{ padding: '16px', color: textSecondary, fontSize: '14px' }}>
                    {formatDate(activity.created_at)}
                  </td>
                  <td style={{ padding: '16px', color: textSecondary, fontSize: '14px' }}>
                    {JSON.stringify(activity.details || {})}
                  </td>
                </tr>
              );
              })}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ 
              padding: '16px', 
              display: 'flex', 
              justifyContent: 'center', 
              gap: '8px',
              borderTop: `1px solid ${borderColor}`
            }}>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{
                  padding: '8px 16px',
                  backgroundColor: page === 1 ? secondaryBg : '#2196F3',
                  color: page === 1 ? textSecondary : 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: page === 1 ? 'not-allowed' : 'pointer',
                  fontSize: '14px'
                }}
              >
                Précédent
              </button>
              <span style={{ padding: '8px 16px', color: textColor, display: 'flex', alignItems: 'center' }}>
                Page {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                style={{
                  padding: '8px 16px',
                  backgroundColor: page === totalPages ? secondaryBg : '#2196F3',
                  color: page === totalPages ? textSecondary : 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: page === totalPages ? 'not-allowed' : 'pointer',
                  fontSize: '14px'
                }}
              >
                Suivant
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}




