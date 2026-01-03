import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { fileService, folderService } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuthStore } from '../services/authStore';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../components/Toast';

export default function Calendar() {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { theme } = useTheme();
  const { showToast, ToastContainer } = useToast();
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('month'); // 'month' | 'week' | 'day'
  const [selectedDate, setSelectedDate] = useState(null);
  const [filterType, setFilterType] = useState('all'); // 'all' | 'files' | 'folders'

  const cardBg = theme === 'dark' ? '#1e1e1e' : '#ffffff';
  const textColor = theme === 'dark' ? '#e0e0e0' : '#1a202c';
  const borderColor = theme === 'dark' ? '#333333' : '#e2e8f0';
  const textSecondary = theme === 'dark' ? '#b0b0b0' : '#64748b';
  const bgColor = theme === 'dark' ? '#121212' : '#f8fafc';
  const hoverBg = theme === 'dark' ? '#2d2d2d' : '#f1f5f9';
  const todayBg = theme === 'dark' ? '#2d5016' : '#d4edda';
  const selectedBg = '#2196F3';

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [filesResponse, foldersResponse] = await Promise.all([
        fileService.list(),
        folderService.list(),
      ]);

      setFiles(filesResponse.data?.items || []);
      setFolders(foldersResponse.data?.items || []);
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

  const allItems = useMemo(() => {
    const items = [];
    files.forEach(file => {
      items.push({
        ...file,
        type: 'file',
        date: new Date(file.created_at || file.uploaded_at),
      });
    });
    folders.forEach(folder => {
      items.push({
        ...folder,
        type: 'folder',
        date: new Date(folder.created_at),
      });
    });
    return items.filter(item => {
      if (filterType === 'files') return item.type === 'file';
      if (filterType === 'folders') return item.type === 'folder';
      return true;
    });
  }, [files, folders, filterType]);

  const itemsByDate = useMemo(() => {
    const grouped = {};
    allItems.forEach(item => {
      const dateKey = item.date.toISOString().split('T')[0];
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(item);
    });
    return grouped;
  }, [allItems]);

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Jours du mois précédent
    const prevMonth = new Date(year, month - 1, 0);
    const prevMonthDays = prevMonth.getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthDays - i),
        isCurrentMonth: false,
      });
    }

    // Jours du mois actuel
    for (let day = 1; day <= daysInMonth; day++) {
      days.push({
        date: new Date(year, month, day),
        isCurrentMonth: true,
      });
    }

    // Jours du mois suivant pour compléter la grille
    const remainingDays = 42 - days.length; // 6 semaines * 7 jours
    for (let day = 1; day <= remainingDays; day++) {
      days.push({
        date: new Date(year, month + 1, day),
        isCurrentMonth: false,
      });
    }

    return days;
  };

  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (date) => {
    if (!selectedDate) return false;
    return date.toDateString() === selectedDate.toDateString();
  };

  const getItemsForDate = (date) => {
    const dateKey = date.toISOString().split('T')[0];
    return itemsByDate[dateKey] || [];
  };

  const formatDate = (date) => {
    return date.toLocaleDateString(language === 'en' ? 'en-US' : 'fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const monthNames = language === 'en' 
    ? ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    : ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

  const dayNames = language === 'en'
    ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    : ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

  const navigateMonth = (direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  };

  const days = getDaysInMonth(currentDate);
  const selectedItems = selectedDate ? getItemsForDate(selectedDate) : [];

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: textSecondary }}>
        Chargement du calendrier...
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
          📅 Calendrier
        </h1>
        
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Filtres */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
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
            <option value="all">Tous</option>
            <option value="files">Fichiers uniquement</option>
            <option value="folders">Dossiers uniquement</option>
          </select>

          {/* Navigation */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={() => navigateMonth(-1)}
              style={{
                padding: '8px 12px',
                backgroundColor: cardBg,
                color: textColor,
                border: `1px solid ${borderColor}`,
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              ←
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              style={{
                padding: '8px 16px',
                backgroundColor: cardBg,
                color: textColor,
                border: `1px solid ${borderColor}`,
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              Aujourd'hui
            </button>
            <button
              onClick={() => navigateMonth(1)}
              style={{
                padding: '8px 12px',
                backgroundColor: cardBg,
                color: textColor,
                border: `1px solid ${borderColor}`,
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              →
            </button>
          </div>
        </div>
      </div>

      {/* Mois et année */}
      <div style={{
        textAlign: 'center',
        marginBottom: '24px',
        fontSize: '24px',
        fontWeight: '600',
        color: textColor,
      }}>
        {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
      </div>

      {/* Calendrier */}
      <div style={{
        backgroundColor: cardBg,
        borderRadius: '12px',
        padding: '20px',
        border: `1px solid ${borderColor}`,
        boxShadow: theme === 'dark' ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.08)',
      }}>
        {/* En-têtes des jours */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: '8px',
          marginBottom: '12px',
        }}>
          {dayNames.map(day => (
            <div
              key={day}
              style={{
                textAlign: 'center',
                fontWeight: '600',
                color: textSecondary,
                fontSize: '14px',
                padding: '8px',
              }}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Grille du calendrier */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: '8px',
        }}>
          {days.map((day, index) => {
            const items = getItemsForDate(day.date);
            const isTodayDate = isToday(day.date);
            const isSelectedDate = isSelected(day.date);

            return (
              <div
                key={index}
                onClick={() => setSelectedDate(day.date)}
                style={{
                  minHeight: '100px',
                  padding: '8px',
                  backgroundColor: isSelectedDate 
                    ? selectedBg 
                    : isTodayDate 
                      ? todayBg 
                      : day.isCurrentMonth 
                        ? cardBg 
                        : (theme === 'dark' ? '#1a1a1a' : '#f5f5f5'),
                  border: `1px solid ${borderColor}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  opacity: day.isCurrentMonth ? 1 : 0.5,
                }}
                onMouseEnter={(e) => {
                  if (!isSelectedDate) {
                    e.currentTarget.style.backgroundColor = hoverBg;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelectedDate) {
                    e.currentTarget.style.backgroundColor = isTodayDate 
                      ? todayBg 
                      : day.isCurrentMonth 
                        ? cardBg 
                        : (theme === 'dark' ? '#1a1a1a' : '#f5f5f5');
                  }
                }}
              >
                <div style={{
                  fontWeight: isTodayDate ? '700' : '500',
                  color: isSelectedDate ? 'white' : (isTodayDate ? '#155724' : textColor),
                  marginBottom: '4px',
                  fontSize: '14px',
                }}>
                  {day.date.getDate()}
                </div>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                }}>
                  {items.slice(0, 3).map((item, idx) => (
                    <div
                      key={idx}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (item.type === 'file') {
                          navigate(`/preview/${item.id || item._id}`);
                        } else {
                          navigate(`/files?folder=${item.id || item._id}`);
                        }
                      }}
                      style={{
                        fontSize: '10px',
                        padding: '2px 4px',
                        backgroundColor: item.type === 'file' ? '#2196F3' : '#4CAF50',
                        color: 'white',
                        borderRadius: '4px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        cursor: 'pointer',
                      }}
                      title={item.name}
                    >
                      {item.type === 'file' ? '📄' : '📁'} {item.name.substring(0, 15)}
                    </div>
                  ))}
                  {items.length > 3 && (
                    <div style={{
                      fontSize: '10px',
                      color: isSelectedDate ? 'white' : textSecondary,
                      padding: '2px 4px',
                    }}>
                      +{items.length - 3} autres
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Liste des éléments sélectionnés */}
      {selectedDate && (
        <div style={{
          marginTop: '24px',
          backgroundColor: cardBg,
          borderRadius: '12px',
          padding: '20px',
          border: `1px solid ${borderColor}`,
        }}>
          <h2 style={{
            margin: '0 0 16px 0',
            fontSize: '20px',
            fontWeight: '600',
            color: textColor,
          }}>
            {formatDate(selectedDate)}
          </h2>
          {selectedItems.length === 0 ? (
            <div style={{ color: textSecondary, textAlign: 'center', padding: '20px' }}>
              Aucun élément pour cette date
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {selectedItems.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    if (item.type === 'file') {
                      navigate(`/preview/${item.id || item._id}`);
                    } else {
                      navigate(`/files?folder=${item.id || item._id}`);
                    }
                  }}
                  style={{
                    padding: '12px',
                    backgroundColor: hoverBg,
                    borderRadius: '8px',
                    border: `1px solid ${borderColor}`,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateX(4px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateX(0)';
                  }}
                >
                  <span style={{ fontSize: '24px' }}>
                    {item.type === 'file' ? '📄' : '📁'}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', color: textColor, marginBottom: '4px' }}>
                      {item.name}
                    </div>
                    <div style={{ fontSize: '12px', color: textSecondary }}>
                      {item.type === 'file' ? 'Fichier' : 'Dossier'} • {formatDate(item.date)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <ToastContainer />
    </div>
  );
}

