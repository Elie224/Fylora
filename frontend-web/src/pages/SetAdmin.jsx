import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../services/authStore';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../components/Toast';

export default function SetAdmin() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { theme } = useTheme();
  const { showToast, ToastContainer } = useToast();
  const [email, setEmail] = useState('kouroumaelisee@gmail.com');
  const [loading, setLoading] = useState(false);

  const cardBg = theme === 'dark' ? '#1e1e1e' : '#ffffff';
  const textColor = theme === 'dark' ? '#e0e0e0' : '#1a202c';
  const borderColor = theme === 'dark' ? '#333333' : '#e2e8f0';
  const textSecondary = theme === 'dark' ? '#b0b0b0' : '#64748b';
  const bgColor = theme === 'dark' ? '#121212' : '#f8fafc';

  const handleSetAdmin = async (e) => {
    e.preventDefault();
    
    if (!email || !email.trim()) {
      showToast('Veuillez entrer un email', 'error');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
      
      const response = await fetch(`${API_URL}/api/admin/set-admin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ email: email.trim() })
      });

      const data = await response.json();

      if (response.ok && data.data) {
        showToast(data.data.message, 'success');
        // Recharger les données utilisateur
        if (user) {
          window.location.reload();
        } else {
          setTimeout(() => {
            navigate('/dashboard');
          }, 2000);
        }
      } else {
        showToast(data.error?.message || 'Erreur lors de la configuration', 'error');
      }
    } catch (err) {
      console.error('Erreur:', err);
      showToast('Erreur de connexion au serveur', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      padding: '40px 24px',
      backgroundColor: bgColor,
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        maxWidth: '500px',
        width: '100%',
        padding: '32px',
        backgroundColor: cardBg,
        borderRadius: '12px',
        border: `1px solid ${borderColor}`,
        boxShadow: theme === 'dark' ? '0 4px 12px rgba(0,0,0,0.5)' : '0 4px 12px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{
          margin: '0 0 8px 0',
          fontSize: '24px',
          fontWeight: '700',
          color: textColor
        }}>
          🔐 Configuration Administrateur
        </h1>
        
        <p style={{
          margin: '0 0 24px 0',
          fontSize: '14px',
          color: textSecondary
        }}>
          Définir un utilisateur comme administrateur. Cette page est temporaire et doit être supprimée après utilisation.
        </p>

        <form onSubmit={handleSetAdmin}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: '600',
              color: textColor
            }}>
              Email de l'utilisateur
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              required
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '14px',
                backgroundColor: theme === 'dark' ? '#2d2d2d' : '#f5f5f5',
                color: textColor,
                border: `1px solid ${borderColor}`,
                borderRadius: '8px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px 24px',
              backgroundColor: loading ? '#999' : '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.target.style.backgroundColor = '#1976D2';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.target.style.backgroundColor = '#2196F3';
              }
            }}
          >
            {loading ? '⏳ Configuration en cours...' : '✅ Définir comme Administrateur'}
          </button>
        </form>

        {user?.is_admin && (
          <div style={{
            marginTop: '20px',
            padding: '12px',
            backgroundColor: theme === 'dark' ? '#1f3d1f' : '#e8f5e9',
            borderRadius: '8px',
            border: `1px solid ${theme === 'dark' ? '#4caf50' : '#4caf50'}`,
            color: theme === 'dark' ? '#81c784' : '#2e7d32'
          }}>
            ✅ Vous êtes déjà administrateur
          </div>
        )}

        <div style={{
          marginTop: '24px',
          padding: '12px',
          backgroundColor: theme === 'dark' ? '#2d1f0f' : '#fff3e0',
          borderRadius: '8px',
          border: `1px solid ${theme === 'dark' ? '#ff9800' : '#ff9800'}`,
          fontSize: '12px',
          color: textSecondary
        }}>
          ⚠️ <strong>Important :</strong> Cette page doit être supprimée après avoir défini l'administrateur pour des raisons de sécurité.
        </div>
      </div>

      <ToastContainer />
    </div>
  );
}

