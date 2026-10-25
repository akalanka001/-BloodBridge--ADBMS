import React, { useState } from 'react';
import { Building2, Phone, MapPin, Droplets, RotateCcw } from 'lucide-react';
import { BloodTypeBadge } from '../components/RequestStatusBadge.jsx';

export function BloodBanksPage({
  availableStock = [],
  loading = false,
  onRefresh = () => {},
  onRequestStock = () => {},
}) {
  const [filterComponent, setFilterComponent] = useState('');

  // Group stock units by blood bank
  const banksMap = {};
  availableStock.forEach((item) => {
    const bankId = item.blood_bank_id;
    if (!banksMap[bankId]) {
      banksMap[bankId] = {
        id: bankId,
        name: item.blood_bank_name,
        district: item.district_code,
        town: item.town,
        phone: item.contact_phone,
        inventory: [],
      };
    }
    if (!filterComponent || item.component_code === filterComponent) {
      banksMap[bankId].inventory.push(item);
    }
  });

  const banksList = Object.values(banksMap);

  return (
    <div className="blood-banks-page" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: '#1D3043', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Building2 size={24} color="#DB3654" />
            Network Blood Banks & Available Stock
          </h2>
          <span style={{ fontSize: 13, color: '#7A8B9E' }}>
            Verified national blood bank clusters and released, screened component availability
          </span>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '9px 16px',
            borderRadius: 10,
            border: '1px solid #D1D5DB',
            background: '#FFFFFF',
            color: '#4B5563',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <RotateCcw size={15} /> Refresh Stock
        </button>
      </div>

      {/* Filter by component */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#1D3043' }}>Filter Component:</span>
        <button
          type="button"
          onClick={() => setFilterComponent('')}
          style={{
            padding: '6px 14px',
            borderRadius: 8,
            border: 'none',
            background: filterComponent === '' ? '#DB3654' : '#F3F4F6',
            color: filterComponent === '' ? '#FFFFFF' : '#4B5563',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          All
        </button>
        <button
          type="button"
          onClick={() => setFilterComponent('RBC')}
          style={{
            padding: '6px 14px',
            borderRadius: 8,
            border: 'none',
            background: filterComponent === 'RBC' ? '#DB3654' : '#F3F4F6',
            color: filterComponent === 'RBC' ? '#FFFFFF' : '#4B5563',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          RBC
        </button>
        <button
          type="button"
          onClick={() => setFilterComponent('PLASMA')}
          style={{
            padding: '6px 14px',
            borderRadius: 8,
            border: 'none',
            background: filterComponent === 'PLASMA' ? '#DB3654' : '#F3F4F6',
            color: filterComponent === 'PLASMA' ? '#FFFFFF' : '#4B5563',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Plasma
        </button>
        <button
          type="button"
          onClick={() => setFilterComponent('PLATELETS')}
          style={{
            padding: '6px 14px',
            borderRadius: 8,
            border: 'none',
            background: filterComponent === 'PLATELETS' ? '#DB3654' : '#F3F4F6',
            color: filterComponent === 'PLATELETS' ? '#FFFFFF' : '#4B5563',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Platelets
        </button>
      </div>

      {/* Banks List */}
      {banksList.length === 0 ? (
        <div style={{ background: '#FFFFFF', padding: 36, borderRadius: 16, textAlign: 'center', color: '#7A8B9E', border: '1px solid #E8ECF2' }}>
          No released blood inventory units found in nearby coordinating blood banks.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 20 }}>
          {banksList.map((bank) => (
            <div
              key={bank.id}
              className="dash-card"
              style={{
                background: '#FFFFFF',
                borderRadius: 16,
                padding: 22,
                border: '1px solid #E8ECF2',
                boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <h3 style={{ fontSize: 17, fontWeight: 800, color: '#1D3043', margin: '0 0 4px 0' }}>
                      {bank.name}
                    </h3>
                    <div style={{ fontSize: 12, color: '#7A8B9E', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <MapPin size={13} /> {bank.town || 'Central'}, District {bank.district || 'LK'}
                    </div>
                  </div>
                  {bank.phone && (
                    <a
                      href={`tel:${bank.phone}`}
                      style={{
                        padding: '6px 10px',
                        borderRadius: 8,
                        background: '#F3F4F6',
                        color: '#1D3043',
                        fontSize: 11,
                        fontWeight: 600,
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <Phone size={12} /> {bank.phone}
                    </a>
                  )}
                </div>

                <div style={{ fontSize: 12, fontWeight: 700, color: '#1D3043', marginBottom: 8, marginTop: 14 }}>
                  Verified Available Stock:
                </div>

                {bank.inventory.length === 0 ? (
                  <p style={{ fontSize: 12, color: '#7A8B9E', fontStyle: 'italic' }}>No matching stock units currently released.</p>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {bank.inventory.map((inv, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '4px 10px',
                          borderRadius: 10,
                          backgroundColor: '#FFF0F2',
                          border: '1px solid #FFE2E8',
                        }}
                      >
                        <span style={{ fontSize: 12, fontWeight: 800, color: '#DB3654' }}>
                          {inv.blood_type_code}
                        </span>
                        <span style={{ fontSize: 11, color: '#4B5563' }}>
                          {inv.component_code}: <strong>{inv.available_units}</strong>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ marginTop: 20, paddingTop: 14, borderTop: '1px solid #F3F4F6', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => onRequestStock(bank)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 8,
                    border: '1px solid #DB3654',
                    background: '#FFFFFF',
                    color: '#DB3654',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Request from this Bank &rarr;
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
