import React from 'react';
import { ArrowLeft, CalendarDays } from 'lucide-react';
import { CampEditorForm } from '../components/CampEditorForm.jsx';

export function CreateCampPage({ initialCamp = null, onBack, onSuccess }) {
  const isEditing = Boolean(initialCamp);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <button
        type="button"
        onClick={onBack}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          background: 'none',
          border: 'none',
          color: '#64748b',
          cursor: 'pointer',
          fontWeight: 600,
          fontSize: '0.875rem',
          alignSelf: 'flex-start',
        }}
      >
        <ArrowLeft size={16} /> Back to Camp Management
      </button>

      <div>
        <h2 style={{ margin: 0, fontSize: '1.4rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CalendarDays size={24} color="#dc2626" />
          {isEditing ? 'Edit Donation Camp' : 'Create New Donation Camp'}
        </h2>
        <p style={{ margin: '4px 0 0 0', fontSize: '0.875rem', color: '#64748b' }}>
          {isEditing
            ? 'Update draft camp parameters before verification approval.'
            : 'Fill in the camp details, venue, dates, target donor capacity, and optional promotional poster.'}
        </p>
      </div>

      <CampEditorForm
        initialCamp={initialCamp}
        onCancel={onBack}
        onSuccess={onSuccess || onBack}
      />
    </div>
  );
}
