import React, { useState, useEffect } from 'react';
import { Heart, ArrowRight, Menu, X, User, LogOut } from 'lucide-react';
import { getNavItems, navigate } from '../../lib/navigation.js';

export function Navbar({ page, loggedIn, user, onLogout }) {
  const [open, setOpen] = useState(false);

  // Keyboard accessibility: ESC key closes mobile menu
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const navItems = getNavItems(user);

  const getRoleBadge = (role) => {
    switch (role) {
      case 'ADMIN':
        return 'Admin';
      case 'BANK_STAFF':
        return 'Blood Bank';
      case 'HOSPITAL_STAFF':
        return 'Hospital';
      case 'DONOR':
      default:
        return 'Donor';
    }
  };

  return (
    <header className="topbar">
      <div className="navbar wrap">
        <a
          className="brand"
          href="#home"
          onClick={() => {
            setOpen(false);
            navigate('home');
          }}
        >
          <span className="brand-mark">
            <Heart size={20} fill="white" />
          </span>
          <span>
            Blood<span className="brand-red">Bridge</span>
            <small>CONNECTING COMMUNITIES</small>
          </span>
        </a>

        {/* Desktop and Accessible Mobile Navigation */}
        <nav
          aria-label="Main navigation"
          className={open ? 'navigation opened' : 'navigation'}
        >
          {navItems.map((item) => (
            <a
              key={item.id}
              href={'#' + item.id}
              className={page === item.id ? 'active' : ''}
              onClick={() => {
                setOpen(false);
                navigate(item.id);
              }}
            >
              {item.label}
            </a>
          ))}

          {/* Mobile-only auth action when menu is open */}
          {open && (
            <div className="mobile-menu-auth" style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {loggedIn ? (
                <>
                  <div style={{ fontSize: 12, color: '#68778c', padding: '6px 12px' }}>
                    Signed in as <strong>{user?.fullName || user?.email}</strong> ({getRoleBadge(user?.role)})
                  </div>
                  <button
                    className="outline small"
                    onClick={() => {
                      setOpen(false);
                      onLogout();
                    }}
                    style={{ minHeight: 44, width: '100%' }}
                  >
                    <LogOut size={16} /> Log out
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="primary small"
                    onClick={() => {
                      setOpen(false);
                      navigate('login');
                    }}
                    style={{ minHeight: 44, width: '100%' }}
                  >
                    Sign in <ArrowRight size={16} />
                  </button>
                  <button
                    className="outline small"
                    onClick={() => {
                      setOpen(false);
                      navigate('signup');
                    }}
                    style={{ minHeight: 44, width: '100%' }}
                  >
                    Register as Donor
                  </button>
                </>
              )}
            </div>
          )}
        </nav>

        {/* Desktop Actions */}
        <div className="header-actions">
          {loggedIn ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span
                className="badge"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '5px 10px',
                  borderRadius: 99,
                  fontSize: 11,
                  fontWeight: 700,
                  background: '#f0f4f9',
                  color: '#14243a',
                }}
              >
                <User size={12} />
                {user?.fullName?.split(' ')[0] || user?.email?.split('@')[0]}
                <span
                  style={{
                    fontSize: 9,
                    background: '#c9263e',
                    color: '#fff',
                    padding: '2px 6px',
                    borderRadius: 99,
                    marginLeft: 3,
                  }}
                >
                  {getRoleBadge(user?.role)}
                </span>
              </span>
              <button
                className="outline small"
                onClick={onLogout}
                title="Sign out of account"
              >
                <LogOut size={15} />
                <span>Log out</span>
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                className="outline small"
                onClick={() => navigate('signup')}
              >
                Register
              </button>
              <button
                className="primary small"
                onClick={() => navigate('login')}
              >
                Sign in <ArrowRight size={16} />
              </button>
            </div>
          )}

          <button
            className="menu-button"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X size={23} /> : <Menu size={23} />}
          </button>
        </div>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="wrap footer-inside">
        <span>
          <Heart size={16} fill="#C9263E" /> BloodBridge · Academic prototype
        </span>
        <span>Built for learning · Not for clinical use or live emergency decisions</span>
      </div>
    </footer>
  );
}
