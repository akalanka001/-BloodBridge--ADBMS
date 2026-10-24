import React from 'react';
import { Building2, Users, ShieldCheck } from 'lucide-react';
import { BloodTypeBadge } from './RequestStatusBadge.jsx';

export function MatchingOverview({ summary = null, fallbackRequest = null }) {
  if (!summary && !fallbackRequest) {
    return (
      <div className="dash-card matching-overview-card" style={{ padding: 24, textAlign: 'center' }}>
        <h3 style={{ fontSize: 18, fontWeight: 800, color: '#1D3043', marginBottom: 8 }}>Matching overview</h3>
        <p style={{ fontSize: 13, color: '#7A8B9E' }}>No active requests to display matching intelligence.</p>
      </div>
    );
  }

  const bloodType = summary?.bloodTypeCode || fallbackRequest?.blood_type_code || 'O+';
  const component = summary?.componentCode || fallbackRequest?.component_code || 'RBC';
  const units = summary?.unitsRequested || fallbackRequest?.units_requested || fallbackRequest?.total_requested_units || 1;
  const progress = summary?.matchingProgress ?? 0;
  const facilitiesCount = summary?.inventoryFacilitiesCount ?? 0;
  const candidatesCount = summary?.potentialDonorsCount ?? 0;
  const clinicalStatus = summary?.clinicalVerificationStatus || (facilitiesCount > 0 ? 'Stock verified in network' : 'Pending donor screening');

  return (
    <div
      className="dash-card matching-overview-card"
      style={{
        background: '#FFFFFF',
        borderRadius: 18,
        padding: '24px 28px',
        border: '1px solid #E8ECF2',
        boxShadow: '0 9px 24px rgba(28, 57, 85, 0.05)',
      }}
    >
      <div style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 18, fontWeight: 800, color: '#1D3043', margin: 0 }}>Matching overview</h3>
        <span style={{ fontSize: 12, color: '#7A8B9E' }}>
          Potential network leads for active shortage
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 16, borderBottom: '1px solid #E8ECF2' }}>
        <BloodTypeBadge bloodType={bloodType} />
        <span style={{ fontSize: 13, color: '#7A8B9E', fontWeight: 500 }}>
          {component} &bull; {units} unit{units > 1 ? 's' : ''} requested
        </span>
      </div>

      {/* Matching Progress */}
      <div style={{ marginTop: 18, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#1D3043' }}>Matching progress</span>
          <span style={{ fontSize: 13, fontWeight: 800, color: '#DB3654' }}>{progress}%</span>
        </div>
        <div style={{ width: '100%', height: 10, borderRadius: 6, backgroundColor: '#F2E7EC', overflow: 'hidden' }}>
          <div
            style={{
              width: `${Math.min(100, Math.max(0, progress))}%`,
              height: '100%',
              borderRadius: 6,
              backgroundColor: '#DB3654',
              transition: 'width 0.6s ease',
            }}
          />
        </div>
      </div>

      {/* 3 Metric Rows matching 03-hospital-dashboard.svg */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* 1. Inventory sources */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              backgroundColor: '#F2F6FA',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#DB3654',
            }}
          >
            <Building2 size={18} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1D3043' }}>Inventory sources</div>
            <div style={{ fontSize: 11, color: '#7A8B9E' }}>
              {facilitiesCount} {facilitiesCount === 1 ? 'facility' : 'facilities'} found with available stock
            </div>
          </div>
        </div>

        {/* 2. Potential donors */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              backgroundColor: '#F2F6FA',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#DB3654',
            }}
          >
            <Users size={18} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1D3043' }}>Potential donors</div>
            <div style={{ fontSize: 11, color: '#7A8B9E' }}>
              {candidatesCount} consented candidates in target area
            </div>
          </div>
        </div>

        {/* 3. Clinical verification */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              backgroundColor: '#F2F6FA',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#7A8B9E',
            }}
          >
            <ShieldCheck size={18} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1D3043' }}>Clinical verification</div>
            <div style={{ fontSize: 11, color: '#7A8B9E' }}>
              {clinicalStatus}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
