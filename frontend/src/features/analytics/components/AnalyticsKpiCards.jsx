import React from 'react';
import {
  Users,
  Building2,
  FileText,
  AlertTriangle,
  Droplets,
  Heart,
  TrendingUp,
} from 'lucide-react';

export function AnalyticsKpiCards({ metrics = {}, loading = false }) {
  const cards = [
    {
      id: 'kpi-donors',
      label: 'Registered donors',
      value: (metrics.total_donors ?? 0).toLocaleString(),
      note: `${(metrics.online_donors ?? 0).toLocaleString()} online · ${(metrics.walkin_donors ?? 0).toLocaleString()} walk-in`,
      icon: Users,
      iconClass: 'pink',
    },
    {
      id: 'kpi-hospitals',
      label: 'Active hospitals',
      value: (metrics.active_hospitals ?? 0).toLocaleString(),
      note: 'Verified healthcare institutions',
      icon: Building2,
      iconClass: 'blue',
    },
    {
      id: 'kpi-requests',
      label: 'Requests this month',
      value: (metrics.requests_this_month ?? 0).toLocaleString(),
      note: 'Clinical demand in current period',
      icon: FileText,
      iconClass: 'pink',
    },
    {
      id: 'kpi-alerts',
      label: 'Stock alerts',
      value: (metrics.stock_alerts ?? 0).toLocaleString(),
      note: 'Expiring in ≤ 7 days / low stock',
      icon: AlertTriangle,
      iconClass: 'yellow',
    },
    {
      id: 'kpi-units',
      label: 'Available component units',
      value: (metrics.available_units ?? 0).toLocaleString(),
      note: 'Released, in-stock & unexpired',
      icon: Droplets,
      iconClass: 'green',
    },
    {
      id: 'kpi-collections',
      label: 'Collections this month',
      value: (metrics.collections_this_month ?? 0).toLocaleString(),
      note: 'Completed donor collections',
      icon: Heart,
      iconClass: 'pink',
    },
  ];

  return (
    <div className="dash-kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
      {cards.map((c) => {
        const IconComponent = c.icon;
        return (
          <div key={c.id} className="dash-kpi-card" id={c.id}>
            <div className="dash-kpi-top">
              <div className={`dash-kpi-icon ${c.iconClass}`}>
                <IconComponent size={20} />
              </div>
              <span className="dash-kpi-label">{c.label}</span>
            </div>
            <div className="dash-kpi-value">
              {loading ? '…' : c.value}
            </div>
            <div className="dash-kpi-note">{c.note}</div>
          </div>
        );
      })}
    </div>
  );
}
