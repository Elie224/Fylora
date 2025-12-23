/**
 * Composant Skeleton Loader pour feedback visuel immédiat
 */
import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

export function FileListSkeleton({ count = 5 }) {
  const { theme } = useTheme();
  const bgColor = theme === 'dark' ? '#2d2d2d' : '#f0f0f0';
  const highlightColor = theme === 'dark' ? '#3d3d3d' : '#e0e0e0';

  return (
    <div style={{ padding: '20px' }}>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '16px',
            marginBottom: '8px',
            backgroundColor: bgColor,
            borderRadius: '8px',
            animation: 'pulse 1.5s ease-in-out infinite',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              backgroundColor: highlightColor,
              marginRight: '16px',
            }}
          />
          <div style={{ flex: 1 }}>
            <div
              style={{
                height: '16px',
                width: '60%',
                backgroundColor: highlightColor,
                borderRadius: '4px',
                marginBottom: '8px',
              }}
            />
            <div
              style={{
                height: '12px',
                width: '40%',
                backgroundColor: highlightColor,
                borderRadius: '4px',
              }}
            />
          </div>
        </div>
      ))}
      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.6;
          }
        }
      `}</style>
    </div>
  );
}

export function CardSkeleton({ count = 3 }) {
  const { theme } = useTheme();
  const bgColor = theme === 'dark' ? '#2d2d2d' : '#ffffff';
  const highlightColor = theme === 'dark' ? '#3d3d3d' : '#f0f0f0';

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', padding: '20px' }}>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          style={{
            backgroundColor: bgColor,
            borderRadius: '8px',
            padding: '16px',
            boxShadow: theme === 'dark' ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.1)',
            animation: 'pulse 1.5s ease-in-out infinite',
          }}
        >
          <div
            style={{
              width: '100%',
              height: '120px',
              backgroundColor: highlightColor,
              borderRadius: '4px',
              marginBottom: '12px',
            }}
          />
          <div
            style={{
              height: '16px',
              width: '80%',
              backgroundColor: highlightColor,
              borderRadius: '4px',
              marginBottom: '8px',
            }}
          />
          <div
            style={{
              height: '12px',
              width: '60%',
              backgroundColor: highlightColor,
              borderRadius: '4px',
            }}
          />
        </div>
      ))}
      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.6;
          }
        }
      `}</style>
    </div>
  );
}

export function DashboardSkeleton() {
  const { theme } = useTheme();
  const bgColor = theme === 'dark' ? '#2d2d2d' : '#ffffff';
  const highlightColor = theme === 'dark' ? '#3d3d3d' : '#f0f0f0';

  return (
    <div style={{ padding: '20px' }}>
      {/* Stats cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            style={{
              backgroundColor: bgColor,
              borderRadius: '8px',
              padding: '20px',
              boxShadow: theme === 'dark' ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.1)',
              animation: 'pulse 1.5s ease-in-out infinite',
            }}
          >
            <div
              style={{
                height: '20px',
                width: '60%',
                backgroundColor: highlightColor,
                borderRadius: '4px',
                marginBottom: '12px',
              }}
            />
            <div
              style={{
                height: '32px',
                width: '80%',
                backgroundColor: highlightColor,
                borderRadius: '4px',
              }}
            />
          </div>
        ))}
      </div>

      {/* Recent files */}
      <FileListSkeleton count={5} />
      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.6;
          }
        }
      `}</style>
    </div>
  );
}


