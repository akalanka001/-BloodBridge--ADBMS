import React from 'react';
import { ShieldCheck, Lock, History } from 'lucide-react';
import { AvailabilityToggle } from '../components/AvailabilityToggle.jsx';
import { ConsentPreferencesForm } from '../components/ConsentPreferencesForm.jsx';

export function PrivacyPreferencesPage({
  profile,
  onSavePreferences,
  onToggleAvailability,
  saving = false,
}) {
  const isAvailable = Boolean(profile?.available_for_contact);

  return (
    <div className="privacy-preferences-page max-w-4xl">
      <div className="page-header-row mb-6">
        <div>
          <h2 className="page-heading">Privacy & Donation Preferences</h2>
          <p className="page-subheading">
            Manage your donor visibility, emergency contact permissions, and communication channels.
          </p>
        </div>
      </div>

      {/* Prominent Availability Toggle */}
      <div className="mb-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <AvailabilityToggle
          isAvailable={isAvailable}
          onToggle={onToggleAvailability}
          loading={saving}
        />
      </div>

      {/* Full Granular Consent Form */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <ConsentPreferencesForm
          preferences={profile}
          onSave={onSavePreferences}
          saving={saving}
        />
      </div>

      {/* Audit Trail Information Banner */}
      <div className="audit-info-banner mt-6 p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
        <History size={18} className="text-slate-500 mt-0.5 flex-shrink-0" />
        <div className="text-xs text-slate-600 leading-relaxed">
          <strong>Immutable Consent Audit Log:</strong> Under BloodBridge donor privacy protections,
          all updates to your availability and contact consents trigger an automated entry in the PostgreSQL
          audit ledger (`donor_consent_history`). Authorized clinical staff can verify your active permissions at the time of outreach.
        </div>
      </div>
    </div>
  );
}
