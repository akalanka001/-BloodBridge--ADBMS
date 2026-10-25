import React, { useEffect, useState } from 'react';
import { Navbar, Footer } from '../components/navigation/Navbar.jsx';
import { Home } from '../features/public/Home.jsx';
import { CampsPage } from '../features/camps/CampsPage.jsx';
import {
  RegisterPage,
  LoginPage,
  ForgotPasswordPage,
  ResetPasswordPage,
  VerifyEmailPage,
  AcceptInvitePage,
} from '../features/auth/AuthPages.jsx';
import { Portal } from '../features/portal/Portal.jsx';
import { api } from '../lib/api.js';
import { authStorage, authApi } from '../lib/authApi.js';
import { startingPage, navigate, checkRouteAccess, ROLE_PAGES } from '../lib/navigation.js';
import { getSocket, disconnectSocket } from '../socket.js';

export default function App() {
  const [page, setPage] = useState(startingPage());
  const [session, setSession] = useState(() => authStorage.get());
  const [districts, setDistricts] = useState([]);
  const [district, setDistrict] = useState('');
  const [camps, setCamps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [authNotice, setAuthNotice] = useState('');

  // Hash-based navigation listener with route guard protection
  useEffect(() => {
    const handleRoute = () => {
      const target = startingPage();
      const currentSession = authStorage.get();
      setSession(currentSession);
      const access = checkRouteAccess(target, currentSession?.user);

      if (!access.allowed) {
        setAuthNotice(access.reason || 'Authentication required');
        navigate(access.redirect);
        setPage(access.redirect);
        return;
      }

      setPage(target);
    };

    const handleAuthExpired = () => {
      setSession(null);
      setAuthNotice('Your session has expired. Please log in again.');
      navigate('home');
      setPage('home');
    };

    window.addEventListener('hashchange', handleRoute);
    window.addEventListener('auth:expired', handleAuthExpired);
    handleRoute();

    return () => {
      window.removeEventListener('hashchange', handleRoute);
      window.removeEventListener('auth:expired', handleAuthExpired);
    };
  }, []);

  // Fetch districts for camp search filter
  useEffect(() => {
    api('/locations/districts')
      .then((r) => setDistricts(r.data))
      .catch((e) => setError('Location service unavailable: ' + e.message));
  }, []);

  // Fetch camps (reacts to district selection)
  useEffect(() => {
    setLoading(true);
    setError('');
    api('/camps' + (district ? '?districtCode=' + encodeURIComponent(district) : ''))
      .then((r) => setCamps(r.data))
      .catch((e) => setError('Camp service unavailable: ' + e.message))
      .finally(() => setLoading(false));
  }, [district]);

  // Real-time Socket.io integration with user session
  useEffect(() => {
    if (session?.token) {
      const socket = getSocket(session.token);
      socket.on('camp:capacity_update', (data) => {
        setCamps((prev) =>
          prev.map((c) =>
            (c.camp_id === data.campId || c.id === data.campId)
              ? {
                  ...c,
                  registered_count: data.registeredCount,
                  registered_donors: data.registeredCount,
                  capacity: data.maxCapacity || c.capacity,
                  target_donors: data.maxCapacity || c.target_donors,
                }
              : c,
          ),
        );
      });
      return () => {
        socket.disconnect();
      };
    }
  }, [session?.token]);

  const login = (r) => {
    const s = { token: r.token, refreshToken: r.refreshToken, user: r.user };
    authStorage.set(s);
    setSession(s);
    setAuthNotice('');

    const targetRoute = ROLE_PAGES[r.user.role]?.id || 'home';
    navigate(targetRoute);
  };

  const logout = async () => {
    await authApi.logout();
    setSession(null);
    disconnectSocket();
    navigate('home');
  };

  const isPortal = ['donor', 'hospital', 'bank', 'admin'].includes(page);

  if (isPortal) {
    return (
      <Portal
        type={page}
        session={session}
        token={session?.token}
        onLogout={logout}
      />
    );
  }

  return (
    <>
      <Navbar
        page={page}
        loggedIn={Boolean(session)}
        user={session?.user}
        onLogout={logout}
      />

      <main className="wrap main">
        {authNotice && (
          <div className="notice error" style={{ marginBottom: 20 }}>
            <span>{authNotice}</span>
            <button
              type="button"
              className="text-link"
              onClick={() => setAuthNotice('')}
              style={{ marginLeft: 'auto' }}
            >
              Dismiss
            </button>
          </div>
        )}

        {page === 'home' && <Home camps={camps} />}

        {page === 'camps' && (
          <CampsPage
            camps={camps}
            district={district}
            setDistrict={setDistrict}
            districts={districts}
            loading={loading}
            error={error}
          />
        )}

        {page === 'signup' && <RegisterPage districts={districts} onDone={() => navigate('login')} />}
        {page === 'login' && <LoginPage onLogin={login} />}
        {page === 'forgot-password' && <ForgotPasswordPage />}
        {page === 'reset-password' && <ResetPasswordPage />}
        {page === 'verify-email' && <VerifyEmailPage />}
        {page === 'accept-invite' && <AcceptInvitePage />}
      </main>

      <Footer />
    </>
  );
}
