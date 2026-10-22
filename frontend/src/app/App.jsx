import React, { useEffect, useState } from 'react';
import { Navbar, Footer } from '../components/navigation/Navbar.jsx';
import { Home } from '../features/public/Home.jsx';
import { CampsPage } from '../features/camps/CampsPage.jsx';
import { RegisterPage, LoginPage } from '../features/auth/AuthPages.jsx';
import { Portal } from '../features/portal/Portal.jsx';
import { api } from '../lib/api.js';
import { startingPage, navigate } from '../lib/navigation.js';
import { getSocket, disconnectSocket } from '../socket.js';

export default function App() {
  const [page, setPage] = useState(startingPage());
  const [session, setSession] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem('bb_session') || 'null');
    } catch {
      return null;
    }
  });
  const [districts, setDistricts] = useState([]);
  const [district, setDistrict] = useState('');
  const [camps, setCamps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Hash-based navigation listener
  useEffect(() => {
    const update = () => setPage(startingPage());
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);

  // Fetch districts
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
    const s = { token: r.token, user: r.user };
    sessionStorage.setItem('bb_session', JSON.stringify(s));
    setSession(s);
    navigate(
      {
        DONOR: 'donor',
        HOSPITAL_STAFF: 'hospital',
        BANK_STAFF: 'bank',
        ADMIN: 'admin',
      }[r.user.role] || 'home',
    );
  };

  const logout = () => {
    sessionStorage.removeItem('bb_session');
    setSession(null);
    disconnectSocket();
    navigate('home');
  };

  return (
    <>
      <Navbar page={page} loggedIn={Boolean(session)} onLogout={logout} />
      <main className="wrap main">
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
        {['donor', 'hospital', 'bank', 'admin'].includes(page) && (
          <Portal type={page} session={session} token={session?.token} />
        )}
        {page === 'signup' && <RegisterPage districts={districts} onDone={() => {}} />}
        {page === 'login' && <LoginPage onLogin={login} />}
      </main>
      <Footer />
    </>
  );
}
