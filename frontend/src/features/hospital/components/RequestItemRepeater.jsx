import React from 'react';
import { Plus, Trash2, Droplets } from 'lucide-react';

const BLOOD_GROUPS = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'];
const COMPONENT_OPTIONS = [
  { code: 'RBC', label: 'Red Blood Cells (RBC)' },
  { code: 'PLASMA', label: 'Plasma' },
  { code: 'PLATELETS', label: 'Platelets' },
];

export function RequestItemRepeater({ items = [], onChange = () => {} }) {
  const handleItemChange = (index, field, value) => {
    const updated = items.map((item, idx) => {
      if (idx === index) {
        return {
          ...item,
          [field]: field === 'unitsRequested' ? Math.max(1, parseInt(value, 10) || 1) : value,
        };
      }
      return item;
    });
    onChange(updated);
  };

  const handleAddItem = () => {
    if (items.length >= 10) return;
    onChange([
      ...items,
      { bloodTypeCode: 'O+', componentCode: 'RBC', unitsRequested: 1 },
    ]);
  };

  const handleRemoveItem = (index) => {
    if (items.length <= 1) return;
    onChange(items.filter((_, idx) => idx !== index));
  };

  return (
    <div className="request-items-repeater" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <label style={{ fontSize: 13, fontWeight: 700, color: '#1D3043', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Droplets size={16} color="#DB3654" />
          Requested Blood Components ({items.length})
        </label>
        {items.length < 10 && (
          <button
            type="button"
            onClick={handleAddItem}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 12,
              fontWeight: 600,
              padding: '4px 10px',
              borderRadius: 8,
              border: '1px solid #DB3654',
              color: '#DB3654',
              background: '#FFF0F2',
              cursor: 'pointer',
            }}
          >
            <Plus size={14} /> Add Component
          </button>
        )}
      </div>

      {items.map((item, idx) => (
        <div
          key={idx}
          style={{
            display: 'grid',
            gridTemplateColumns: '1.2fr 2fr 1fr auto',
            gap: 12,
            alignItems: 'center',
            padding: '12px 14px',
            borderRadius: 12,
            backgroundColor: '#F7F9FC',
            border: '1px solid #E8ECF2',
          }}
        >
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#7A8B9E', marginBottom: 4 }}>
              Blood Group
            </label>
            <select
              value={item.bloodTypeCode}
              onChange={(e) => handleItemChange(idx, 'bloodTypeCode', e.target.value)}
              className="dash-input"
              style={{ width: '100%', padding: '8px 10px', borderRadius: 8, fontSize: 13 }}
            >
              {BLOOD_GROUPS.map((bg) => (
                <option key={bg} value={bg}>{bg}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#7A8B9E', marginBottom: 4 }}>
              Component Type
            </label>
            <select
              value={item.componentCode}
              onChange={(e) => handleItemChange(idx, 'componentCode', e.target.value)}
              className="dash-input"
              style={{ width: '100%', padding: '8px 10px', borderRadius: 8, fontSize: 13 }}
            >
              {COMPONENT_OPTIONS.map((opt) => (
                <option key={opt.code} value={opt.code}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#7A8B9E', marginBottom: 4 }}>
              Units (Pints)
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={item.unitsRequested}
              onChange={(e) => handleItemChange(idx, 'unitsRequested', e.target.value)}
              className="dash-input"
              style={{ width: '100%', padding: '8px 10px', borderRadius: 8, fontSize: 13 }}
              required
            />
          </div>

          <div style={{ paddingTop: 18 }}>
            <button
              type="button"
              onClick={() => handleRemoveItem(idx)}
              disabled={items.length <= 1}
              style={{
                background: 'none',
                border: 'none',
                color: items.length <= 1 ? '#D1D5DB' : '#EF4444',
                cursor: items.length <= 1 ? 'not-allowed' : 'pointer',
                padding: 6,
                display: 'flex',
                alignItems: 'center',
              }}
              title="Remove item"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
