import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../services/authStore';

export default function ProtectedRoute({ children }) {
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const initialize = useAuthStore((s) => s.initialize);
  const [isChecking, setIsChecking] = useState(true);

  // Vérifier l'authentification au montage
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('access_token');
      const refreshToken = localStorage.getItem('refresh_token');
      
      // Toujours initialiser si on a des tokens (même si user existe, pour vérifier la validité)
      if (token || refreshToken) {
        try {
          await initialize();
        } catch (err) {
          console.error('Auth initialization failed:', err);
        }
      }
      
      setIsChecking(false);
    };
    
    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Afficher un loader pendant la vérification
  if (isChecking) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh'
      }}>
        <div>Vérification de l'authentification...</div>
      </div>
    );
  }

  if (!user || !accessToken) {
    return <Navigate to="/login" replace />;
  }

  return children;
}








