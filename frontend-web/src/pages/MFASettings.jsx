/**
 * Page de Configuration MFA (Multi-Factor Authentication)
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuthStore } from '../services/authStore';
import apiClient from '../services/api';

const MFASettings = () => {
  const { t } = useLanguage();
  const { user, accessToken } = useAuthStore();
  const navigate = useNavigate();

  const [mfaStatus, setMfaStatus] = useState(null);
  const [setupStep, setSetupStep] = useState('status'); // 'status', 'setup', 'verify', 'disable'
  const [qrCode, setQrCode] = useState(null);
  const [secret, setSecret] = useState(null);
  const [verificationToken, setVerificationToken] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    loadMFAStatus();
  }, []);

  const loadMFAStatus = async () => {
    try {
      const response = await apiClient.get('/mfa/status');
      setMfaStatus(response.data.data || response.data);
    } catch (err) {
      console.error('Error loading MFA status:', err);
    }
  };

  const handleSetup = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.post('/mfa/setup');
      const data = response.data.data || response.data;
      setQrCode(data.qrCode || data.qr_code);
      setSecret(data.manualEntryKey || data.manual_entry_key || data.secret);
      setSetupStep('verify');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Erreur lors de la configuration MFA');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!verificationToken || verificationToken.length !== 6) {
      setError('Veuillez entrer un code à 6 chiffres');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.post('/mfa/verify', { token: verificationToken });
      const data = response.data.data || response.data;
      setBackupCodes(data.backupCodes || data.backup_codes || []);
      setSuccess('MFA activé avec succès ! Sauvegardez vos codes de backup.');
      setSetupStep('backup');
      await loadMFAStatus();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Code invalide');
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    if (!password) {
      setError('Veuillez entrer votre mot de passe');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await apiClient.post('/mfa/disable', { password });
      setSuccess('MFA désactivé avec succès');
      setSetupStep('status');
      await loadMFAStatus();
      setPassword('');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Erreur lors de la désactivation');
    } finally {
      setLoading(false);
    }
  };

  const bgColor = '#1a1a1a';
  const cardBg = '#2a2a2a';
  const textColor = '#ffffff';
  const borderColor = '#3a3a3a';
  const primaryColor = '#2196F3';

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: bgColor,
      color: textColor,
      padding: '40px 20px',
    }}>
      <div style={{
        maxWidth: 800,
        margin: '0 auto',
      }}>
        <h1 style={{
          fontSize: '2.5em',
          marginBottom: '30px',
          textAlign: 'center',
        }}>
          🔐 Authentification à Deux Facteurs (MFA)
        </h1>

        {error && (
          <div style={{
            backgroundColor: '#d32f2f',
            color: 'white',
            padding: '15px',
            borderRadius: '8px',
            marginBottom: '20px',
          }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{
            backgroundColor: '#2e7d32',
            color: 'white',
            padding: '15px',
            borderRadius: '8px',
            marginBottom: '20px',
          }}>
            {success}
          </div>
        )}

        {setupStep === 'status' && mfaStatus && (
          <div style={{
            backgroundColor: cardBg,
            padding: '30px',
            borderRadius: '12px',
            border: `1px solid ${borderColor}`,
          }}>
            <h2 style={{ marginBottom: '20px' }}>Statut MFA</h2>
            <div style={{ marginBottom: '20px' }}>
              <p><strong>MFA activé :</strong> {mfaStatus.enabled ? '✅ Oui' : '❌ Non'}</p>
              <p><strong>Type :</strong> {mfaStatus.type || 'Aucun'}</p>
              <p><strong>Codes de backup :</strong> {mfaStatus.hasBackupCodes ? '✅ Disponibles' : '❌ Aucun'}</p>
            </div>

            {!mfaStatus.enabled ? (
              <button
                onClick={() => setSetupStep('setup')}
                style={{
                  padding: '12px 24px',
                  backgroundColor: primaryColor,
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '1em',
                  fontWeight: '600',
                }}
              >
                Activer MFA
              </button>
            ) : (
              <button
                onClick={() => setSetupStep('disable')}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#d32f2f',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '1em',
                  fontWeight: '600',
                }}
              >
                Désactiver MFA
              </button>
            )}
          </div>
        )}

        {setupStep === 'setup' && (
          <div style={{
            backgroundColor: cardBg,
            padding: '30px',
            borderRadius: '12px',
            border: `1px solid ${borderColor}`,
          }}>
            <h2 style={{ marginBottom: '20px' }}>Configuration MFA</h2>
            <p style={{ marginBottom: '20px' }}>
              Scannez le QR code avec votre application d'authentification (Google Authenticator, Authy, etc.)
            </p>
            <button
              onClick={handleSetup}
              disabled={loading}
              style={{
                padding: '12px 24px',
                backgroundColor: primaryColor,
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '1em',
                fontWeight: '600',
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? 'Génération...' : 'Générer QR Code'}
            </button>
          </div>
        )}

        {setupStep === 'verify' && qrCode && (
          <div style={{
            backgroundColor: cardBg,
            padding: '30px',
            borderRadius: '12px',
            border: `1px solid ${borderColor}`,
          }}>
            <h2 style={{ marginBottom: '20px' }}>Scanner le QR Code</h2>
            <div style={{
              textAlign: 'center',
              marginBottom: '20px',
            }}>
              <img src={qrCode} alt="QR Code MFA" style={{
                maxWidth: '300px',
                backgroundColor: 'white',
                padding: '20px',
                borderRadius: '8px',
              }} />
            </div>
            <p style={{ marginBottom: '10px' }}>Ou entrez manuellement :</p>
            <code style={{
              display: 'block',
              padding: '10px',
              backgroundColor: '#1a1a1a',
              borderRadius: '4px',
              marginBottom: '20px',
              wordBreak: 'break-all',
            }}>
              {secret}
            </code>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '10px' }}>
                Code de vérification (6 chiffres)
              </label>
              <input
                type="text"
                value={verificationToken}
                onChange={(e) => setVerificationToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: '#1a1a1a',
                  color: textColor,
                  border: `1px solid ${borderColor}`,
                  borderRadius: '8px',
                  fontSize: '1.5em',
                  textAlign: 'center',
                  letterSpacing: '0.5em',
                }}
              />
            </div>
            <button
              onClick={handleVerify}
              disabled={loading || verificationToken.length !== 6}
              style={{
                width: '100%',
                padding: '12px 24px',
                backgroundColor: primaryColor,
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: loading || verificationToken.length !== 6 ? 'not-allowed' : 'pointer',
                fontSize: '1em',
                fontWeight: '600',
                opacity: loading || verificationToken.length !== 6 ? 0.6 : 1,
              }}
            >
              {loading ? 'Vérification...' : 'Vérifier et Activer'}
            </button>
          </div>
        )}

        {setupStep === 'backup' && backupCodes.length > 0 && (
          <div style={{
            backgroundColor: cardBg,
            padding: '30px',
            borderRadius: '12px',
            border: `1px solid ${borderColor}`,
          }}>
            <h2 style={{ marginBottom: '20px', color: '#ff9800' }}>⚠️ Codes de Backup</h2>
            <p style={{ marginBottom: '20px' }}>
              <strong>IMPORTANT :</strong> Sauvegardez ces codes dans un endroit sûr. Vous en aurez besoin si vous perdez l'accès à votre application d'authentification.
            </p>
            <div style={{
              backgroundColor: '#1a1a1a',
              padding: '20px',
              borderRadius: '8px',
              marginBottom: '20px',
            }}>
              {backupCodes.map((code, index) => (
                <div key={index} style={{
                  padding: '10px',
                  fontFamily: 'monospace',
                  fontSize: '1.2em',
                  textAlign: 'center',
                  borderBottom: index < backupCodes.length - 1 ? `1px solid ${borderColor}` : 'none',
                }}>
                  {code}
                </div>
              ))}
            </div>
            <button
              onClick={() => {
                setSetupStep('status');
                setBackupCodes([]);
              }}
              style={{
                width: '100%',
                padding: '12px 24px',
                backgroundColor: primaryColor,
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '1em',
                fontWeight: '600',
              }}
            >
              J'ai sauvegardé les codes
            </button>
          </div>
        )}

        {setupStep === 'disable' && (
          <div style={{
            backgroundColor: cardBg,
            padding: '30px',
            borderRadius: '12px',
            border: `1px solid ${borderColor}`,
          }}>
            <h2 style={{ marginBottom: '20px' }}>Désactiver MFA</h2>
            <p style={{ marginBottom: '20px', color: '#ff9800' }}>
              ⚠️ Pour des raisons de sécurité, vous devez entrer votre mot de passe pour désactiver MFA.
            </p>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '10px' }}>
                Mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: '#1a1a1a',
                  color: textColor,
                  border: `1px solid ${borderColor}`,
                  borderRadius: '8px',
                }}
              />
            </div>
            <button
              onClick={handleDisable}
              disabled={loading || !password}
              style={{
                width: '100%',
                padding: '12px 24px',
                backgroundColor: '#d32f2f',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: loading || !password ? 'not-allowed' : 'pointer',
                fontSize: '1em',
                fontWeight: '600',
                opacity: loading || !password ? 0.6 : 1,
              }}
            >
              {loading ? 'Désactivation...' : 'Désactiver MFA'}
            </button>
          </div>
        )}

        <div style={{ marginTop: '30px', textAlign: 'center' }}>
          <button
            onClick={() => navigate('/settings')}
            style={{
              padding: '10px 20px',
              backgroundColor: 'transparent',
              color: textColor,
              border: `1px solid ${borderColor}`,
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            ← Retour aux paramètres
          </button>
        </div>
      </div>
    </div>
  );
};

export default MFASettings;

