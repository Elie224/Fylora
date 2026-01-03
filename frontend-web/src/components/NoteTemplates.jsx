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

  // Images de fond pour chaque catégorie de template
  const categoryBackgrounds = {
    meeting: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    project: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    education: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    work: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    personal: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    general: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
  };

  // Icônes pour chaque catégorie
  const categoryIcons = {
    meeting: '🤝',
    project: '📊',
    education: '📚',
    work: '💼',
    personal: '📝',
    general: '📋',
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
            {templates.map((template) => {
              const category = template.category || 'general';
              const background = categoryBackgrounds[category] || categoryBackgrounds.general;
              const icon = categoryIcons[category] || '📋';
              
              return (
              <div
                key={template._id || template.id}
                onClick={() => createFromTemplate(template._id || template.id)}
                style={{
                  padding: '20px',
                  background: theme === 'dark' 
                    ? `linear-gradient(135deg, rgba(30, 30, 30, 0.85) 0%, rgba(45, 45, 45, 0.85) 100%), ${background}`
                    : background,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  borderRadius: '12px',
                  border: `1px solid ${borderColor}`,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  position: 'relative',
                  overflow: 'hidden',
                  minHeight: '160px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: theme === 'dark' 
                    ? '0 4px 12px rgba(0, 0, 0, 0.5)' 
                    : '0 4px 12px rgba(0, 0, 0, 0.15)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)';
                  e.currentTarget.style.boxShadow = theme === 'dark' 
                    ? '0 8px 20px rgba(0, 0, 0, 0.7)' 
                    : '0 8px 20px rgba(0, 0, 0, 0.25)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                  e.currentTarget.style.boxShadow = theme === 'dark' 
                    ? '0 4px 12px rgba(0, 0, 0, 0.5)' 
                    : '0 4px 12px rgba(0, 0, 0, 0.15)';
                }}
              >
                {/* Overlay pour améliorer la lisibilité */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: theme === 'dark' 
                    ? 'rgba(0, 0, 0, 0.4)' 
                    : 'rgba(255, 255, 255, 0.6)',
                  zIndex: 0,
                }}></div>
                
                {/* Contenu du template */}
                <div style={{ position: 'relative', zIndex: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '10px',
                      marginBottom: '12px'
                    }}>
                      <span style={{ fontSize: '32px' }}>{icon}</span>
                      <h3 style={{ 
                        fontSize: '18px', 
                        fontWeight: '600',
                        margin: 0,
                        color: theme === 'dark' ? '#ffffff' : '#1a202c',
                        textShadow: theme === 'dark' ? '0 2px 4px rgba(0,0,0,0.3)' : '0 1px 2px rgba(255,255,255,0.8)'
                      }}>
                        {template.name}
                      </h3>
                    </div>
                    
                    {template.description && (
                      <p style={{ 
                        fontSize: '13px',
                        color: theme === 'dark' ? 'rgba(255,255,255,0.9)' : 'rgba(26,32,44,0.8)',
                        margin: 0,
                        lineHeight: '1.5',
                        textShadow: theme === 'dark' ? '0 1px 2px rgba(0,0,0,0.2)' : '0 1px 2px rgba(255,255,255,0.8)'
                      }}>
                        {template.description}
                      </p>
                    )}
                  </div>
                  
                  <div style={{
                    fontSize: '11px',
                    color: theme === 'dark' ? 'rgba(255,255,255,0.8)' : 'rgba(26,32,44,0.7)',
                    textAlign: 'center',
                    padding: '6px 10px',
                    backgroundColor: theme === 'dark' 
                      ? 'rgba(0, 0, 0, 0.3)' 
                      : 'rgba(255, 255, 255, 0.8)',
                    borderRadius: '6px',
                    marginTop: '12px',
                    fontWeight: '500',
                    textShadow: theme === 'dark' ? '0 1px 2px rgba(0,0,0,0.3)' : 'none'
                  }}>
                    {template.usage_count || 0} {template.usage_count === 1 ? 'utilisation' : 'utilisations'}
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}


