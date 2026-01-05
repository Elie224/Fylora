import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';

export default function Home() {
  const navigate = useNavigate();
  const { theme } = useTheme();
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

  // Thème sombre uniquement
  const bgColor = '#0a0a0a';
  const textColor = '#ffffff';
  const textSecondary = '#b0b0b0';
  const cardBg = '#1a1a1a';
  const borderColor = '#2d2d2d';
  const secondaryBg = '#2d2d2d';
  const hoverBg = '#2d2d2d';
  const shadowColor = 'rgba(0, 0, 0, 0.5)';
  const shadowHover = 'rgba(0, 0, 0, 0.6)';
  const shadowCard = '0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)';
  const primaryColor = '#2196F3';
  const gradientStart = '#2196F3';
  const gradientEnd = '#64b5f6';

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
        backgroundColor: 'rgba(26, 26, 26, 0.95)',
        backdropFilter: 'blur(24px) saturate(180%)',
        borderBottom: `1px solid ${borderColor}`,
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        transition: 'all 0.3s ease'
      }}>
        <div style={{
          fontSize: '32px',
          fontWeight: '900',
          color: '#64b5f6',
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
              border: `1.5px solid ${borderColor}`,
              backgroundColor: '#1e1e1e',
              color: textColor,
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              outline: 'none',
              transition: 'all 0.2s ease',
              minWidth: '130px',
              boxShadow: 'none'
            }}
            onMouseEnter={(e) => {
              e.target.style.borderColor = primaryColor;
              e.target.style.boxShadow = `0 0 0 3px ${primaryColor}20`;
              e.target.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.target.style.borderColor = borderColor;
              e.target.style.boxShadow = 'none';
              e.target.style.transform = 'translateY(0)';
            }}
          >
            {Object.values(supportedLanguages).map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.flag} {lang.nativeName}
              </option>
            ))}
          </select>

          {/* Toggle de thème supprimé - thème sombre uniquement */}

          <button
            onClick={handleSkip}
            style={{
              padding: '8px 20px',
              backgroundColor: 'transparent',
              color: primaryColor,
              border: `1.5px solid ${primaryColor}`,
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'all 0.2s',
              boxShadow: 'none'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = `${primaryColor}15`;
              e.target.style.borderColor = primaryColor;
              e.target.style.transform = 'translateY(-1px)';
              e.target.style.boxShadow = 'none';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'transparent';
              e.target.style.borderColor = primaryColor;
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = 'none';
            }}
          >
            {t('nav.skip')}
          </button>

          <button
            onClick={() => navigate('/login')}
            style={{
              padding: '8px 20px',
              backgroundColor: 'transparent',
              color: primaryColor,
              border: `1.5px solid ${primaryColor}`,
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'all 0.2s',
              boxShadow: 'none'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = `${primaryColor}15`;
              e.target.style.borderColor = primaryColor;
              e.target.style.transform = 'translateY(-1px)';
              e.target.style.boxShadow = 'none';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'transparent';
              e.target.style.borderColor = primaryColor;
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = 'none';
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
              backgroundColor: '#2d2d2d',
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
              color: '#ffffff',
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
                background: `linear-gradient(135deg, ${primaryColor}15 0%, ${primaryColor}08 100%)`,
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
                  color: '#64b5f6', // Couleur visible au lieu de transparent
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
                boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
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
                    color: '#64b5f6', // Couleur visible au lieu de transparent
                    margin: 0,
                    textAlign: 'center'
                  }}>
                    {t('freeFeatures.title')}
                  </h3>
                  <span style={{ fontSize: '24px' }}>✨</span>
                </div>
                
                <p style={{
                  fontSize: '15px',
                  color: '#e0e0e0',
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
                        backgroundColor: '#252525',
                        borderRadius: '12px',
                        border: `1.5px solid ${borderColor}`,
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        cursor: 'default'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = primaryColor;
                        e.currentTarget.style.backgroundColor = '#2d2d2d';
                        e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)';
                        e.currentTarget.style.boxShadow = `0 6px 20px ${primaryColor}30`;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = borderColor;
                        e.currentTarget.style.backgroundColor = '#252525';
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
                        backgroundColor: '#1a1a1a',
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
                    e.target.style.backgroundColor = '#1976D2';
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
        backgroundColor: '#0f0f0f',
        borderTop: `1px solid ${borderColor}`,
        textAlign: 'center',
        boxShadow: 'none'
      }}>
        <p style={{
          fontSize: '14px',
          color: '#b0b0b0',
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
