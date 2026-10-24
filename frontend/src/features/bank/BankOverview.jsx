import React from 'react';
import { Droplets, Clock, FileText, ArrowRight, CheckCircle2, Truck, Tent, HeartHandshake } from 'lucide-react';
import { BloodGroupStockGrid } from '../inventory/components/BloodGroupStockGrid.jsx';

export function BankOverview({
  dashboardData = {},
  selectedComponent = 'RBC',
  onSelectComponent = () => {},
  onNavigate = () => {},
}) {
  const kpis = dashboardData.kpis || {
    available_units: 0,
    expiring_soon: 0,
    incoming_requests: 0,
    today_collections: 0,
    in_transit_transfers: 0,
    upcoming_camps: 0,
  };

  const pad = (num) => String(num || 0).padStart(2, '0');

  const expiryWatch = dashboardData.expiryWatch || [];
  const recentActivity = dashboardData.recentActivity || [];
  const stockGridData = dashboardData.bloodGroupAvailability || [];

  return (
    <div className="bank-overview-feature" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Accessible Title */}
      <h2 style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', border: 0 }}>
        Inventory control
      </h2>

      {/* KPI Cards Grid */}
      <div
        className="kpi-cards-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
        }}
      >
        {/* Card 1: Available Units */}
        <div
          data-testid="kpi-available-units"
          onClick={() => onNavigate('inventory')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onNavigate('inventory')}
          style={{
            background: '#FFFFFF',
            borderRadius: 16,
            padding: 22,
            border: '1px solid #E8ECF2',
            boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: '#FFF0F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Droplets size={22} color="#DB3654" />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#7A8B9E' }}>Available units</div>
              <div style={{ fontSize: 11, color: '#9CA3AF' }}>Ready for allocation</div>
            </div>
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#1D3043' }}>
            {pad(kpis.available_units)}
          </div>
        </div>

        {/* Card 2: Expiring Soon */}
        <div
          data-testid="kpi-expiring-soon"
          onClick={() => onNavigate('expiry')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onNavigate('expiry')}
          style={{
            background: '#FFFFFF',
            borderRadius: 16,
            padding: 22,
            border: '1px solid #E8ECF2',
            boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: '#FFF4E5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={22} color="#D49A36" />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#7A8B9E' }}>Expiring soon</div>
              <div style={{ fontSize: 11, color: '#9CA3AF' }}>Review expiry dates</div>
            </div>
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#1D3043' }}>
            {pad(kpis.expiring_soon)}
          </div>
        </div>

        {/* Card 3: Incoming Requests */}
        <div
          data-testid="kpi-incoming-requests"
          onClick={() => onNavigate('requests')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onNavigate('requests')}
          style={{
            background: '#FFFFFF',
            borderRadius: 16,
            padding: 22,
            border: '1px solid #E8ECF2',
            boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={22} color="#1D4ED8" />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#7A8B9E' }}>Incoming requests</div>
              <div style={{ fontSize: 11, color: '#9CA3AF' }}>Waiting for response</div>
            </div>
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#1D3043' }}>
            {pad(kpis.incoming_requests)}
          </div>
        </div>

        {/* Card 4: Today Collections */}
        <div
          data-testid="kpi-today-collections"
          onClick={() => onNavigate('donations')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onNavigate('donations')}
          style={{
            background: '#FFFFFF',
            borderRadius: 16,
            padding: 22,
            border: '1px solid #E8ECF2',
            boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <HeartHandshake size={22} color="#047857" />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#7A8B9E' }}>Today's collections</div>
              <div style={{ fontSize: 11, color: '#9CA3AF' }}>Completed intake</div>
            </div>
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#1D3043' }}>
            {pad(kpis.today_collections)}
          </div>
        </div>

        {/* Card 5: In-Transit Transfers */}
        <div
          data-testid="kpi-in-transit-transfers"
          onClick={() => onNavigate('transfers')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onNavigate('transfers')}
          style={{
            background: '#FFFFFF',
            borderRadius: 16,
            padding: 22,
            border: '1px solid #E8ECF2',
            boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: '#FFF7ED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Truck size={22} color="#C2410C" />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#7A8B9E' }}>In-transit transfers</div>
              <div style={{ fontSize: 11, color: '#9CA3AF' }}>Cold-chain movements</div>
            </div>
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#1D3043' }}>
            {pad(kpis.in_transit_transfers)}
          </div>
        </div>

        {/* Card 6: Upcoming Camps */}
        <div
          data-testid="kpi-upcoming-camps"
          onClick={() => onNavigate('camps')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onNavigate('camps')}
          style={{
            background: '#FFFFFF',
            borderRadius: 16,
            padding: 22,
            border: '1px solid #E8ECF2',
            boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: '#F5F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Tent size={22} color="#6D28D9" />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#7A8B9E' }}>Upcoming camps</div>
              <div style={{ fontSize: 11, color: '#9CA3AF' }}>Approved drives</div>
            </div>
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#1D3043' }}>
            {pad(kpis.upcoming_camps)}
          </div>
        </div>
      </div>

      {/* Two Column Layout: Blood Group Availability & Expiry Watch */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 20 }}>
        {/* Blood Group Availability */}
        <BloodGroupStockGrid
          stockData={stockGridData}
          selectedComponent={selectedComponent}
          onSelectComponent={onSelectComponent}
          onTileClick={() => onNavigate('inventory')}
        />

        {/* Expiry Watch Card */}
        <div
          className="dash-card"
          style={{
            background: '#FFFFFF',
            borderRadius: 18,
            padding: 24,
            border: '1px solid #E8ECF2',
            boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: '#1D3043', margin: '0 0 4px 0' }}>
                Expiry watch
              </h2>
              <p style={{ fontSize: 13, color: '#7A8B9E', margin: 0 }}>
                First-expiring stock to review
              </p>
            </div>
            <span
              style={{
                background: '#FFF0F2',
                color: '#DB3654',
                fontSize: 11,
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: 20,
              }}
            >
              {expiryWatch.length} items
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>
            {expiryWatch.length === 0 ? (
              <p style={{ fontSize: 13, color: '#7A8B9E', margin: 'auto 0' }}>
                No active stock units currently near expiration.
              </p>
            ) : (
              expiryWatch.map((item, idx) => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingBottom: 10,
                    borderBottom: idx < expiryWatch.length - 1 ? '1px solid #E8ECF2' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        background: '#FFF5E5',
                        color: '#D69B3D',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Clock size={18} />
                    </div>
                    <div>
                      <strong style={{ fontSize: 13, color: '#1D3043', display: 'block' }}>
                        #{item.id.slice(0, 8)}
                      </strong>
                      <span style={{ fontSize: 11, color: '#7A8B9E' }}>
                        {item.blood_type_code} &bull; {item.component_code}
                      </span>
                    </div>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#C18328' }}>
                    {item.days_left === 0 ? `${item.hours_left}h left` : `${item.days_left}d left`}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent Inventory Activity Table */}
      <div
        className="dash-card"
        style={{
          background: '#FFFFFF',
          borderRadius: 18,
          padding: 24,
          border: '1px solid #E8ECF2',
          boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#1D3043', margin: '0 0 4px 0' }}>
              Recent inventory activity
            </h2>
            <p style={{ fontSize: 13, color: '#7A8B9E', margin: 0 }}>
              Accountable custody audit trail
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('movements')}
            style={{
              padding: '6px 14px',
              borderRadius: 20,
              background: '#F3F6F8',
              color: '#1D3043',
              fontSize: 11,
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            See all
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#F7F9FC', borderBottom: '1px solid #E8ECF2' }}>
                <th style={{ padding: '8px 12px', fontSize: 11, fontWeight: 700, color: '#7A8B9E' }}>UNIT / BATCH</th>
                <th style={{ padding: '8px 12px', fontSize: 11, fontWeight: 700, color: '#7A8B9E' }}>COMPONENT</th>
                <th style={{ padding: '8px 12px', fontSize: 11, fontWeight: 700, color: '#7A8B9E' }}>BLOOD GROUP</th>
                <th style={{ padding: '8px 12px', fontSize: 11, fontWeight: 700, color: '#7A8B9E' }}>ACTIVITY</th>
                <th style={{ padding: '8px 12px', fontSize: 11, fontWeight: 700, color: '#7A8B9E' }}>RECORDED</th>
              </tr>
            </thead>
            <tbody>
              {recentActivity.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '24px 12px', color: '#7A8B9E', fontSize: 13 }}>
                    No recent inventory movements recorded.
                  </td>
                </tr>
              ) : (
                recentActivity.map((row) => (
                  <tr key={row.id} style={{ borderBottom: '1px solid #E8ECF2' }}>
                    <td style={{ padding: '12px 12px', fontSize: 13, fontWeight: 700, color: '#1D3043' }}>
                      #{row.blood_unit_id?.slice(0, 8)}
                    </td>
                    <td style={{ padding: '12px 12px', fontSize: 13, color: '#4B5563' }}>
                      {row.component_code}
                    </td>
                    <td style={{ padding: '12px 12px' }}>
                      <span
                        style={{
                          background: '#FFF0F2',
                          color: '#DB3654',
                          fontWeight: 700,
                          fontSize: 11,
                          padding: '2px 8px',
                          borderRadius: 8,
                        }}
                      >
                        {row.blood_type_code}
                      </span>
                    </td>
                    <td style={{ padding: '12px 12px' }}>
                      <strong style={{ color: '#16A085', fontSize: 12 }}>
                        {row.to_status}
                      </strong>
                    </td>
                    <td style={{ padding: '12px 12px', color: '#7A8B9E', fontSize: 12 }}>
                      {new Date(row.acted_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
