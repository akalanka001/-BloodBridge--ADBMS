import React, { useCallback, useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { api } from '../../lib/api.js';
import { useFocusTrap } from '../../hooks/useFocusTrap.js';
import { Pagination } from '../ui/Pagination.jsx';

export function NotificationDrawer({ open, onClose, token, onUnreadChange, onViewInvitations }) {
  const ref = useRef(null);
  const [data, setData] = useState({ notifications: [], total: 0, unreadCount: 0 });
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  useFocusTrap(open, ref, onClose);
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const result = await api(`/notifications/me?limit=10&offset=${(page - 1) * 10}`, {}, token);
      setData(result.data); onUnreadChange(result.data.unreadCount);
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  }, [token, page, onUnreadChange]);
  useEffect(() => { if (open) load(); }, [open, load]);
  const markRead = async id => {
    try { await api(`/notifications/${id}/read`, { method: 'PATCH' }, token); await load(); }
    catch (e) { setError(e.message); }
  };
  if (!open) return null;
  return <div className="bb-dialog-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
    <section className="bb-notification-drawer" role="dialog" aria-modal="true" aria-labelledby="inbox-title" ref={ref}>
      <div className="bb-page-heading"><div><h2 id="inbox-title">Notifications</h2><p>{data.unreadCount} unread</p></div><button type="button" className="bb-icon-button" aria-label="Close notifications" onClick={onClose}><X size={20} /></button></div>
      {onViewInvitations && <button className="btn outline" type="button" onClick={onViewInvitations}>Donation invitations</button>}
      {error && <p className="notice error" role="alert">{error} <button onClick={load}>Retry</button></p>}
      {loading && <p role="status">Loading notifications…</p>}
      {!loading && !error && !data.notifications.length && <p className="bb-empty">No notifications yet.</p>}
      {data.notifications.map(item => <article key={item.id} className={`bb-notification ${item.status === 'UNREAD' ? 'unread' : ''}`}><h3>{item.title || 'Notification'}</h3><p>{item.message}</p><time>{new Date(item.created_at).toLocaleString('en-LK', { timeZone: 'Asia/Colombo' })}</time>{item.status === 'UNREAD' && <button type="button" className="btn outline small" onClick={() => markRead(item.id)}>Mark as read</button>}</article>)}
      <Pagination page={page} pageSize={10} total={data.total ?? data.notifications.length} onPageChange={setPage} loading={loading} />
    </section>
  </div>;
}
