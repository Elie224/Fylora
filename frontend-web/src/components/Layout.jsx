import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../services/authStore';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import Footer from './Footer';

export default function Layout({ children }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { t, language } = useLanguage();
  const { theme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  
  // Couleurs dynamiques selon le thème - Thème clair amélioré
  const navBg = theme === 'dark' ? '#1e1e1e' : '#ffffff';
  const navBorder = theme === 'dark' ? '#333333' : '#e2e8f0';
  const textColor = theme === 'dark' ? '#e0e0e0' : '#1a202c';
  const textSecondary = theme === 'dark' ? '#b0b0b0' : '#4a5568';
  const cardBg = theme === 'dark' ? '#1e1e1e' : '#ffffff';
  const hoverBg = theme === 'dark' ? '#2d2d2d' : '#f7fafc';
  const secondaryBg = theme === 'dark' ? '#2d2d2d' : '#f7fafc';
  const shadowColor = theme === 'dark' ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.08)';
  const shadowHover = theme === 'dark' ? 'rgba(0, 0, 0, 0.6)' : 'rgba(0, 0, 0, 0.12)';

  // Fermer les menus quand on change de page
  useEffect(() => {
    setMobileMenuOpen(false);
    setUserMenuOpen(false);
  }, [location.pathname]);

  // Fermer le menu mobile quand on clique sur l'overlay
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (mobileMenuOpen && !e.target.closest('.mobile-menu-drawer') && !e.target.closest('.mobile-menu-toggle')) {
        setMobileMenuOpen(false);
      }
      if (userMenuOpen && !e.target.closest('.user-menu-dropdown') && !e.target.closest('.user-menu-button')) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [mobileMenuOpen, userMenuOpen]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) {
    return children;
  }

  const navLinks = [
    { path: '/files', label: t('files'), icon: '📁' },
    { path: '/dashboard', label: t('dashboard'), icon: '📊' },
    { path: '/gallery', label: 'Galerie', icon: '📸' },
    { path: '/search', label: t('search'), icon: '🔍' },
    { path: '/trash', label: t('trash'), icon: '🗑️' },
    { path: '/activity', label: t('activity') || 'Activité', icon: '📋' },
    { path: '/settings', label: t('settings'), icon: '⚙️' },
    ...(user?.is_admin ? [{ path: '/admin', label: '⚙️ Administration', icon: '🔐' }] : []),
  ];

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh'
    }}>
      {/* En-tête principal */}
      <nav style={{ 
        padding: '0',
        borderBottom: `1px solid ${navBorder}`, 
        backgroundColor: navBg,
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        boxShadow: theme === 'dark' ? '0 2px 4px rgba(0,0,0,0.5)' : '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          padding: '0 16px',
          height: '64px',
          minHeight: '64px'
        }}>
          {/* GAUCHE: Hamburger + Logo (Mobile) */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '16px',
            flex: '0 0 auto'
          }}>
            {/* Menu Hamburger - TRÈS VISIBLE */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              style={{
                padding: '0',
                backgroundColor: '#2196F3',
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer',
                fontSize: '28px',
                width: '48px',
                height: '48px',
                color: '#ffffff',
                transition: 'all 0.2s ease',
                flexShrink: 0,
                boxShadow: '0 3px 6px rgba(33, 150, 243, 0.4)',
                fontWeight: 'bold',
                lineHeight: '48px',
                textAlign: 'center'
              }}
              className="mobile-menu-toggle"
              aria-label="Menu"
            >
              {mobileMenuOpen ? '✕' : '☰'}
            </button>
            
            {/* Logo Mobile */}
            <span style={{ 
              fontSize: '22px', 
              fontWeight: '700', 
              color: '#2196F3',
              letterSpacing: '-0.5px'
            }}
            className="mobile-logo"
            >
              Fylora
            </span>
          </div>

          {/* CENTRE: Navigation Desktop */}
          <div className="nav-links-desktop" style={{ 
            display: 'flex', 
            gap: '8px',
            flex: 1,
            justifyContent: 'center',
            margin: '0 24px'
          }}>
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                style={{
                  padding: '10px 16px',
                  textDecoration: 'none',
                  color: location.pathname === link.path ? '#2196F3' : (theme === 'dark' ? '#b0b0b0' : '#666'),
                  fontWeight: location.pathname === link.path ? '600' : '400',
                  borderRadius: '8px',
                  transition: 'all 0.2s',
                  minHeight: '44px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  fontSize: '15px',
                  position: 'relative'
                }}
                onMouseEnter={(e) => {
                  if (location.pathname !== link.path) {
                    e.target.style.backgroundColor = hoverBg;
                    e.target.style.color = textColor;
                  }
                }}
                onMouseLeave={(e) => {
                  if (location.pathname !== link.path) {
                    e.target.style.backgroundColor = 'transparent';
                    e.target.style.color = theme === 'dark' ? '#b0b0b0' : '#666';
                  }
                }}
              >
                {link.label}
                {location.pathname === link.path && (
                  <span style={{
                    position: 'absolute',
                    bottom: 0,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '30px',
                    height: '3px',
                    backgroundColor: '#2196F3',
                    borderRadius: '3px 3px 0 0'
                  }} />
                )}
              </Link>
            ))}
          </div>

          {/* DROITE: User Menu */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px',
            position: 'relative',
            flex: '0 0 auto'
          }}
          className="user-menu-container"
          >
            {/* User Menu Mobile */}
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              style={{
                padding: '8px 12px',
                backgroundColor: secondaryBg,
                border: 'none',
                borderRadius: '24px',
                cursor: 'pointer',
                fontSize: '14px',
                color: textColor,
                fontWeight: '500',
                minHeight: '40px',
                transition: 'background-color 0.2s'
              }}
              className="mobile-user-button user-menu-button"
            >
              {user.avatar_url ? (
                <img
                  src={user.avatar_url.startsWith('http') ? user.avatar_url : `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}${user.avatar_url}`}
                  alt="Avatar"
                  style={{ 
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    marginRight: '8px',
                    flexShrink: 0
                  }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'inline-block';
                  }}
                />
              ) : null}
              <span style={{ 
                display: user.avatar_url ? 'none' : 'inline-block',
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                backgroundColor: '#2196F3',
                color: 'white',
                lineHeight: '28px',
                textAlign: 'center',
                fontSize: '13px',
                fontWeight: '600',
                marginRight: '8px',
                flexShrink: 0
              }}>
                {(user.display_name || user.email || 'U').charAt(0).toUpperCase()}
              </span>
              <span style={{ 
                maxWidth: '100px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {user.display_name || user.email.split('@')[0]}
              </span>
            </button>

            {/* User Menu Desktop */}
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px 14px',
                backgroundColor: secondaryBg,
                border: 'none',
                borderRadius: '24px',
                cursor: 'pointer',
                fontSize: '14px',
                color: textColor,
                fontWeight: '500',
                transition: 'background-color 0.2s'
              }}
              className="desktop-user-button user-menu-button"
              onMouseEnter={(e) => e.target.style.backgroundColor = hoverBg}
              onMouseLeave={(e) => e.target.style.backgroundColor = secondaryBg}
            >
              {user.avatar_url ? (
                <img
                  src={user.avatar_url.startsWith('http') ? user.avatar_url : `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}${user.avatar_url}`}
                  alt="Avatar"
                  style={{ 
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    flexShrink: 0
                  }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'inline-block';
                  }}
                />
              ) : null}
              <span style={{ 
                display: user.avatar_url ? 'none' : 'inline-block',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: '#2196F3',
                color: 'white',
                lineHeight: '32px',
                textAlign: 'center',
                fontSize: '14px',
                fontWeight: '600',
                flexShrink: 0
              }}>
                {(user.display_name || user.email || 'U').charAt(0).toUpperCase()}
              </span>
              <span style={{ 
                maxWidth: '200px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {user.display_name || user.email}
              </span>
            </button>
            
            {/* Dropdown Menu Utilisateur */}
            {userMenuOpen && (
              <div className="user-menu-dropdown" style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '8px',
                backgroundColor: cardBg,
                border: `1px solid ${navBorder}`,
                borderRadius: '12px',
                boxShadow: theme === 'dark' ? '0 4px 12px rgba(0,0,0,0.5)' : '0 4px 12px rgba(0,0,0,0.15)',
                minWidth: '240px',
                zIndex: 1001,
                overflow: 'hidden'
              }}
              onClick={(e) => e.stopPropagation()}
              >
                <div style={{
                  padding: '16px',
                  borderBottom: `1px solid ${navBorder}`
                }}>
                  <div style={{ fontSize: '15px', fontWeight: '600', color: textColor, marginBottom: '4px' }}>
                    {user.display_name || user.email}
                  </div>
                  {user.email && user.display_name && (
                    <div style={{ fontSize: '13px', color: textSecondary }}>
                      {user.email}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => {
                    setUserMenuOpen(false);
                    handleLogout();
                  }}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    backgroundColor: theme === 'dark' ? 'transparent' : '#dc2626',
                    border: theme === 'dark' ? 'none' : `2px solid #dc2626`,
                    borderRadius: '10px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    fontSize: '15px',
                    color: theme === 'dark' ? '#f44336' : '#ffffff',
                    fontWeight: '700',
                    transition: 'all 0.2s',
                    boxShadow: theme === 'dark' ? 'none' : '0 2px 8px rgba(220, 38, 38, 0.3)'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = theme === 'dark' ? '#3d1f1f' : '#b91c1c';
                    e.target.style.borderColor = theme === 'dark' ? 'transparent' : '#b91c1c';
                    e.target.style.boxShadow = theme === 'dark' ? 'none' : '0 4px 12px rgba(220, 38, 38, 0.4)';
                    e.target.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = theme === 'dark' ? 'transparent' : '#dc2626';
                    e.target.style.borderColor = theme === 'dark' ? 'transparent' : '#dc2626';
                    e.target.style.boxShadow = theme === 'dark' ? 'none' : '0 2px 8px rgba(220, 38, 38, 0.3)';
                    e.target.style.transform = 'translateY(0)';
                  }}
                >
                  {t('logout')}
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Drawer Menu Mobile - S'ouvre depuis la gauche */}
      <div 
        className="mobile-menu-drawer"
        style={{
          position: 'fixed',
          top: 0,
          left: mobileMenuOpen ? '0' : '-280px',
          width: '280px',
          height: '100vh',
          backgroundColor: cardBg,
          boxShadow: theme === 'dark' ? '2px 0 8px rgba(0,0,0,0.5)' : '2px 0 8px rgba(0,0,0,0.15)',
          zIndex: 1002,
          transition: 'left 0.3s ease-out',
          overflowY: 'auto',
          paddingTop: '64px'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header du drawer */}
        <div style={{
          padding: '20px 16px',
          borderBottom: `1px solid ${navBorder}`,
          marginBottom: '8px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '12px'
          }}>
            {user.avatar_url ? (
              <img
                src={user.avatar_url.startsWith('http') ? user.avatar_url : `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}${user.avatar_url}`}
                alt="Avatar"
                style={{ 
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '2px solid #2196F3',
                  flexShrink: 0
                }}
                onError={(e) => {
                  e.target.style.display = 'none';
                  const fallback = e.target.nextElementSibling;
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
            ) : null}
            <div style={{
              display: user.avatar_url ? 'none' : 'flex',
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: '#2196F3',
              color: 'white',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              fontWeight: 'bold',
              flexShrink: 0
            }}>
              {(user.display_name || user.email || 'U').charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: '18px',
                fontWeight: '700',
                color: '#2196F3',
                marginBottom: '4px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                Fylora
              </div>
              <div style={{
                fontSize: '14px',
                fontWeight: '600',
                color: textColor,
                marginBottom: '2px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {user.display_name || user.email.split('@')[0]}
              </div>
              {user.email && (
                <div style={{
                  fontSize: '12px',
                  color: theme === 'dark' ? '#b0b0b0' : '#666',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  marginBottom: '8px'
                }}>
                  {user.email}
                </div>
              )}
              {/* Informations utilisateur améliorées */}
              <div style={{
                fontSize: '11px',
                color: theme === 'dark' ? '#90caf9' : '#2196F3',
                fontWeight: '600',
                marginTop: '4px',
                padding: '4px 8px',
                backgroundColor: theme === 'dark' ? '#1a237e' : '#e3f2fd',
                borderRadius: '6px',
                display: 'inline-block'
              }}>
                💾 {user.is_premium ? '⭐ Premium' : '🆓 Gratuit'}
              </div>
            </div>
          </div>
        </div>

          {/* Navigation Links - ALIGNÉS À GAUCHE */}
        <div style={{ padding: '8px 0' }}>
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => setMobileMenuOpen(false)}
              style={{
                padding: '16px 20px',
                textDecoration: 'none',
                color: location.pathname === link.path ? '#2196F3' : textColor,
                fontWeight: location.pathname === link.path ? '600' : '400',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                minHeight: '52px',
                backgroundColor: location.pathname === link.path ? (theme === 'dark' ? '#1a237e' : '#e3f2fd') : 'transparent',
                transition: 'all 0.2s ease',
                borderLeft: location.pathname === link.path ? '4px solid #2196F3' : '4px solid transparent',
                fontSize: '16px',
                width: '100%',
                textAlign: 'left',
                cursor: 'pointer'
              }}
              onTouchStart={(e) => {
                if (location.pathname !== link.path) {
                  e.currentTarget.style.backgroundColor = hoverBg;
                }
              }}
              onTouchEnd={(e) => {
                if (location.pathname !== link.path) {
                  setTimeout(() => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }, 200);
                }
              }}
              onMouseEnter={(e) => {
                if (location.pathname !== link.path) {
                  e.currentTarget.style.backgroundColor = hoverBg;
                }
              }}
              onMouseLeave={(e) => {
                if (location.pathname !== link.path) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              <span style={{ 
                fontSize: '20px',
                marginRight: '16px',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '24px'
              }}>{link.icon || '📄'}</span>
              <span style={{ flex: 1 }}>{link.label}</span>
            </Link>
          ))}
        </div>

        {/* Bouton Déconnexion dans le drawer */}
        <div style={{
          padding: '16px',
          borderTop: `1px solid ${navBorder}`,
          marginTop: 'auto'
        }}>
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              handleLogout();
            }}
            style={{
              width: '100%',
              padding: '14px',
              backgroundColor: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              fontSize: '15px',
              fontWeight: '700',
              transition: 'all 0.2s',
              boxShadow: theme === 'dark' ? 'none' : '0 2px 8px rgba(220, 38, 38, 0.3)'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#b91c1c';
              e.target.style.boxShadow = theme === 'dark' ? 'none' : '0 4px 12px rgba(220, 38, 38, 0.4)';
              e.target.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#dc2626';
              e.target.style.boxShadow = theme === 'dark' ? 'none' : '0 2px 8px rgba(220, 38, 38, 0.3)';
              e.target.style.transform = 'translateY(0)';
            }}
          >
            {t('logout')}
          </button>
        </div>
      </div>

      {/* Overlay sombre quand le menu est ouvert */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          onTouchStart={() => setMobileMenuOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 1001,
            transition: 'opacity 0.3s ease'
          }}
        />
      )}

      {/* Contenu principal */}
      <main style={{ flex: 1 }}>
        {children}
      </main>

      {/* Footer */}
      <Footer />

      <style>{`
        /* Mobile styles (< 768px) */
        @media (max-width: 767px) {
          .mobile-menu-toggle {
            display: flex !important;
            align-items: center;
            justify-content: center;
          }
          .mobile-logo {
            display: block !important;
          }
          .mobile-user-button {
            display: flex !important;
            align-items: center;
          }
          .nav-links-desktop {
            display: none !important;
          }
          .desktop-user-button {
            display: none !important;
          }
          .mobile-menu-drawer {
            display: block !important;
          }
        }
        /* Tablet styles (768px - 1023px) */
        @media (min-width: 768px) and (max-width: 1023px) {
          .mobile-menu-toggle {
            display: none !important;
          }
          .mobile-logo {
            display: none !important;
          }
          .mobile-user-button {
            display: none !important;
          }
          .mobile-menu-drawer {
            display: none !important;
          }
          .nav-links-desktop {
            display: flex !important;
            gap: 4px !important;
          }
          .desktop-user-button {
            display: flex !important;
          }
        }
        /* Desktop styles (>= 1024px) */
        @media (min-width: 1024px) {
          .mobile-menu-toggle {
            display: none !important;
          }
          .mobile-logo {
            display: none !important;
          }
          .mobile-user-button {
            display: none !important;
          }
          .mobile-menu-drawer {
            display: none !important;
          }
          .nav-links-desktop {
            display: flex !important;
            gap: 8px !important;
          }
          .desktop-user-button {
            display: flex !important;
          }
        }
      `}</style>
    </div>
  );
}
