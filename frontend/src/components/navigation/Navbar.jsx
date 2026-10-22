import React, { useState } from 'react';
import { Heart, ArrowRight, Menu, X } from 'lucide-react';
import { PAGES, navigate } from '../../lib/navigation.js';

export function Navbar({ page, loggedIn, onLogout }) {
  const [open, setOpen] = useState(false);
  return (
    <header className="topbar">
      <div className="navbar wrap">
        <a className="brand" href="#home" onClick={() => setOpen(false)}>
          <span className="brand-mark">
            <Heart size={20} fill="white" />
          </span>
          <span>
            Blood<span className="brand-red">Bridge</span>
            <small>CONNECTING COMMUNITIES</small>
          </span>
        </a>
        <nav aria-label="Main navigation" className={open ? 'navigation opened' : 'navigation'}>
          {PAGES.map((item) => (
            <a
              key={item.id}
              href={'#' + item.id}
              className={page === item.id ? 'active' : ''}
              onClick={() => setOpen(false)}
            >
              {item.label}
            </a>
          ))}
        </nav>
        <div className="header-actions">
          {loggedIn ? (
            <button className="outline small" onClick={onLogout}>
              Log out
            </button>
          ) : (
            <button className="primary small" onClick={() => navigate('login')}>
              Sign in <ArrowRight size={16} />
            </button>
          )}
          <button
            className="menu-button"
            aria-label={open ? 'Close menu' : 'Open menu'}
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
