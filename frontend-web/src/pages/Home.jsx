import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';

export default function Home() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, t, supportedLanguages } = useLanguage();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Données des slides
  const slidesData = [
    { icon: '☁️', key: 'slides.welcome' },
    { icon: '🔒', key: 'slides.security' },
    { icon: '⚡', key: 'slides.sync' },
    { icon: '📱', key: 'slides.platform' },
    { icon: '🔗', key: 'slides.sharing' }
  ];

  // Données des fonctionnalités gratuites
  const freeFeaturesItems = [
    { icon: '💾', key: 'freeFeatures.items.storage' },
    { icon: '📁', key: 'freeFeatures.items.folders' },
    { icon: '🔗', key: 'freeFeatures.items.sharing' },
    { icon: '🔒', key: 'freeFeatures.items.encryption' },
    { icon: '📱', key: 'freeFeatures.items.devices' },
    { icon: '⚡', key: 'freeFeatures.items.sync' }
  ];
  const totalSlides = slidesData.length;
  const isLastSlide = currentSlide === totalSlides - 1;
  const currentSlideData = slidesData[currentSlide];

  // Couleurs améliorées pour le thème clair
  const bgColor = theme === 'dark' ? '#0a0a0a' : '#fafbfc';
  const textColor = theme === 'dark' ? '#ffffff' : '#1a202c';
  const textSecondary = theme === 'dark' ? '#b0b0b0' : '#4a5568';
  const cardBg = theme === 'dark' ? '#1a1a1a' : '#ffffff';
  const borderColor = theme === 'dark' ? '#2d2d2d' : '#e2e8f0';
  const secondaryBg = theme === 'dark' ? '#2d2d2d' : '#f7fafc';
  const hoverBg = theme === 'dark' ? '#2d2d2d' : '#f0f4f8';
  const shadowColor = theme === 'dark' ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.08)';
  const shadowHover = theme === 'dark' ? 'rgba(0, 0, 0, 0.6)' : 'rgba(0, 0, 0, 0.12)';
  const shadowCard = theme === 'dark' 
    ? '0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)' 
    : '0 20px 60px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04)';
  const primaryColor = '#2196F3';
  const gradientStart = theme === 'dark' ? '#2196F3' : '#1976D2';
  const gradientEnd = theme === 'dark' ? '#64b5f6' : '#42a5f5';

  const handleNext = () => {
    if (isLastSlide) {
      navigate('/signup');
    } else {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentSlide(currentSlide + 1);
        setIsTransitioning(false);
      }, 200);
    }
  };

  const handlePrevious = () => {
    if (currentSlide > 0) {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentSlide(currentSlide - 1);
        setIsTransitioning(false);
      }, 200);
    }
  };

  const handleSkip = () => {
    navigate('/signup');
  };

  const goToSlide = (index) => {
    if (index !== currentSlide) {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentSlide(index);
        setIsTransitioning(false);
      }, 200);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: bgColor,
      color: textColor,
      transition: 'background-color 0.3s ease, color 0.3s ease',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Decorative background elements */}
      <div style={{
        position: 'absolute',
        top: '-50%',
        right: '-10%',
        width: '600px',
        height: '600px',
        borderRadius: '50%',
        background: `radial-gradient(circle, ${primaryColor}08 0%, transparent 70%)`,
        zIndex: 0
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-30%',
        left: '-10%',
        width: '500px',
        height: '500px',
        borderRadius: '50%',
        background: `radial-gradient(circle, ${primaryColor}06 0%, transparent 70%)`,
        zIndex: 0
      }} />

      {/* Navigation Bar */}
      <nav style={{
        padding: '24px clamp(20px, 5vw, 48px)',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '16px',
        backgroundColor: theme === 'dark' ? 'rgba(26, 26, 26, 0.95)' : 'rgba(255, 255, 255, 0.98)',
        backdropFilter: 'blur(24px) saturate(180%)',
        borderBottom: theme === 'dark' ? `1px solid ${borderColor}` : `1px solid rgba(226, 232, 240, 0.8)`,
        boxShadow: theme === 'dark' 
          ? '0 4px 6px -1px rgba(0, 0, 0, 0.3)' 
          : '0 4px 12px -2px rgba(0, 0, 0, 0.08), 0 2px 4px -1px rgba(0, 0, 0, 0.04)',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        transition: 'all 0.3s ease'
      }}>
        <div style={{
          fontSize: '32px',
          fontWeight: '900',
          color: theme === 'dark' ? '#64b5f6' : primaryColor,
          letterSpacing: '-1px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{ fontSize: '36px' }}>☁️</span>
          <span>Fylora</span>
        </div>
        
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '14px',
          alignItems: 'center',
          justifyContent: 'flex-end'
        }}>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            style={{
              padding: '10px 16px',
              borderRadius: '10px',
              border: theme === 'dark' ? `1.5px solid ${borderColor}` : `1.5px solid #e2e8f0`,
              backgroundColor: theme === 'dark' ? '#1e1e1e' : '#ffffff',
              color: textColor,
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              outline: 'none',
              transition: 'all 0.2s ease',
              minWidth: '130px',
              boxShadow: theme === 'dark' ? 'none' : '0 1px 3px rgba(0,0,0,0.08)'
            }}
            onMouseEnter={(e) => {
              e.target.style.borderColor = primaryColor;
              e.target.style.boxShadow = theme === 'dark' 
                ? `0 0 0 3px ${primaryColor}20` 
                : `0 2px 8px rgba(33, 150, 243, 0.15)`;
              e.target.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.target.style.borderColor = theme === 'dark' ? borderColor : '#e2e8f0';
              e.target.style.boxShadow = theme === 'dark' ? 'none' : '0 1px 3px rgba(0,0,0,0.08)';
              e.target.style.transform = 'translateY(0)';
            }}
          >
            {Object.values(supportedLanguages).map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.flag} {lang.nativeName}
              </option>
            ))}
          </select>

          <div style={{
            display: 'flex',
            gap: '4px',
            backgroundColor: theme === 'dark' ? '#1e1e1e' : '#f7fafc',
            padding: '4px',
            borderRadius: '12px',
            border: theme === 'dark' ? `1.5px solid ${borderColor}` : `1.5px solid #e2e8f0`,
            boxShadow: theme === 'dark' ? 'none' : '0 1px 3px rgba(0,0,0,0.08)'
          }}>
            <button
              onClick={() => setTheme('light')}
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: theme === 'light' ? primaryColor : 'transparent',
                color: theme === 'light' ? '#ffffff' : textColor,
                cursor: 'pointer',
                fontSize: '18px',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: theme === 'light' ? '700' : '500'
              }}
              onMouseEnter={(e) => {
                if (theme !== 'light') {
                  e.target.style.backgroundColor = theme === 'dark' ? '#2d2d2d' : '#e3f2fd';
                }
              }}
              onMouseLeave={(e) => {
                if (theme !== 'light') {
                  e.target.style.backgroundColor = 'transparent';
                }
              }}
            >
              ☀️
            </button>
            <button
              onClick={() => setTheme('dark')}
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: theme === 'dark' ? primaryColor : 'transparent',
                color: theme === 'dark' ? '#ffffff' : textColor,
                cursor: 'pointer',
                fontSize: '18px',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: theme === 'dark' ? '700' : '500'
              }}
              onMouseEnter={(e) => {
                if (theme !== 'dark') {
                  e.target.style.backgroundColor = theme === 'dark' ? '#2d2d2d' : '#e3f2fd';
                }
              }}
              onMouseLeave={(e) => {
                if (theme !== 'dark') {
                  e.target.style.backgroundColor = 'transparent';
                }
              }}
            >
              🌙
            </button>
          </div>

          <button
            onClick={handleSkip}
            style={{
              padding: '8px 20px',
              backgroundColor: theme === 'dark' ? 'transparent' : primaryColor,
              color: theme === 'dark' ? primaryColor : '#ffffff',
              border: `1.5px solid ${primaryColor}`,
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'all 0.2s',
              boxShadow: theme === 'dark' ? 'none' : '0 2px 8px rgba(33, 150, 243, 0.25)'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = theme === 'dark' ? `${primaryColor}15` : '#1976D2';
              e.target.style.borderColor = theme === 'dark' ? primaryColor : '#1976D2';
              e.target.style.transform = 'translateY(-1px)';
              e.target.style.boxShadow = theme === 'dark' ? 'none' : '0 4px 12px rgba(33, 150, 243, 0.35)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = theme === 'dark' ? 'transparent' : primaryColor;
              e.target.style.borderColor = primaryColor;
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = theme === 'dark' ? 'none' : '0 2px 8px rgba(33, 150, 243, 0.25)';
            }}
          >
            {t('nav.skip')}
          </button>

          <button
            onClick={() => navigate('/login')}
            style={{
              padding: '8px 20px',
              backgroundColor: theme === 'dark' ? 'transparent' : primaryColor,
              color: theme === 'dark' ? primaryColor : '#ffffff',
              border: `1.5px solid ${primaryColor}`,
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'all 0.2s',
              boxShadow: theme === 'dark' ? 'none' : '0 2px 8px rgba(33, 150, 243, 0.25)'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = theme === 'dark' ? `${primaryColor}15` : '#1976D2';
              e.target.style.borderColor = theme === 'dark' ? primaryColor : '#1976D2';
              e.target.style.transform = 'translateY(-1px)';
              e.target.style.boxShadow = theme === 'dark' ? 'none' : '0 4px 12px rgba(33, 150, 243, 0.35)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = theme === 'dark' ? 'transparent' : primaryColor;
              e.target.style.borderColor = primaryColor;
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = theme === 'dark' ? 'none' : '0 2px 8px rgba(33, 150, 243, 0.25)';
            }}
          >
            {t('nav.login')}
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 'clamp(20px, 5vw, 40px) clamp(16px, 4vw, 20px)',
        position: 'relative',
        zIndex: 1
      }}>
        {/* Slide Container */}
        <div style={{
          width: '100%',
          maxWidth: 'min(700px, 95vw)',
          position: 'relative'
        }}>
          {/* Slide Card */}
          <div style={{
            width: '100%',
            backgroundColor: cardBg,
            borderRadius: 'clamp(16px, 3vw, 24px)',
            padding: 'clamp(40px, 8vw, 80px) clamp(24px, 5vw, 50px)',
            border: `1px solid ${borderColor}`,
            boxShadow: shadowCard,
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden',
            opacity: isTransitioning ? 0.7 : 1,
            transform: isTransitioning ? 'scale(0.98)' : 'scale(1)',
            transition: 'all 0.3s ease'
          }}>
            {/* Icon Container */}
            <div style={{
              width: 'clamp(100px, 20vw, 140px)',
              height: 'clamp(100px, 20vw, 140px)',
              margin: '0 auto clamp(24px, 5vw, 40px)',
              borderRadius: '50%',
              backgroundColor: theme === 'dark' ? '#2d2d2d' : '#e3f2fd',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 'clamp(50px, 10vw, 70px)',
              position: 'relative',
              transition: 'all 0.3s ease'
            }}>
              <div style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                border: `3px solid ${primaryColor}30`,
                animation: 'pulse 2s ease-in-out infinite'
              }} />
              <span style={{ position: 'relative', zIndex: 1 }}>
                {currentSlideData.icon}
              </span>
            </div>

            {/* Title */}
            <h1 style={{
              fontSize: 'clamp(32px, 5vw, 42px)',
              fontWeight: '800',
              marginBottom: '20px',
              color: textColor,
              lineHeight: '1.2',
              letterSpacing: '-1px'
            }}>
              {t(`${currentSlideData.key}.title`)}
            </h1>

            {/* Description */}
            <p style={{
              fontSize: 'clamp(17px, 2.2vw, 19px)',
              color: theme === 'dark' ? '#ffffff' : textColor,
              lineHeight: '1.7',
              marginBottom: '30px',
              maxWidth: '580px',
              margin: '0 auto 30px',
              fontWeight: '400'
            }}>
              {t(`${currentSlideData.key}.description`)}
            </p>

            {/* Tagline - only on first slide */}
            {currentSlide === 0 && (
              <div style={{
                marginBottom: '40px',
                padding: '20px 28px',
                background: theme === 'dark' 
                  ? `linear-gradient(135deg, ${primaryColor}15 0%, ${primaryColor}08 100%)`
                  : `linear-gradient(135deg, #e3f2fd 0%, #f0f7ff 100%)`,
                borderRadius: '16px',
                border: `2px solid ${primaryColor}30`,
                maxWidth: '550px',
                margin: '0 auto 40px',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '-50%',
                  right: '-20%',
                  width: '200px',
                  height: '200px',
                  borderRadius: '50%',
                  background: `radial-gradient(circle, ${primaryColor}20 0%, transparent 70%)`,
                  zIndex: 0
                }} />
                <p style={{
                  fontSize: 'clamp(17px, 2.2vw, 20px)',
                  color: theme === 'dark' ? '#64b5f6' : primaryColor, // Couleur visible au lieu de transparent
                  fontWeight: '700',
                  margin: 0,
                  fontStyle: 'italic',
                  lineHeight: '1.6',
                  textAlign: 'center',
                  position: 'relative',
                  zIndex: 1
                }}>
                  "{t('tagline')}"
                </p>
              </div>
            )}

            {/* Free Features - only on first slide */}
            {currentSlide === 0 && (
              <div style={{
                marginBottom: '40px',
                padding: '32px 28px',
                backgroundColor: cardBg,
                borderRadius: '20px',
                border: `2px solid ${borderColor}`,
                boxShadow: theme === 'dark' 
                  ? '0 8px 24px rgba(0,0,0,0.4)' 
                  : '0 8px 24px rgba(0,0,0,0.08)',
                position: 'relative',
                overflow: 'hidden'
              }}>
                {/* Decorative element */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '4px',
                  background: `linear-gradient(90deg, ${gradientStart} 0%, ${gradientEnd} 100%)`
                }} />
                
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  marginBottom: '12px'
                }}>
                  <span style={{ fontSize: '24px' }}>✨</span>
                  <h3 style={{
                    fontSize: '20px',
                    fontWeight: '800',
                    color: theme === 'dark' ? '#64b5f6' : primaryColor, // Couleur visible au lieu de transparent
                    margin: 0,
                    textAlign: 'center'
                  }}>
                    {t('freeFeatures.title')}
                  </h3>
                  <span style={{ fontSize: '24px' }}>✨</span>
                </div>
                
                <p style={{
                  fontSize: '15px',
                  color: theme === 'dark' ? '#e0e0e0' : textSecondary,
                  marginBottom: '28px',
                  textAlign: 'center',
                  fontWeight: '400'
                }}>
                  {t('freeFeatures.subtitle')}
                </p>
                
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))',
                  gap: '14px'
                }}>
                  {freeFeaturesItems.map((item, index) => (
                    <div
                      key={index}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '14px 16px',
                        backgroundColor: theme === 'dark' ? '#252525' : secondaryBg,
                        borderRadius: '12px',
                        border: `1.5px solid ${borderColor}`,
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        cursor: 'default'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = primaryColor;
                        e.currentTarget.style.backgroundColor = theme === 'dark' 
                          ? '#2d2d2d' 
                          : hoverBg;
                        e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)';
                        e.currentTarget.style.boxShadow = theme === 'dark' 
                          ? `0 6px 20px ${primaryColor}30` 
                          : `0 6px 20px ${primaryColor}20`;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = borderColor;
                        e.currentTarget.style.backgroundColor = theme === 'dark' ? '#252525' : secondaryBg;
                        e.currentTarget.style.transform = 'translateY(0) scale(1)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <div style={{
                        fontSize: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        backgroundColor: theme === 'dark' ? '#1a1a1a' : cardBg,
                        flexShrink: 0
                      }}>
                        {item.icon}
                      </div>
                      <span style={{
                        fontSize: '15px',
                        color: textColor,
                        fontWeight: '600',
                        lineHeight: '1.4'
                      }}>
                        {t(item.key)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Progress Indicators */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '10px',
              marginBottom: '50px',
              alignItems: 'center'
            }}>
              {slidesData.map((_, index) => (
                <div
                  key={index}
                  onClick={() => goToSlide(index)}
                  style={{
                    width: index === currentSlide ? '36px' : '10px',
                    height: '10px',
                    borderRadius: '5px',
                    backgroundColor: index === currentSlide ? primaryColor : borderColor,
                    cursor: 'pointer',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => {
                    if (index !== currentSlide) {
                      e.currentTarget.style.width = '20px';
                      e.currentTarget.style.backgroundColor = primaryColor;
                      e.currentTarget.style.opacity = '0.6';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (index !== currentSlide) {
                      e.currentTarget.style.width = '10px';
                      e.currentTarget.style.backgroundColor = borderColor;
                      e.currentTarget.style.opacity = '1';
                    }
                  }}
                />
              ))}
            </div>

            {/* Navigation Buttons */}
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'center',
              alignItems: 'center',
              flexWrap: 'wrap'
            }}>
              {currentSlide > 0 && (
                <button
                  onClick={handlePrevious}
                  disabled={isTransitioning}
                  style={{
                    padding: '14px 28px',
                    fontSize: '15px',
                    fontWeight: '600',
                    backgroundColor: 'transparent',
                    color: textColor,
                    border: `1.5px solid ${borderColor}`,
                    borderRadius: '10px',
                    cursor: isTransitioning ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    opacity: isTransitioning ? 0.5 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (!isTransitioning) {
                      e.target.style.borderColor = primaryColor;
                      e.target.style.color = primaryColor;
                      e.target.style.backgroundColor = `${primaryColor}08`;
                      e.target.style.transform = 'translateX(-2px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isTransitioning) {
                      e.target.style.borderColor = borderColor;
                      e.target.style.color = textColor;
                      e.target.style.backgroundColor = 'transparent';
                      e.target.style.transform = 'translateX(0)';
                    }
                  }}
                >
                  <span>←</span>
                  <span>{t('buttons.previous')}</span>
                </button>
              )}

              <button
                onClick={handleNext}
                disabled={isTransitioning}
                style={{
                  padding: '14px 40px',
                  fontSize: '16px',
                  fontWeight: '700',
                  backgroundColor: primaryColor,
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: isTransitioning ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  minWidth: '160px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  opacity: isTransitioning ? 0.7 : 1,
                  boxShadow: `0 4px 14px ${primaryColor}40`
                }}
                onMouseEnter={(e) => {
                  if (!isTransitioning) {
                    e.target.style.backgroundColor = theme === 'dark' ? '#1976D2' : '#1976D2';
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = `0 6px 20px ${primaryColor}50`;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isTransitioning) {
                    e.target.style.backgroundColor = primaryColor;
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = `0 4px 14px ${primaryColor}40`;
                  }
                }}
              >
                <span>{isLastSlide ? t('buttons.start') : t('buttons.next')}</span>
                {!isLastSlide && <span>→</span>}
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={{
        padding: 'clamp(20px, 4vw, 30px) clamp(16px, 4vw, 40px)',
        backgroundColor: theme === 'dark' ? '#0f0f0f' : cardBg,
        borderTop: `1px solid ${borderColor}`,
        textAlign: 'center',
        boxShadow: theme === 'dark' ? 'none' : '0 -1px 3px rgba(0,0,0,0.05)'
      }}>
        <p style={{
          fontSize: '14px',
          color: theme === 'dark' ? '#b0b0b0' : textSecondary,
          margin: 0
        }}>
          © {new Date().getFullYear()} Fylora. {t('copyright')}
        </p>
      </footer>

      {/* CSS Animations */}
      <style>{`
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 0.5;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.3;
          }
        }
      `}</style>
    </div>
  );
}
