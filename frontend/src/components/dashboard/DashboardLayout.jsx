import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Heart, LayoutDashboard, CalendarClock, MapPin, Bell, FileText, Users, Building2, TrendingUp, Menu, X, Droplets, UserRound, Settings, ArrowLeft, ChevronDown, LogOut } from 'lucide-react';
import { navigate } from '../../lib/navigation.js';
import { PORTAL_NAV, getPrimaryTab } from '../../lib/portalNavigation.js';
import { api } from '../../lib/api.js';
import { authStorage } from '../../lib/authStorage.js';
import { useFocusTrap } from '../../hooks/useFocusTrap.js';
import { NotificationDrawer } from './NotificationDrawer.jsx';

const icons = { overview: LayoutDashboard, donations: Heart, calendar: CalendarClock, camps: MapPin, account: UserRound, requests: FileText, people: Users, institutions: Building2, reports: TrendingUp, inventory: Droplets, system: Settings };

export function DashboardLayout({ role = 'DONOR', user, activeTab = 'overview', onTabChange = () => {}, onLogout = () => {}, headerTitle = '', headerSubtitle = '', headerAction, children }) {
  const config = PORTAL_NAV[role] || PORTAL_NAV.DONOR;
  const primary = getPrimaryTab(role, activeTab);
  const [mobile, setMobile] = useState(() => window.matchMedia?.('(max-width: 980px)')?.matches || false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [unread, setUnread] = useState(null);
  const sidebar = useRef(null);
  const account = useRef(null);
  const closeSidebar = useCallback(() => setMobileMenuOpen(false), []);
  const closeInbox = useCallback(() => setInboxOpen(false), []);
  useFocusTrap(mobile && mobileMenuOpen, sidebar, closeSidebar);
  useEffect(() => {
    const media = window.matchMedia?.('(max-width: 980px)');
    if (!media) return;
    const update = () => { setMobile(media.matches); if (!media.matches) setMobileMenuOpen(false); };
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    const close = event => { if (event.key === 'Escape' || (event.type === 'pointerdown' && !account.current?.contains(event.target))) setAccountOpen(false); };
    document.addEventListener('keydown', close); document.addEventListener('pointerdown', close);
    return () => { document.removeEventListener('keydown', close); document.removeEventListener('pointerdown', close); };
  }, []);
  useEffect(() => {
    let cancelled = false;
    api('/notifications/me?limit=1').then(result => { if (!cancelled) setUnread(result.data.unreadCount); }).catch(() => { if (!cancelled) setUnread(null); });
    return () => { cancelled = true; };
  }, [user?.id]);
  const go = tab => { onTabChange(tab); setMobileMenuOpen(false); setAccountOpen(false); };
  const name = user?.fullName || user?.full_name || 'Account';
  const initials = name.split(/\s+/).slice(0, 2).map(part => part[0]).join('');

  return <div className="portal dash-container bb-shell">
    <a className="bb-skip-link" href="#portal-content">Skip to content</a>
    {mobile && mobileMenuOpen && <div className="bb-sidebar-shade" aria-hidden="true" onClick={closeSidebar} />}
    <aside id="portal-navigation" ref={sidebar} className={`portal-sidebar dash-sidebar ${mobileMenuOpen ? 'open' : ''}`} aria-label="Portal sidebar" {...(mobile && !mobileMenuOpen ? { inert: '' } : {})}>
      <div className="sidebar-top dash-sidebar-header">
        <a href={`#${config.page}`} className="brand" onClick={event => { event.preventDefault(); go('overview'); }}>
          <span className="mark"><Heart size={19} fill="currentColor" /></span>
          <span>Blood<span className="bb-brand-accent">Bridge</span><small>CONNECTING COMMUNITIES</small></span>
        </a>
        {mobile && <button type="button" className="bb-icon-button" aria-label="Close navigation" onClick={closeSidebar}><X size={20} /></button>}
      </div>
      <div className="dash-role-tag">{config.title}</div>
      <nav className="sidebar-scroll dash-nav" aria-label={`${config.title} navigation`}>
        {config.menu.map(([id, label, icon]) => { const Icon = icons[icon]; return <button key={id} type="button" className={`side-item dash-nav-btn ${primary === id ? 'active' : ''}`} aria-current={primary === id ? 'page' : undefined} onClick={() => go(id)}><Icon size={17} /><span>{label}</span></button>; })}
      </nav>
      <div className="side-bottom"><button type="button" onClick={() => navigate('home')}><ArrowLeft size={16} />Public website</button><small>University prototype</small></div>
    </aside>
    <div className="portal-area dash-main-area">
      <header className="portal-topbar dash-topbar">
        <div className="bb-workspace-heading">
          {mobile && <button type="button" className="bb-icon-button" aria-label="Toggle navigation" aria-expanded={mobileMenuOpen} aria-controls="portal-navigation" onClick={() => setMobileMenuOpen(value => !value)}><Menu size={21} /></button>}
          <div><span className="bb-breadcrumb">BloodBridge / {config.title}</span><strong>{config.menu.find(([id]) => id === primary)?.[1] || (activeTab === 'notifications' ? 'Donation invitations' : 'My account')}</strong></div>
        </div>
        <div className="bb-topbar-actions">
          <button type="button" className="bb-icon-button bb-notification-button" aria-label={`Notifications${unread != null ? `, ${unread} unread` : ''}`} onClick={() => setInboxOpen(true)}><Bell size={19} />{unread > 0 && <span className="bb-unread-dot">{unread > 99 ? '99+' : unread}</span>}</button>
          <div ref={account} className="bb-account-menu">
            <button type="button" className="bb-account-trigger" aria-expanded={accountOpen} aria-controls="account-actions" onClick={() => setAccountOpen(value => !value)}><span className="bb-avatar">{initials}</span><span className="bb-account-name">{name}<small>{config.title}</small></span><ChevronDown size={15} /></button>
            {accountOpen && <div id="account-actions" className="bb-account-popover"><strong>{name}</strong><button type="button" onClick={() => go('account')}><UserRound size={16} />My Account</button><button type="button" onClick={() => navigate('home')}><ArrowLeft size={16} />Public website</button><button type="button" onClick={onLogout}><LogOut size={16} />Log out</button></div>}
          </div>
        </div>
      </header>
      <main id="portal-content" tabIndex={-1} className="portal-content dash-content-body">
        {headerTitle && <div className="bb-page-heading"><div><h1>{headerTitle}</h1>{headerSubtitle && <p>{headerSubtitle}</p>}</div>{headerAction}</div>}
        {children}
        <footer className="portal-footer"><span>BloodBridge · {config.title}</span><span>Synthetic demonstration · Not for clinical decisions</span></footer>
      </main>
    </div>
    <NotificationDrawer open={inboxOpen} onClose={closeInbox} token={authStorage.getToken()} onUnreadChange={setUnread} onViewInvitations={role === 'DONOR' ? () => { closeInbox(); go('notifications'); } : null} />
  </div>;
}
