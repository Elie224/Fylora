import React, { useEffect, useState } from 'react';
import { noteTemplatesService } from '../services/noteTemplatesService';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';

export default function NoteTemplates({ onClose, onSelect }) {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('');

  const cardBg = theme === 'dark' ? '#1e1e1e' : '#ffffff';
  const textColor = theme === 'dark' ? '#e0e0e0' : '#1a202c';
  const borderColor = theme === 'dark' ? '#333333' : '#e2e8f0';
  const textSecondary = theme === 'dark' ? '#b0b0b0' : '#4a5568';

  useEffect(() => {
    loadTemplates();
  }, [category]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const response = await noteTemplatesService.listTemplates(category || null);
      setTemplates(response.data?.templates || []);
    } catch (err) {
      console.error('Failed to load templates:', err);
    } finally {
      setLoading(false);
    }
  };

  const createFromTemplate = async (templateId) => {
    try {
      const response = await noteTemplatesService.createNoteFromTemplate(templateId);
      const note = response.data?.note;
      if (note) {
        navigate(`/notes/${note.id || note._id}`);
        if (onSelect) onSelect();
        if (onClose) onClose();
      }
    } catch (err) {
      console.error('Failed to create note from template:', err);
      alert('Erreur lors de la création');
    }
  };

  const categories = [
    { value: '', label: 'Tous', icon: '📋' },
    { value: 'general', label: 'Général', icon: '📄' },
    { value: 'meeting', label: 'Réunion', icon: '👥' },
    { value: 'project', label: 'Projet', icon: '📊' },
    { value: 'personal', label: 'Personnel', icon: '👤' },
    { value: 'work', label: 'Travail', icon: '💼' },
    { value: 'education', label: 'Éducation', icon: '📚' },
  ];

  const getCategoryIcon = (cat) => {
    const category = categories.find(c => c.value === cat);
    return category ? category.icon : '📋';
  };

  return (
    <div style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: '90%',
      maxWidth: '800px',
      maxHeight: '80vh',
      backgroundColor: cardBg,
      borderRadius: '12px',
      border: `1px solid ${borderColor}`,
      display: 'flex',
      flexDirection: 'column',
      zIndex: 1000,
      boxShadow: theme === 'dark' ? '0 8px 32px rgba(0,0,0,0.5)' : '0 8px 32px rgba(0,0,0,0.15)',
    }}>
      <div style={{
        padding: '20px',
        borderBottom: `1px solid ${borderColor}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <h2 style={{ margin: 0, color: textColor }}>📋 Templates de notes</h2>
        <button
          onClick={onClose}
          style={{
            padding: '4px 12px',
            backgroundColor: 'transparent',
            border: 'none',
            color: textColor,
            cursor: 'pointer',
            fontSize: '24px',
            fontWeight: 'bold',
          }}
        >
          ×
        </button>
      </div>

      <div style={{
        padding: '16px',
        borderBottom: `1px solid ${borderColor}`,
      }}>
        <div style={{
          display: 'flex',
          gap: '8px',
          flexWrap: 'wrap',
        }}>
          {categories.map(cat => (
            <button
              key={cat.value}
              onClick={() => setCategory(cat.value)}
              style={{
                padding: '8px 12px',
                backgroundColor: category === cat.value 
                  ? '#2196F3' 
                  : (theme === 'dark' ? '#2d2d2d' : '#f7fafc'),
                color: category === cat.value ? 'white' : textColor,
                border: `1px solid ${category === cat.value ? '#2196F3' : borderColor}`,
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: category === cat.value ? '600' : '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                if (category !== cat.value) {
                  e.currentTarget.style.backgroundColor = theme === 'dark' ? '#333333' : '#e2e8f0';
                }
              }}
              onMouseLeave={(e) => {
                if (category !== cat.value) {
                  e.currentTarget.style.backgroundColor = theme === 'dark' ? '#2d2d2d' : '#f7fafc';
                }
              }}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px',
      }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: textSecondary, padding: '40px' }}>
            Chargement...
          </div>
        ) : templates.length === 0 ? (
          <div style={{ textAlign: 'center', color: textSecondary, padding: '40px' }}>
            Aucun template disponible
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: '16px',
          }}>
            {templates.map((template) => (
              <div
                key={template._id || template.id}
                onClick={() => createFromTemplate(template._id || template.id)}
                style={{
                  padding: '16px',
                  backgroundColor: theme === 'dark' ? '#2d2d2d' : '#f7fafc',
                  borderRadius: '8px',
                  border: `1px solid ${borderColor}`,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = theme === 'dark' ? '#333333' : '#e2e8f0';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = theme === 'dark' ? '#2d2d2d' : '#f7fafc';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{
                  fontSize: '32px',
                  marginBottom: '8px',
                  textAlign: 'center',
                }}>
                  {getCategoryIcon(template.category)}
                </div>
                <div style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: textColor,
                  marginBottom: '6px',
                  textAlign: 'center',
                }}>
                  {template.name}
                </div>
                {template.description && (
                  <div style={{
                    fontSize: '12px',
                    color: textSecondary,
                    marginBottom: '8px',
                    textAlign: 'center',
                    lineHeight: '1.4',
                  }}>
                    {template.description}
                  </div>
                )}
                <div style={{
                  fontSize: '11px',
                  color: textSecondary,
                  textAlign: 'center',
                  padding: '4px 8px',
                  backgroundColor: theme === 'dark' ? '#1e1e1e' : '#ffffff',
                  borderRadius: '4px',
                  display: 'inline-block',
                  width: '100%',
                }}>
                  {template.usage_count || 0} {template.usage_count === 1 ? 'utilisation' : 'utilisations'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


