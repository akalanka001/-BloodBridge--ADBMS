import React, { useEffect, useState } from 'react';
import { campsApi } from '../../camps/api/campsApi.js';
import { CampCard, CampCardSkeleton } from '../../camps/CampCard.jsx';
import { Pagination } from '../../../components/ui/Pagination.jsx';
import '../../camps/camp-portal.css';

export function DonorRegistrationsPage({ token, embedded = false, onChange }) {
  const [period, setPeriod] = useState('upcoming');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [result, setResult] = useState({ data: [], pagination: { total: 0 } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    campsApi
      .getMyRegistrations(
        { period, limit: pageSize, offset: (page - 1) * pageSize },
        token,
        controller.signal
      )
      .then((res) => {
        if (!controller.signal.aborted) {
          setResult(res);
          if (page > Math.max(1, res.pagination?.totalPages || 1)) {
            setPage(Math.max(1, res.pagination?.totalPages || 1));
          }
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(err.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [token, period, page, pageSize, refresh]);

  const handleRegistrationChange = () => {
    setRefresh((val) => val + 1);
    onChange?.();
  };

  return (
    <section className="camp-workspace" aria-label="Your camp registrations">
      {!embedded && (
        <div className="camp-header-group">
          <h2>Camp registrations</h2>
          <p>Manage your upcoming registrations and verified donation attendance history.</p>
        </div>
      )}

      <div className="camp-tabs" aria-label="Registration period">
        <button
          type="button"
          aria-pressed={period === 'upcoming'}
          onClick={() => {
            setPeriod('upcoming');
            setPage(1);
          }}
        >
          Upcoming registrations
        </button>
        <button
          type="button"
          aria-pressed={period === 'history'}
          onClick={() => {
            setPeriod('history');
            setPage(1);
          }}
        >
          History & cancelled
        </button>
      </div>

      {error && (
        <div className="camp-status error" role="alert">
          <span>{error}</span>
          <button
            type="button"
            className="btn-camp-outline small"
            style={{ marginLeft: 12, display: 'inline-flex' }}
            onClick={() => setRefresh((value) => value + 1)}
          >
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="bb-camp-grid">
          {[0, 1, 2].map((idx) => (
            <CampCardSkeleton key={idx} />
          ))}
        </div>
      ) : !error && result.data.length === 0 ? (
        <div className="camp-empty">
          <h3>{period === 'upcoming' ? 'No upcoming registrations' : 'No registration history'}</h3>
          <p>Explore donation camps in your area to schedule your next blood donation visit.</p>
        </div>
      ) : (
        !error && (
          <div className="bb-camp-grid">
            {result.data.map((camp, idx) => (
              <CampCard
                key={camp.registration_id || camp.camp_id || `reg-${idx}`}
                camp={camp}
                index={idx}
                token={token}
                isRegistered={camp.registration_status === 'REGISTERED'}
                onRegistrationChange={handleRegistrationChange}
                onViewDetails={() => {
                  window.location.hash = `#donor?tab=camps&campId=${camp.camp_id || camp.id}`;
                }}
              />
            ))}
          </div>
        )
      )}

      {!error && (
        <Pagination
          page={page}
          pageSize={pageSize}
          total={result.pagination?.total || 0}
          loading={loading}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      )}
    </section>
  );
}
