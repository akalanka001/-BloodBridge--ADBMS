import React, { useState } from 'react';
import {
  Heart,
  LayoutDashboard,
  Calendar,
  Clock,
  MapPin,
  Bell,
  Search,
  ShieldCheck,
  FileText,
  Users,
  Building2,
  TrendingUp,
  Activity,
  Database,
  ArrowRight,
  LogOut,
  ChevronDown,
  Menu,
  X,
  Droplet,
  Droplets,
  Hospital,
  Tent,
  User,
  Sliders,
  Settings,
  Siren,
  Truck,
  PlusCircle,
  ClipboardCheck,
  Stethoscope,
  HeartPulse,
  FlaskConical,
  PackageCheck,
  CalendarDays,
  History,
  CalendarClock,
  TicketCheck,
  ClipboardList,
  BadgeCheck,
  MailCheck,
  Image as ImageIcon,
  UserCheck,
  Package,
} from 'lucide-react';
import { navigate } from '../../lib/navigation.js';

export function DashboardLayout({
  role = 'DONOR',
  user = null,
  activeTab = 'overview',
  onTabChange = () => {},
  onLogout = () => {},
  headerTitle = '',
  headerSubtitle = '',
  headerAction = null,
  children,
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const getInitials = (name) => {
    if (!name) return 'BB';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const roleConfigs = {
    DONOR: {
      tag: 'DONOR PORTAL',
      menu: [
        { id: 'overview', label: 'Overview', icon: LayoutDashboard },
        { id: 'donations', label: 'My Donations', icon: Heart },
        { id: 'appointments', label: 'Appointments', icon: CalendarClock },
        { id: 'banks', label: 'Find Blood Banks', icon: Building2 },
        { id: 'camps', label: 'Find Camps', icon: MapPin },
        { id: 'registrations', label: 'My Registrations', icon: TicketCheck },
        { id: 'notifications', label: 'Notifications', icon: Bell },
        { id: 'profile', label: 'My Profile', icon: User },
        { id: 'preferences', label: 'Privacy & Preferences', icon: Sliders },
        { id: 'settings', label: 'Account Settings', icon: Settings },
      ],
      defaultAction: { label: 'Find a blood bank', onClick: () => onTabChange('banks') },
    },
    HOSPITAL_STAFF: {
      tag: 'HOSPITAL PORTAL',
      menu: [
        { id: 'overview', label: 'Overview', icon: LayoutDashboard },
        { id: 'requests', label: 'Blood requests', icon: FileText },
        { id: 'new-request', label: 'New request', icon: PlusCircle },
        { id: 'donors', label: 'Find donors', icon: Search },
        { id: 'banks', label: 'Blood banks', icon: Building2 },
        { id: 'emergency', label: 'Emergency appeals', icon: Siren },
        { id: 'tracking', label: 'Request tracking', icon: Truck },
        { id: 'notifications', label: 'Notifications', icon: Bell },
        { id: 'reports', label: 'Reports', icon: TrendingUp },
      ],
      defaultAction: { label: 'New blood request', onClick: () => onTabChange('new-request') },
    },
    BANK_STAFF: {
      tag: 'BLOOD BANK PORTAL',
      menu: [
        { id: 'overview', label: 'Overview', icon: LayoutDashboard },
        { id: 'inventory', label: 'Blood inventory', icon: Droplets },
        { id: 'intake', label: 'Donor Intake', icon: Users },
        { id: 'visits', label: 'Donor Visits', icon: ClipboardCheck },
        { id: 'assessments', label: 'Assessments', icon: Stethoscope },
        { id: 'donations', label: 'Donations', icon: HeartPulse },
        { id: 'processing', label: 'Component Processing', icon: FlaskConical },
        { id: 'requests', label: 'Hospital Requests', icon: FileText },
        { id: 'reservations', label: 'Reservations', icon: PackageCheck },
        { id: 'transfers', label: 'Inter-Bank Transfers', icon: Truck },
        { id: 'expiry', label: 'Expiry alerts', icon: Clock },
        { id: 'camps', label: 'Donation Camps', icon: CalendarDays },
        { id: 'movements', label: 'Inventory Activity', icon: History },
        { id: 'notifications', label: 'Notifications', icon: Bell },
      ],
      defaultAction: { label: 'Record donation', onClick: () => onTabChange('intake') },
    },
    ADMIN: {
      tag: 'ADMINISTRATION',
      menu: [
        { id: 'overview', label: 'Overview', icon: LayoutDashboard },
        { id: 'analytics', label: 'Analytics', icon: TrendingUp },
        { id: 'demand', label: 'Blood Demand', icon: Droplets },
        { id: 'stock', label: 'Stock Reports', icon: Package },
        { id: 'camps', label: 'Camp Analytics', icon: CalendarDays },
        { id: 'transfers', label: 'Transfers Report', icon: Truck },
        { id: 'benchmarks', label: 'Performance Lab', icon: Database },
        { id: 'etl', label: 'ETL Pipeline', icon: Activity },
        { id: 'data-quality', label: 'Data Quality', icon: ShieldCheck },
        { id: 'users', label: 'Users and roles', icon: Users },
        { id: 'institutions', label: 'Institutions', icon: Building2 },
        { id: 'camp-oversight', label: 'Camp Oversight', icon: ClipboardList },
        { id: 'camp-approvals', label: 'Camp Approvals', icon: BadgeCheck },
        { id: 'notification-monitoring', label: 'Notification Monitoring', icon: MailCheck },
      ],
      defaultAction: null,
    },
  };

  const config = roleConfigs[role] || roleConfigs.DONOR;
  const userInitials = getInitials(user?.fullName || user?.full_name);

  return (
    <div className="dash-container">
      {/* Sidebar Overlay for Mobile */}
      {mobileMenuOpen && (
        <div
          className="dash-sidebar-overlay"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Dark Navy Sidebar */}
      <aside className={`dash-sidebar ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="dash-sidebar-header">
          <div className="dash-brand-icon">
            <Heart size={20} fill="#ffffff" stroke="#ffffff" />
          </div>
          <span className="dash-brand-text">BloodBridge</span>
          <button
            type="button"
            className="dash-close-mobile"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>

        <div className="dash-role-tag">{config.tag}</div>

        <nav className="dash-nav">
          {config.menu.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                className={`dash-nav-btn ${active ? 'active' : ''}`}
                onClick={() => {
                  onTabChange(item.id);
                  setMobileMenuOpen(false);
                }}
              >
                {active && <span className="dash-active-indicator" />}
                <Icon size={18} className="dash-nav-icon" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Secure Network footer card in sidebar */}
        <div className="dash-secure-card">
          <div className="dash-secure-top">
            <ShieldCheck size={18} className="dash-secure-icon" />
            <span className="dash-secure-title">Secure network</span>
          </div>
          <p className="dash-secure-text">Role-based access and verified updates</p>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="dash-main-area">
        {/* Topbar */}
        <header className="dash-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              type="button"
              className="dash-menu-toggle"
              onClick={() => setMobileMenuOpen((o) => !o)}
              aria-label="Toggle navigation"
            >
              <Menu size={22} />
            </button>
            <div className="dash-search-wrap">
              <Search size={16} className="dash-search-icon" />
              <input
                type="text"
                placeholder="Search the platform..."
                className="dash-search-input"
              />
            </div>
          </div>

          <div className="dash-topbar-actions">
            {/* Dashboard Navigation Breadcrumb/Link */}
            <a
              href={`#${role.toLowerCase().replace('_staff', '')}`}
              onClick={(e) => {
                e.preventDefault();
                onTabChange('overview');
              }}
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: '#1D3043',
                textDecoration: 'none',
                padding: '6px 12px',
                borderRadius: 8,
                background: '#F6F8FB',
                cursor: 'pointer',
              }}
            >
              Dashboard
            </a>

            {/* Notification Bell */}
            <button
              type="button"
              className="dash-icon-btn"
              title="Notifications"
              aria-label="Notifications"
            >
              <Bell size={18} />
              <span className="dash-badge-dot" />
            </button>

            {/* User Info & Badge */}
            {user && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#1D3043' }}>
                  {user.fullName || user.full_name}
                </span>
                <span className="dash-pill-badge red" style={{ fontSize: 10, padding: '2px 8px' }}>
                  {role}
                </span>
              </div>
            )}

            {/* Direct Log out action button */}
            <button
              type="button"
              className="reg-btn-outline"
              style={{
                minHeight: 36,
                padding: '0 14px',
                fontSize: 12,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
              onClick={onLogout}
            >
              <LogOut size={14} />
              <span>Log out</span>
            </button>

            {/* User Dropdown */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                className="dash-user-trigger"
                onClick={() => setUserDropdownOpen((o) => !o)}
                aria-label="User profile menu"
              >
                <div className="dash-avatar">{userInitials}</div>
                <ChevronDown size={14} className="dash-chevron" />
              </button>

              {userDropdownOpen && (
                <div className="dash-user-dropdown">
                  <div className="dash-dropdown-header">
                    <strong>{user?.fullName || user?.full_name || 'Logged User'}</strong>
                    <small>{user?.email}</small>
                  </div>
                  <div className="dash-dropdown-divider" />
                  <button
                    type="button"
                    className="dash-dropdown-item"
                    onClick={() => {
                      setUserDropdownOpen(false);
                      navigate('home');
                    }}
                  >
                    Public Home
                  </button>
                  <button
                    type="button"
                    className="dash-dropdown-item text-danger"
                    onClick={() => {
                      setUserDropdownOpen(false);
                      onLogout();
                    }}
                  >
                    <LogOut size={14} /> Log out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="dash-content-body">
          {/* Header row */}
          <div className="dash-page-header">
            <div>
              <h1 className="dash-title">{headerTitle}</h1>
              {headerSubtitle && <p className="dash-subtitle">{headerSubtitle}</p>}
            </div>

            {headerAction ? (
              headerAction
            ) : config.defaultAction ? (
              <button
                type="button"
                className="dash-btn-primary"
                onClick={config.defaultAction.onClick}
              >
                <span>{config.defaultAction.label}</span>
                <ArrowRight size={16} />
              </button>
            ) : null}
          </div>

          {/* Children views */}
          {children}
        </main>
      </div>
    </div>
  );
}
