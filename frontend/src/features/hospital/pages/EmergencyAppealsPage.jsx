import React, { useState } from 'react';
import { Siren, Plus, MapPin, Users, Send, AlertTriangle, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { BloodTypeBadge } from '../components/RequestStatusBadge.jsx';
import { EmergencyAppealForm } from '../components/EmergencyAppealForm.jsx';

const STAGE_ORDER = ['GN_DIVISION', 'DS_DIVISION', 'DISTRICT', 'PROVINCE', 'NATIONAL'];
const STAGE_LABELS = {
  GN_DIVISION: 'GN Division',
  DS_DIVISION: 'DS Division',
  DISTRICT: 'District Tier',
  PROVINCE: 'Province Tier',
  NATIONAL: 'National Tier',
};

export function EmergencyAppealsPage({
  appeals = [],
  requests = [],
  hospitalId,
  loading = false,
  onCreateAppeal = () => {},
  onEscalateAppeal = () => {},
  onRefresh = () => {},
  initialRequestId = '',
  initialItemId = '',
}) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedAppeal, setSelectedAppeal] = useState(null);

  return (
    <div className="emergency-appeals-page" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: '#1D3043', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Siren size={24} color="#DB3654" />
            Emergency Appeals & Geographic Escalation
          </h2>
          <span style={{ fontSize: 13, color: '#7A8B9E' }}>
            Escalate acute blood shortages across Sri Lankan administrative tiers (GN &rarr; DS &rarr; District &rarr; Province)
          </span>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '11px 20px',
            borderRadius: 12,
            border: 'none',
            background: '#DB3654',
            color: '#FFFFFF',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(219, 54, 84, 0.25)',
          }}
        >
          <Plus size={16} /> Initiate Appeal
        </button>
      </div>

      {/* Appeals List */}
      {appeals.length === 0 ? (
        <div
          className="dash-card"
          style={{
            background: '#FFFFFF',
            borderRadius: 16,
            padding: '48px 24px',
            textAlign: 'center',
            border: '1px solid #E8ECF2',
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              backgroundColor: '#FFF0F2',
              color: '#DB3654',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
            }}
          >
            <Siren size={26} />
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: '#1D3043', margin: '0 0 6px 0' }}>
            No Active Emergency Appeals
          </h3>
          <p style={{ fontSize: 13, color: '#7A8B9E', maxWidth: 440, margin: '0 auto 18px auto' }}>
            Emergency appeals are triggered for critical component shortages when local bank inventory is insufficient.
          </p>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            style={{
              padding: '9px 18px',
              borderRadius: 10,
              border: '1px solid #DB3654',
              color: '#DB3654',
              background: '#FFF0F2',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Initiate an Emergency Appeal
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {appeals.map((appeal) => {
            const currentStageIndex = STAGE_ORDER.indexOf(appeal.escalation_level);
            const canEscalate = currentStageIndex < STAGE_ORDER.length - 1 && appeal.status === 'ACTIVE';
            const nextStage = canEscalate ? STAGE_ORDER[currentStageIndex + 1] : null;

            return (
              <div
                key={appeal.id}
                className="dash-card"
                style={{
                  background: '#FFFFFF',
                  borderRadius: 16,
                  padding: 24,
                  border: '1px solid #E8ECF2',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
                }}
              >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <BloodTypeBadge bloodType={appeal.target_blood_type} />
                      <span style={{ fontSize: 16, fontWeight: 800, color: '#1D3043' }}>
                        {appeal.target_component_code} &mdash; Acute Shortage of {appeal.shortage_units} Units
                      </span>
                      <span
                        style={{
                          padding: '3px 10px',
                          borderRadius: 12,
                          fontSize: 11,
                          fontWeight: 700,
                          backgroundColor: appeal.status === 'ACTIVE' ? '#EFF6FF' : '#ECFDF5',
                          color: appeal.status === 'ACTIVE' ? '#1D4ED8' : '#047857',
                        }}
                      >
                        {appeal.status}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: '#7A8B9E', marginTop: 4 }}>
                      Appeal #{appeal.id.slice(0, 8)} &bull; Linked to Request #{appeal.request_id.slice(0, 8)} &bull; Created {new Date(appeal.created_at).toLocaleDateString()}
                    </div>
                  </div>

                  {canEscalate && (
                    <button
                      type="button"
                      onClick={() => onEscalateAppeal(appeal.id, nextStage)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '9px 16px',
                        borderRadius: 10,
                        border: 'none',
                        background: '#DB3654',
                        color: '#FFFFFF',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                        boxShadow: '0 3px 10px rgba(219,54,84,0.2)',
                      }}
                    >
                      <ArrowUpRight size={15} /> Escalate to {STAGE_LABELS[nextStage]}
                    </button>
                  )}
                </div>

                {/* Reason */}
                <div style={{ background: '#FFF0F2', padding: '10px 14px', borderRadius: 10, fontSize: 13, color: '#881337', marginBottom: 18 }}>
                  <strong>Authorized Reason:</strong> {appeal.reason}
                </div>

                {/* Escalation Hierarchy Stages Bar */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#1D3043', marginBottom: 10 }}>
                    Geographic Expansion Stage: <strong>{STAGE_LABELS[appeal.escalation_level] || appeal.escalation_level}</strong>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
                    {STAGE_ORDER.map((stageKey, idx) => {
                      const isReached = idx <= currentStageIndex;
                      const isCurrent = idx === currentStageIndex;
                      const stepRecord = appeal.steps?.find((s) => s.stage_name === stageKey);

                      return (
                        <div
                          key={stageKey}
                          style={{
                            padding: '10px 12px',
                            borderRadius: 10,
                            backgroundColor: isCurrent ? '#FFF0F2' : isReached ? '#F0FDF4' : '#F9FAFB',
                            border: `1px solid ${isCurrent ? '#DB3654' : isReached ? '#86EFAC' : '#E5E7EB'}`,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 4,
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: isCurrent ? '#DB3654' : isReached ? '#166534' : '#9CA3AF' }}>
                              {STAGE_LABELS[stageKey]}
                            </span>
                            {isReached && <CheckCircle2 size={13} color={isCurrent ? '#DB3654' : '#16A085'} />}
                          </div>
                          {stepRecord && (
                            <span style={{ fontSize: 11, color: '#7A8B9E' }}>
                              {stepRecord.candidates_identified || 0} candidates
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Privacy note */}
                <div style={{ fontSize: 11, color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Users size={12} />
                  Privacy-safe donor mobilization: No donor contact details or clinical records are exposed to hospital staff.
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Initiate Emergency Appeal */}
      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ maxWidth: 540, width: '90%' }}>
            <EmergencyAppealForm
              requests={requests}
              hospitalId={hospitalId}
              initialRequestId={initialRequestId}
              initialItemId={initialItemId}
              onSubmit={async (payload) => {
                const result = await onCreateAppeal(payload);
                if (result) setShowCreateModal(false);
              }}
              onCancel={() => setShowCreateModal(false)}
              loading={loading}
            />
          </div>
        </div>
      )}
    </div>
  );
}
