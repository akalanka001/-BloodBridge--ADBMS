import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Search, RotateCcw } from 'lucide-react';
import { campsApi } from '../../camps/api/campsApi.js';
import { CampCard, CampCardSkeleton } from '../../camps/CampCard.jsx';
import { CampRegistrationForm } from '../../camps/components/CampRegistrationForm.jsx';
import { DonorRegistrationsPage } from './DonorRegistrationsPage.jsx';
import { GeoSelector } from '../../../components/forms/GeoSelector.jsx';
import { Pagination } from '../../../components/ui/Pagination.jsx';
import { campCapacity, campDate } from '../../camps/campDisplay.js';
import '../../camps/camp-portal.css';

function readQuery(initialSection) {
  const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
  return {
    section: initialSection === 'registered' ? 'registered' : params.get('campSection') || 'explore',
    search: params.get('campSearch') || '',
    provinceCode: params.get('campProvince') || '',
    districtCode: params.get('campDistrict') || '',
    dsCode: params.get('campDs') || '',
    gnCode: params.get('campGn') || '',
    sort: ['date', 'availability'].includes(params.get('campSort')) ? params.get('campSort') : 'nearby',
    page: Math.max(1, Number(params.get('campPage')) || 1),
    pageSize: [10, 25, 50].includes(Number(params.get('campSize'))) ? Number(params.get('campSize')) : 10,
    campId: params.get('campId') || '',
  };
}

function saveQuery(query, push = false) {
  const [base, raw = ''] = window.location.hash.split('?');
  const params = new URLSearchParams(raw);
  const mappings = [
    ['section', 'campSection'],
    ['search', 'campSearch'],
    ['provinceCode', 'campProvince'],
    ['districtCode', 'campDistrict'],
    ['dsCode', 'campDs'],
    ['gnCode', 'campGn'],
    ['sort', 'campSort'],
    ['page', 'campPage'],
    ['pageSize', 'campSize'],
    ['campId', 'campId'],
  ];

  for (const [field, key] of mappings) {
    if (query[field]) params.set(key, query[field]);
    else params.delete(key);
  }
  window.history[push ? 'pushState' : 'replaceState'](null, '', `${base || '#donor'}?${params}`);
}

export function FindCampsPage({ token, initialSection = 'explore' }) {
  const [query, setQuery] = useState(() => readQuery(initialSection));
  const [search, setSearch] = useState(query.search);
  const [result, setResult] = useState({ data: [], pagination: { total: 0 }, savedArea: null });
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detailError, setDetailError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const previousInitial = useRef(initialSection);

  function update(patch, push = false) {
    setQuery((prev) => {
      const next = { ...prev, ...patch };
      saveQuery(next, push);
      return next;
    });
  }

  useEffect(() => {
    if (previousInitial.current !== initialSection) {
      previousInitial.current = initialSection;
      update({ section: initialSection, campId: '' });
    }
  }, [initialSection]);

  useEffect(() => {
    function restore() {
      const restored = readQuery();
      setQuery(restored);
      setSearch(restored.search);
    }
    window.addEventListener('popstate', restore);
    window.addEventListener('hashchange', restore);
    return () => {
      window.removeEventListener('popstate', restore);
      window.removeEventListener('hashchange', restore);
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (search !== query.search) update({ search, page: 1 });
    }, 300);
    return () => clearTimeout(timer);
  }, [search, query.search]);

  useEffect(() => {
    if (query.section !== 'explore') return;
    const controller = new AbortController();
    setLoading(true);
    setError('');

    campsApi
      .discoverCamps(
        {
          search: query.search,
          provinceCode: query.provinceCode,
          districtCode: query.districtCode,
          dsCode: query.dsCode,
          gnCode: query.gnCode,
          sort: query.sort,
          limit: query.pageSize,
          offset: (query.page - 1) * query.pageSize,
        },
        token,
        controller.signal
      )
      .then((res) => {
        if (!controller.signal.aborted) {
          setResult(res);
          if (query.page > Math.max(1, res.pagination?.totalPages || 1)) {
            update({ page: Math.max(1, res.pagination?.totalPages || 1) });
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
  }, [
    token,
    query.section,
    query.search,
    query.provinceCode,
    query.districtCode,
    query.dsCode,
    query.gnCode,
    query.sort,
    query.page,
    query.pageSize,
    refresh,
  ]);

  useEffect(() => {
    if (!query.campId) {
      setDetail(null);
      setDetailError('');
      return;
    }
    const controller = new AbortController();
    setDetail(null);
    setDetailError('');
    campsApi
      .getDonorCamp(query.campId, token, controller.signal)
      .then((res) => {
        if (!controller.signal.aborted) setDetail(res.data);
      })
      .catch((err) => {
        if (!controller.signal.aborted) setDetailError(err.message);
      });
    return () => controller.abort();
  }, [query.campId, token, refresh]);

  const reload = () => setRefresh((value) => value + 1);

  return (
    <div className="camp-workspace">
      <div className="camp-header-group">
        <h2>Find camps</h2>
        <p>Upcoming donation opportunities, prioritised near your saved area.</p>
      </div>

      <div className="camp-tabs" aria-label="Camp views">
        <button
          type="button"
          aria-pressed={query.section === 'explore'}
          onClick={() => update({ section: 'explore', campId: '' })}
        >
          Explore camps
        </button>
        <button
          type="button"
          aria-pressed={query.section === 'registered'}
          onClick={() => update({ section: 'registered', campId: '' })}
        >
          Registered & history
        </button>
      </div>

      {query.section === 'registered' ? (
        <DonorRegistrationsPage token={token} embedded onChange={reload} />
      ) : query.campId ? (
        <>
          <div>
            <button
              type="button"
              className="btn-camp-outline"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: 40, width: 'auto', padding: '8px 14px' }}
              onClick={() => update({ campId: '' }, true)}
            >
              <ArrowLeft size={16} />
              <span>Back to results</span>
            </button>
          </div>

          {detailError ? (
            <div className="camp-status error" role="alert">
              {detailError}
            </div>
          ) : !detail ? (
            <div className="bb-camp-grid">
              <CampCardSkeleton />
            </div>
          ) : (
            <article className="bb-camp-detail">
              {detail.primary_poster_url && (
                <div className="bb-camp-detail-hero">
                  <img
                    className="camp-poster"
                    src={detail.primary_poster_url}
                    alt={detail.primary_poster_alt || `${detail.title} poster`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
              )}
              <div>
                <h3 style={{ fontSize: '22px', fontWeight: 800, color: '#1D3043', margin: '0 0 8px 0' }}>
                  {detail.title}
                </h3>
                <p style={{ color: '#64748B', lineHeight: 1.6, margin: 0 }}>
                  {detail.description || 'Contact the coordinating bank for additional camp information.'}
                </p>
              </div>

              <dl>
                <div>
                  <dt>Starts</dt>
                  <dd>{campDate(detail.starts_at)}</dd>
                </div>
                <div>
                  <dt>Ends</dt>
                  <dd>{campDate(detail.ends_at)}</dd>
                </div>
                <div>
                  <dt>Venue</dt>
                  <dd>
                    {[
                      detail.venue_address,
                      detail.town,
                      detail.ds_name,
                      detail.district_name,
                      detail.province_name,
                    ]
                      .filter(Boolean)
                      .join(', ') || 'Unavailable'}
                  </dd>
                </div>
                <div>
                  <dt>Coordinating blood bank</dt>
                  <dd>{detail.coordinating_blood_bank || 'Unavailable'}</dd>
                </div>
                <div>
                  <dt>Organizer</dt>
                  <dd>{detail.organizer_name || 'Unavailable'}</dd>
                </div>
                <div>
                  <dt>Registration places</dt>
                  <dd>{campCapacity(detail)}</dd>
                </div>
                {detail.public_contact && (
                  <div>
                    <dt>Public contact</dt>
                    <dd>{detail.public_contact}</dd>
                  </div>
                )}
              </dl>

              <div style={{ marginTop: 8 }}>
                <CampRegistrationForm camp={detail} token={token} onRegistrationChange={reload} />
              </div>
            </article>
          )}
        </>
      ) : (
        <>
          <div className="camp-filter-panel">
            <div className="camp-search-row">
              <label>
                Search camps
                <input
                  type="search"
                  placeholder="Camp, organizer or venue"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </label>

              <label>
                Order by
                <select
                  value={query.sort}
                  onChange={(event) => update({ sort: event.target.value, page: 1 })}
                >
                  <option value="nearby">Nearest saved area</option>
                  <option value="date">Upcoming date</option>
                  <option value="availability">Registration availability</option>
                </select>
              </label>

              <button
                type="button"
                className="btn-camp-outline"
                style={{ height: 44, width: 'auto', padding: '0 16px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                onClick={() => {
                  setSearch('');
                  update({
                    search: '',
                    provinceCode: '',
                    districtCode: '',
                    dsCode: '',
                    gnCode: '',
                    page: 1,
                  });
                }}
              >
                <RotateCcw size={14} />
                <span>Clear filters</span>
              </button>
            </div>

            <GeoSelector
              value={query}
              onChange={(geo) =>
                update({
                  provinceCode: geo.provinceCode,
                  districtCode: geo.districtCode,
                  dsCode: geo.dsCode,
                  gnCode: geo.gnCode,
                  page: 1,
                })
              }
            />

            <p className="camp-filter-info">
              {query.sort === 'nearby' && result.savedArea
                ? `Prioritised near your saved area (${result.savedArea.district_code || ''}). Other areas remain accessible below.`
                : query.sort === 'availability'
                ? 'Ordered by remaining registration capacity (camps with open places first).'
                : 'All selected areas, ordered by upcoming date.'}
            </p>
          </div>

          {error && (
            <div className="camp-status error" role="alert">
              <span>{error}</span>
              <button
                type="button"
                className="btn-camp-outline small"
                style={{ marginLeft: 12, display: 'inline-flex' }}
                onClick={reload}
              >
                Retry
              </button>
            </div>
          )}

          {loading ? (
            <div className="bb-camp-grid">
              {[0, 1, 2, 3, 4, 5].map((idx) => (
                <CampCardSkeleton key={idx} />
              ))}
            </div>
          ) : !error && result.data.length === 0 ? (
            <div className="camp-empty">
              <h3>No camps match these filters</h3>
              <p>Clear location filters or expand your search to explore upcoming donation opportunities across Sri Lanka.</p>
            </div>
          ) : (
            !error && (
              <div className="bb-camp-grid">
                {result.data.map((camp, index) => (
                  <CampCard
                    key={camp.camp_id || camp.id || `camp-${index}`}
                    camp={camp}
                    index={index}
                    token={token}
                    savedArea={result.savedArea}
                    onViewDetails={(campId) => update({ campId }, true)}
                    onRegistrationChange={reload}
                  />
                ))}
              </div>
            )
          )}

          {!error && (
            <Pagination
              page={query.page}
              pageSize={query.pageSize}
              total={result.pagination?.total || 0}
              loading={loading}
              onPageChange={(page) => update({ page })}
              onPageSizeChange={(pageSize) => update({ pageSize, page: 1 })}
            />
          )}
        </>
      )}
    </div>
  );
}
