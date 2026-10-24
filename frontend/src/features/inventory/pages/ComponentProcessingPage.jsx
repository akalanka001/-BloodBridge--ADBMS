import React, { useState } from 'react';
import { FlaskConical, CheckCircle2, AlertCircle, ArrowRight, Layers } from 'lucide-react';

export function ComponentProcessingPage({
  donations = [],
  onProcessDonation = () => {},
  loading = false,
}) {
  const [selectedDonation, setSelectedDonation] = useState(null);
  const [rbcVolume, setRbcVolume] = useState('250');
  const [plasmaVolume, setPlasmaVolume] = useState('200');
  const [plateletsVolume, setPlateletsVolume] = useState('50');
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);

  // Filter donations that are COLLECTED (awaiting component preparation)
  const pendingDonations = donations.filter((d) => d.process_status === 'COLLECTED');

  const handleProcessSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDonation) return;
    setError('');
    setProcessing(true);
    try {
      const components = [
        { componentCode: 'RBC', volumeMl: Number(rbcVolume), daysValid: 35 },
        { componentCode: 'PLASMA', volumeMl: Number(plasmaVolume), daysValid: 365 },
        { componentCode: 'PLATELETS', volumeMl: Number(plateletsVolume), daysValid: 5 },
      ];
      await onProcessDonation({
        donationId: selectedDonation.id,
        components,
      });
      setSelectedDonation(null);
    } catch (err) {
      setError(err.message || 'Failed to process donation components');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="component-processing-page" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: '#1D3043', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
          <FlaskConical size={24} color="#DB3654" />
          Component Processing & Fractionation
        </h2>
        <span style={{ fontSize: 13, color: '#7A8B9E' }}>
          Separate collected whole blood units into clinically verified Red Blood Cells, Plasma, and Platelet components
        </span>
      </div>

      {error && (
        <div style={{ background: '#FEE2E2', border: '1px solid #FCA5A5', color: '#B91C1C', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Pending Donations Table */}
      <div className="dash-card" style={{ background: '#FFFFFF', borderRadius: 16, padding: 24, border: '1px solid #E8ECF2' }}>
        <h3 style={{ fontSize: 17, fontWeight: 800, color: '#1D3043', margin: '0 0 16px 0' }}>
          Collections Awaiting Fractionation ({pendingDonations.length})
        </h3>

        {pendingDonations.length === 0 ? (
          <p style={{ fontSize: 13, color: '#7A8B9E', margin: 0 }}>
            No collected whole-blood donations currently pending component processing.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#F7F9FC', borderBottom: '1px solid #E8ECF2' }}>
                  <th style={{ padding: '8px 10px', fontSize: 11, color: '#7A8B9E' }}>DONATION ID</th>
                  <th style={{ padding: '8px 10px', fontSize: 11, color: '#7A8B9E' }}>DONOR NAME</th>
                  <th style={{ padding: '8px 10px', fontSize: 11, color: '#7A8B9E' }}>BLOOD GROUP</th>
                  <th style={{ padding: '8px 10px', fontSize: 11, color: '#7A8B9E' }}>VOLUME</th>
                  <th style={{ padding: '8px 10px', fontSize: 11, color: '#7A8B9E' }}>COLLECTED AT</th>
                  <th style={{ padding: '8px 10px', fontSize: 11, color: '#7A8B9E' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {pendingDonations.map((don) => (
                  <tr key={don.id} style={{ borderBottom: '1px solid #E8ECF2' }}>
                    <td style={{ padding: '12px 10px', fontSize: 13, fontWeight: 700, color: '#1D3043' }}>
                      #{don.id.slice(0, 8)}
                    </td>
                    <td style={{ padding: '12px 10px', fontSize: 13, color: '#1D3043' }}>
                      {don.donor_name || 'Donor'}
                    </td>
                    <td style={{ padding: '12px 10px' }}>
                      <span style={{ background: '#FFF0F2', color: '#DB3654', fontWeight: 800, fontSize: 12, padding: '2px 8px', borderRadius: 6 }}>
                        {don.blood_type_code || 'Pending'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 10px', fontSize: 13, color: '#4B5563' }}>
                      {don.collected_volume_ml || 450} ml
                    </td>
                    <td style={{ padding: '12px 10px', fontSize: 12, color: '#7A8B9E' }}>
                      {new Date(don.collected_at).toLocaleString()}
                    </td>
                    <td style={{ padding: '12px 10px' }}>
                      <button
                        type="button"
                        onClick={() => setSelectedDonation(don)}
                        style={{
                          padding: '6px 14px',
                          borderRadius: 8,
                          border: 'none',
                          background: '#DB3654',
                          color: '#FFFFFF',
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Fractionate
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Processing Modal */}
      {selectedDonation && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ maxWidth: 480, width: '90%', background: '#FFFFFF', borderRadius: 16, padding: 24 }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: '#1D3043', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Layers size={20} color="#DB3654" />
              Prepare Blood Components
            </h3>
            <p style={{ fontSize: 13, color: '#7A8B9E', margin: '0 0 16px 0' }}>
              Fractionate whole blood donation <strong>#{selectedDonation.id.slice(0, 8)}</strong> ({selectedDonation.blood_type_code}) into quarantined inventory units.
            </p>

            <form onSubmit={handleProcessSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#4B5563', marginBottom: 4 }}>
                  Red Blood Cells (RBC) Volume (ml) &bull; Shelf life: 35 days
                </label>
                <input
                  type="number"
                  value={rbcVolume}
                  onChange={(e) => setRbcVolume(e.target.value)}
                  required
                  min={50}
                  max={350}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 13 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#4B5563', marginBottom: 4 }}>
                  Fresh Frozen Plasma Volume (ml) &bull; Shelf life: 365 days
                </label>
                <input
                  type="number"
                  value={plasmaVolume}
                  onChange={(e) => setPlasmaVolume(e.target.value)}
                  required
                  min={50}
                  max={300}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 13 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#4B5563', marginBottom: 4 }}>
                  Platelet Concentrate Volume (ml) &bull; Shelf life: 5 days
                </label>
                <input
                  type="number"
                  value={plateletsVolume}
                  onChange={(e) => setPlateletsVolume(e.target.value)}
                  required
                  min={20}
                  max={100}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 13 }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setSelectedDonation(null)}
                  style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #D1D5DB', background: '#FFFFFF', color: '#4B5563', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processing}
                  style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: '#DB3654', color: '#FFFFFF', fontSize: 13, fontWeight: 700, cursor: processing ? 'not-allowed' : 'pointer' }}
                >
                  {processing ? 'Processing...' : 'Create 3 Quarantined Units'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
