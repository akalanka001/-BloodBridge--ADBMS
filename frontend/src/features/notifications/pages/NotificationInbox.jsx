import React, { useState, useEffect } from 'react';
import { Bell, CheckCheck, Loader2, AlertCircle, Inbox } from 'lucide-react';
import { notificationsApi } from '../api/notificationsApi.js';
import { NotificationCard } from '../components/NotificationCard.jsx';

export function NotificationInbox({ user }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('ALL');

  const fetchInbox = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await notificationsApi.getMyNotifications();
      setNotifications(res.data?.notifications || []);
      setUnreadCount(res.data?.unreadCount || 0);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInbox();
  }, []);

  const handleMarkRead = async (id) => {
    try {
      await notificationsApi.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, status: 'READ' } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {}
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, status: 'READ' })));
      setUnreadCount(0);
    } catch {}
  };

  const filtered = notifications.filter((n) => {
    if (activeTab === 'UNREAD') return n.status === 'UNREAD';
    if (activeTab === 'CAMP') return n.category === 'CAMP';
    if (activeTab === 'EMERGENCY') return n.category === 'EMERGENCY' || n.priority === 'EMERGENCY';
    return true;
  });

  const tabs = [
    { key: 'ALL', label: 'All Alerts' },
    { key: 'UNREAD', label: `Unread (${unreadCount})` },
    { key: 'CAMP', label: 'Camp Updates' },
    { key: 'EMERGENCY', label: 'Emergency Appeals' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.4rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Bell size={24} color="#dc2626" />
            Notifications & Dispatch Alerts
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.875rem', color: '#64748b' }}>
            Stay informed with verified blood donation opportunities, camp invitations, and emergency notices.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={handleMarkAllRead}
            style={{
              padding: '8px 14px',
              backgroundColor: '#f1f5f9',
              color: '#334155',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <CheckCheck size={16} /> Mark All as Read
          </button>
        )}
      </div>

      {error && (
        <div style={{ padding: '12px', backgroundColor: '#fef2f2', color: '#991b1b', borderRadius: '8px', border: '1px solid #fecaca', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem' }}>
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '0.85rem',
              fontWeight: 600,
              border: activeTab === tab.key ? '1px solid #dc2626' : '1px solid #e2e8f0',
              backgroundColor: activeTab === tab.key ? '#fee2e2' : '#ffffff',
              color: activeTab === tab.key ? '#991b1b' : '#475569',
              cursor: 'pointer',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notification List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
            <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 8px auto', display: 'block' }} />
            Loading notification messages...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '40px 20px', backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', textAlign: 'center', color: '#94a3b8' }}>
            <Inbox size={32} style={{ margin: '0 auto 8px auto', display: 'block' }} />
            <h3 style={{ margin: '0 0 4px 0', fontSize: '1rem', color: '#334155' }}>Your notification inbox is clear</h3>
            <p style={{ margin: 0, fontSize: '0.85rem' }}>No alerts found for the selected category.</p>
          </div>
        ) : (
          filtered.map((notification) => (
            <NotificationCard
              key={notification.id}
              notification={notification}
              onMarkRead={handleMarkRead}
            />
          ))
        )}
      </div>
    </div>
  );
}
