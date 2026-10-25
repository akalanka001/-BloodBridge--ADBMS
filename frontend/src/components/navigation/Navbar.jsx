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
    <header className="site-header">
      <div className="container site-nav">
        <a
          className="brand"
          href="#home"
          aria-label="BloodBridge platform"
          onClick={(e) => {
            e.preventDefault();
            setOpen(false);
            navigate('home');
          }}
        >
          <span className="mark">
            <Heart size={22} fill="white" strokeWidth={0} />
          </span>
          <span>
            Blood<span>Bridge</span>
            <small>CONNECTING COMMUNITIES</small>
          </span>
        </a>

        {/* Desktop and Accessible Mobile Navigation */}
        <nav
          aria-label="Public navigation"
          className={open ? 'public-links open' : 'public-links'}
        >
          {navItems.map((item) => (
            <a
              key={item.id}
              href={'#' + item.id}
              className={page === item.id ? 'active' : ''}
              aria-current={page === item.id ? 'page' : undefined}
              onClick={(e) => {
                e.preventDefault();
                setOpen(false);
                navigate(item.id);
              }}
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* Action Buttons */}
        <div className="public-actions">
          {loggedIn ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span
                className="badge"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '6px 12px',
                  borderRadius: 99,
                  fontSize: 12,
                  fontWeight: 700,
                  background: '#f0f4f9',
                  color: 'var(--navy)',
                }}
              >
                <User size={13} />
                <span>{user?.fullName?.split(' ')[0] || user?.email?.split('@')[0]}</span>
                <span
                  style={{
                    fontSize: 9,
                    background: 'var(--red)',
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
                type="button"
                className="btn outline small"
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
                type="button"
                className="btn outline small"
                onClick={() => navigate('login')}
              >
                Sign in
              </button>
              <button
                type="button"
                className="btn primary small"
                aria-label="Register as a donor"
                onClick={() => navigate('signup')}
              >
                <span>Become a donor</span>
                <ArrowRight size={14} />
              </button>
            </div>
          )}

          <button
            type="button"
            className="btn iconbtn mobile-toggle"
            aria-label={open ? 'Close navigation' : 'Toggle mobile navigation'}
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footergrid">
          <div>
            <span className="brand" style={{ color: 'white' }}>
              <span className="mark">
                <Heart size={22} fill="white" strokeWidth={0} />
              </span>
              <span>
                Blood<span>Bridge</span>
                <small style={{ color: '#9ab0c3' }}>CONNECTING COMMUNITIES</small>
              </span>
            </span>
            <p>
              Connecting donors, hospitals, and blood banks through clearer, more accountable coordination.
            </p>
            <span className="tag">Academic project · No clinical deployment</span>
          </div>

          <div>
            <h4>Explore</h4>
            <a href="#home" aria-label="BloodBridge landing page" onClick={() => navigate('home')}>Home</a>
            <a href="#about" onClick={() => navigate('about')}>About BloodBridge</a>
            <a href="#camps" onClick={() => navigate('camps')}>Donation camps</a>
            <a href="#signup" onClick={() => navigate('signup')}>Become a donor</a>
          </div>

          <div>
            <h4>Access</h4>
            <a href="#login" onClick={() => navigate('login')}>Sign in</a>
            <a href="#accept-invite" onClick={() => navigate('accept-invite')}>Staff activation</a>
            <a href="#forgot-password" onClick={() => navigate('forgot-password')}>Reset password</a>
            <a href="#donor" onClick={() => navigate('donor')}>Dashboard previews</a>
          </div>
        </div>

        <div className="footerline">
          <span>© BloodBridge · University learning prototype</span>
          <span>For demonstration only. Not for clinical or emergency decisions.</span>
        </div>
      </div>
    </footer>
  );
}
