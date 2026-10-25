import React, { useState, useEffect } from 'react';
import {
  MailCheck,
  Send,
  AlertCircle,
  CheckCircle,
  Clock,
  RefreshCw,
  Search,
  Filter,
  Info,
  X,
} from 'lucide-react';
import { getNotificationDeliveries } from '../api/adminApi.js';

export function NotificationMonitoringPage({ token }) {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [channelFilter, setChannelFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Selected delivery for error inspection
  const [selectedDelivery, setSelectedDelivery] = useState(null);

  const loadDeliveries = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getNotificationDeliveries(token);
      setDeliveries(res.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDeliveries();
  }, [token]);

  const filteredDeliveries = deliveries.filter((d) => {
    if (channelFilter && d.channel !== channelFilter) return false;
    if (statusFilter && d.status !== statusFilter) return false;
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div
        className="dash-card"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
          padding: 24,
        }}
      >
        <div>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#DB3654',
            }}
          >
            Communication Infrastructure
          </span>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1D3043', margin: '4px 0 0' }}>
            Multi-Channel Notification Monitoring
          </h1>
          <p style={{ fontSize: 13, color: '#7A8B9E', marginTop: 4, marginBottom: 0 }}>
            Inspect outbound donor alerts, emergency broadcast delivery states, failure logs and retry telemetry.
          </p>
        </div>

        <button
          type="button"
          className="dash-btn-outline"
          style={{ minHeight: 40, padding: '0 16px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
          onClick={loadDeliveries}
          disabled={loading}
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh Deliveries
        </button>
      </div>

      {error && (
        <div
          style={{
            background: '#FEE2E2',
            color: '#DC2626',
            padding: '12px 16px',
            borderRadius: 10,
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <AlertCircle size={18} /> {error}
        </div>
      )}

      {/* Table Card */}
      <div className="dash-card">
        {/* Filters */}
        <div
          style={{
            display: 'flex',
            gap: 12,
            flexWrap: 'wrap',
            alignItems: 'center',
            marginBottom: 16,
            background: '#F8FAFC',
            padding: 14,
            borderRadius: 10,
          }}
        >
          <select
            id="filter-delivery-channel"
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value)}
            className="reg-input"
            style={{ width: 160, height: 38, fontSize: 13 }}
          >
            <option value="">All Channels</option>
            <option value="IN_APP">IN_APP</option>
            <option value="SMS">SMS</option>
            <option value="EMAIL">EMAIL</option>
          </select>

          <select
            id="filter-delivery-status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="reg-input"
            style={{ width: 160, height: 38, fontSize: 13 }}
          >
            <option value="">All States</option>
            <option value="DELIVERED">DELIVERED</option>
            <option value="PENDING">PENDING</option>
            <option value="PROCESSING">PROCESSING</option>
            <option value="FAILED">FAILED</option>
          </select>

          <button
            type="button"
            className="reg-btn-outline"
            style={{ minHeight: 38, padding: '0 12px', fontSize: 13 }}
            onClick={() => {
              setChannelFilter('');
              setStatusFilter('');
            }}
          >
            Reset Filters
          </button>
        </div>

        {/* Deliveries Table */}
        {loading ? (
          <p style={{ color: '#7A8B9E', fontSize: 13, padding: 12 }}>Loading delivery logs…</p>
        ) : filteredDeliveries.length === 0 ? (
          <p style={{ color: '#7A8B9E', fontSize: 13, padding: 12 }}>No notification delivery records match current filters.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #E8ECF2', color: '#7A8B9E', fontSize: 11, textTransform: 'uppercase' }}>
                  <th style={{ padding: '10px 12px' }}>Delivery Ref</th>
                  <th style={{ padding: '10px 12px' }}>Recipient</th>
                  <th style={{ padding: '10px 12px' }}>Channel</th>
                  <th style={{ padding: '10px 12px' }}>State</th>
                  <th style={{ padding: '10px 12px' }}>Attempts</th>
                  <th style={{ padding: '10px 12px' }}>Dispatched At</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>Telemetry</th>
                </tr>
              </thead>
              <tbody>
                {filteredDeliveries.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #E8ECF2' }}>
                    <td style={{ padding: '12px' }}>
                      <code>{String(item.id).slice(0, 8)}…</code>
                    </td>
                    <td style={{ padding: '12px', color: '#1D3043' }}>
                      <strong>{item.recipient_name || 'Donor Recipient'}</strong>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: 10,
                          fontSize: 11,
                          fontWeight: 700,
                          background: item.channel === 'SMS' ? '#FEF3C7' : item.channel === 'EMAIL' ? '#EFF6FF' : '#E6F7F1',
                          color: item.channel === 'SMS' ? '#D97706' : item.channel === 'EMAIL' ? '#3B82F6' : '#16A085',
                        }}
                      >
                        {item.channel}
                      </span>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: 10,
                          fontSize: 11,
                          fontWeight: 700,
                          background:
                            item.status === 'DELIVERED'
                              ? '#E6F7F1'
                              : item.status === 'FAILED'
                              ? '#FEE2E2'
                              : '#FEF3C7',
                          color:
                            item.status === 'DELIVERED'
                              ? '#16A085'
                              : item.status === 'FAILED'
                              ? '#EF4444'
                              : '#D97706',
                        }}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px', color: '#41566D' }}>
                      {item.attempts} / {item.max_attempts || 3}
                    </td>
                    <td style={{ padding: '12px', color: '#7A8B9E', fontSize: 12 }}>
                      {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      {item.error_message ? (
                        <button
                          type="button"
                          className="reg-btn-outline"
                          style={{ height: 28, padding: '0 8px', fontSize: 11, color: '#EF4444', borderColor: '#FCA5A5' }}
                          onClick={() => setSelectedDelivery(item)}
                        >
                          View Error
                        </button>
                      ) : (
                        <span style={{ fontSize: 11, color: '#16A085' }}>OK</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Safe Error Details Modal */}
      {selectedDelivery && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(29, 48, 67, 0.6)',
            backdropFilter: 'blur(2px)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 9999,
            padding: 16,
          }}
        >
          <div
            className="dash-card"
            style={{
              width: '100%',
              maxWidth: 480,
              background: '#FFFFFF',
              borderRadius: 16,
              padding: 24,
              position: 'relative',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <strong style={{ fontSize: 16, color: '#1D3043' }}>Delivery Error Telemetry</strong>
              <button
                type="button"
                onClick={() => setSelectedDelivery(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#7A8B9E' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ background: '#FEE2E2', color: '#DC2626', padding: 12, borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
              {selectedDelivery.error_message || 'Unknown provider delivery error'}
            </div>

            <div style={{ fontSize: 12, color: '#7A8B9E', lineHeight: 1.5 }}>
              Delivery attempts: {selectedDelivery.attempts} · Channel: {selectedDelivery.channel}
              <br />
              <small>
                Note: In accordance with privacy and security protocol, raw message payloads and recipient contact tokens are sanitized.
              </small>
            </div>

            <button
              type="button"
              className="dash-btn-primary"
              style={{ width: '100%', height: 40, marginTop: 16 }}
              onClick={() => setSelectedDelivery(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
