import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import api from '../services/api';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/Toast';

const SecurityCenter = () => {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();
  const [loginHistory, setLoginHistory] = useState([]);
  const [activeSessions, setActiveSessions] = useState([]);
  const [securityStats, setSecurityStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [historyRes, sessionsRes, statsRes] = await Promise.all([
        api.get('/security/login-history'),
        api.get('/security/sessions'),
        api.get('/security/stats'),
      ]);

      setLoginHistory(historyRes.data.data || historyRes.data || []);
      setActiveSessions(sessionsRes.data.data || sessionsRes.data || []);
      setSecurityStats(statsRes.data.data || statsRes.data || null);
    } catch (err) {
      console.error('Failed to load security data:', err);
      setError(err.response?.data?.error?.message || t('errorLoadingData'));
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeSession = async (sessionId) => {
    const confirmed = await confirm(t('confirmRevokeSession'));
    if (!confirmed) {
      return;
    }

    try {
      await api.delete(`/security/sessions/${sessionId}`);
      await loadData();
      showToast(t('sessionRevoked'), 'success');
    } catch (err) {
      console.error('Failed to revoke session:', err);
      showToast(err.response?.data?.error?.message || t('errorRevokingSession'), 'error');
    }
  };

  const handleRevokeAllOtherSessions = async () => {
    const confirmed = await confirm(t('confirmRevokeAllSessions'));
    if (!confirmed) {
      return;
    }

    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        showToast(t('errorRevokingSessions'), 'error');
        return;
      }
      
      // Envoyer le refresh_token dans le body de la requête DELETE
      await api.delete('/security/sessions', { data: { refresh_token: refreshToken } });
      await loadData();
      showToast(t('allOtherSessionsRevoked'), 'success');
    } catch (err) {
      console.error('Failed to revoke sessions:', err);
      showToast(err.response?.data?.error?.message || t('errorRevokingSessions'), 'error');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString();
  };

  const getLocationDisplay = (location) => {
    return location || t('unknown');
  };

  if (loading) {
    return (
      <>
        <ConfirmDialog />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <p>{t('loading')}...</p>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <ConfirmDialog />
        <div className="container mx-auto px-4 py-8">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <p>{error}</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">{t('securityCenter')}</h1>

      {/* Statistiques */}
      {securityStats && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">{t('securityStatistics')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600">{t('totalLogins')}</p>
              <p className="text-2xl font-bold">{securityStats.totalLogins}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">{t('successfulLogins')}</p>
              <p className="text-2xl font-bold text-green-600">{securityStats.successfulLogins}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">{t('failedLogins')}</p>
              <p className="text-2xl font-bold text-red-600">{securityStats.failedLogins}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">{t('activeSessions')}</p>
              <p className="text-2xl font-bold">{securityStats.activeSessions}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">{t('uniqueIPs')}</p>
              <p className="text-2xl font-bold">{securityStats.uniqueIPs}</p>
            </div>
            {securityStats.lastLogin && (
              <div>
                <p className="text-sm text-gray-600">{t('lastLogin')}</p>
                <p className="text-sm">{formatDate(securityStats.lastLogin.date)}</p>
                <p className="text-xs text-gray-500">{securityStats.lastLogin.ip}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sessions actives */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">{t('activeSessions')}</h2>
          {activeSessions.length > 1 && (
            <button
              onClick={handleRevokeAllOtherSessions}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
            >
              {t('revokeAllOtherSessions')}
            </button>
          )}
        </div>
        {activeSessions.length === 0 ? (
          <p className="text-gray-500">{t('noActiveSessions')}</p>
        ) : (
          <div className="space-y-4">
            {activeSessions.map((session) => (
              <div
                key={session._id || session.id}
                className="border rounded-lg p-4 flex justify-between items-center"
              >
                <div>
                  <p className="font-semibold">{getLocationDisplay(session.location)}</p>
                  <p className="text-sm text-gray-600">{session.ip_address}</p>
                  <p className="text-xs text-gray-500">{session.user_agent}</p>
                  <p className="text-xs text-gray-400">
                    {t('lastActivity')}: {formatDate(session.last_activity)}
                  </p>
                </div>
                <button
                  onClick={() => handleRevokeSession(session._id || session.id)}
                  className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
                >
                  {t('revoke')}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Historique des connexions */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">{t('loginHistory')}</h2>
        {loginHistory.length === 0 ? (
          <p className="text-gray-500">{t('noLoginHistory')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {t('date')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {t('ipAddress')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {t('location')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {t('status')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loginHistory.map((entry) => (
                  <tr key={entry._id || entry.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {formatDate(entry.created_at || entry.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {entry.ip_address || entry.ip || 'Inconnu'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {getLocationDisplay(entry.location)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs rounded ${
                          entry.success !== false
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {entry.success !== false ? t('success') : t('failed')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default SecurityCenter;

