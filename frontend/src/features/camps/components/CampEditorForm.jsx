import React, { useState, useEffect } from 'react';
import {
  CalendarDays,
  Building,
  Users,
  FileText,
  Phone,
  CheckCircle,
  AlertCircle,
  Loader2,
  Save,
  Send,
} from 'lucide-react';
import { CampLocationSelector } from './CampLocationSelector.jsx';
import { CampPosterUpload } from './CampPosterUpload.jsx';
import { campsApi } from '../api/campsApi.js';
import { apiClient } from '../../../lib/api.js';

export function CampEditorForm({ initialCamp = null, onSuccess, onCancel }) {
  const isEditing = Boolean(initialCamp?.camp_id || initialCamp?.id);

  // Form State
  const [title, setTitle] = useState(initialCamp?.title || '');
  const [description, setDescription] = useState(initialCamp?.description || '');
  const [organizerId, setOrganizerId] = useState(initialCamp?.organizer_id || '');
  const [bloodBankId, setBloodBankId] = useState(initialCamp?.blood_bank_id || '');
  const [publicContact, setPublicContact] = useState(initialCamp?.public_contact || '');

  // Schedule & Capacity
  const [startsAt, setStartsAt] = useState(
    initialCamp?.starts_at ? new Date(initialCamp.starts_at).toISOString().slice(0, 16) : ''
  );
  const [endsAt, setEndsAt] = useState(
    initialCamp?.ends_at ? new Date(initialCamp.ends_at).toISOString().slice(0, 16) : ''
  );
  const [capacity, setCapacity] = useState(initialCamp?.capacity || 100);

  // Venue & Location State
  const [venueType, setVenueType] = useState(initialCamp?.location_id ? 'INSTITUTION' : 'COMMUNITY');
  const [locationId, setLocationId] = useState(initialCamp?.location_id || null);
  const [customLocation, setCustomLocation] = useState({
    provinceCode: initialCamp?.province_code || 'WP',
    districtCode: initialCamp?.district_code || 'CO',
    dsCode: initialCamp?.ds_code || '',
    town: initialCamp?.town || '',
    addressLine: initialCamp?.venue_address || '',
  });

  // Poster Upload State
  const [posterData, setPosterData] = useState({
    base64Data: initialCamp?.primary_poster_url || null,
    originalName: '',
    altText: initialCamp?.primary_poster_alt || '',
  });

  // Dropdown options
  const [organizers, setOrganizers] = useState([]);
  const [bloodBanks, setBloodBanks] = useState([]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function loadOptions() {
      try {
        const [orgRes, bankRes] = await Promise.all([
          campsApi.listOrganizers().catch(() => ({ data: [] })),
          apiClient.get('/locations/blood-banks').catch(() => ({ data: [] })),
        ]);
        if (mounted) {
          setOrganizers(orgRes.data || []);
          setBloodBanks(bankRes.data || []);
          if (!organizerId && orgRes.data?.[0]?.id) {
            setOrganizerId(orgRes.data[0].id);
          }
          if (!bloodBankId && bankRes.data?.[0]?.id) {
            setBloodBankId(bankRes.data[0].id);
          }
        }
      } catch {}
    }
    loadOptions();
    return () => { mounted = false; };
  }, []);

  const handleSubmit = async (submitForApproval = false) => {
    setError(null);
    setSuccess(null);

    if (!title.trim()) {
      setError('Camp title is required');
      return;
    }
    if (!organizerId) {
      setError('Please select a registered organizer');
      return;
    }
    if (!bloodBankId) {
      setError('Please select a coordinating blood bank');
      return;
    }
    if (!startsAt || !endsAt) {
      setError('Start and end date/time are required');
      return;
    }
    if (new Date(endsAt) <= new Date(startsAt)) {
      setError('End date/time must be after start date/time');
      return;
    }
    if (venueType === 'INSTITUTION' && !locationId) {
      setError('Please select an institution location');
      return;
    }
    if (venueType === 'COMMUNITY' && (!customLocation.districtCode || !customLocation.town.trim())) {
      setError('District and Town/Locality are required for community venues');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || undefined,
        organizerId: Number(organizerId),
        bloodBankId: Number(bloodBankId),
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
        capacity: capacity ? Number(capacity) : null,
        publicContact: publicContact.trim() || undefined,
      };

      if (venueType === 'INSTITUTION') {
        payload.locationId = Number(locationId);
      } else {
        payload.customLocation = {
          districtCode: customLocation.districtCode,
          dsCode: customLocation.dsCode || undefined,
          town: customLocation.town.trim(),
          addressLine: customLocation.addressLine.trim() || undefined,
        };
      }

      let camp;
      if (isEditing) {
        camp = await campsApi.updateCamp(initialCamp.camp_id || initialCamp.id, payload);
      } else {
        camp = await campsApi.createCamp(payload);
      }

      const campId = camp.data?.id || camp.data?.camp_id || camp.id;

      // Attach poster image if new image was chosen
      if (posterData.base64Data && posterData.base64Data.startsWith('data:')) {
        await campsApi.attachMedia(campId, {
          base64Data: posterData.base64Data,
          originalName: posterData.originalName,
          altText: posterData.altText,
          isPrimary: true,
        }).catch(() => {});
      }

      // Submit if requested
      if (submitForApproval) {
        await campsApi.submitCamp(campId);
      }

      setSuccess(
        submitForApproval
          ? 'Camp created and submitted for verification approval!'
          : 'Camp draft saved successfully.'
      );

      if (onSuccess) onSuccess(camp.data || camp);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to save donation camp');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit(false);
      }}
      style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}
    >
      {error && (
        <div style={{ padding: '12px', backgroundColor: '#fef2f2', color: '#991b1b', borderRadius: '8px', border: '1px solid #fecaca', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {success && (
        <div style={{ padding: '12px', backgroundColor: '#ecfdf5', color: '#065f46', borderRadius: '8px', border: '1px solid #a7f3d0', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
          <CheckCircle size={18} />
          {success}
        </div>
      )}

      {/* Section A: Camp Information */}
      <div style={{ padding: '20px', backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '1.05rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileText size={18} color="#ef4444" />
          A. Camp Information
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
          {/* Title */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', gridColumn: '1 / -1' }}>
            <label htmlFor="camp-title" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>
              Camp Title <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              id="camp-title"
              type="text"
              placeholder="e.g. Maharagama Annual Lions Club Blood Drive"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              required
            />
          </div>

          {/* Organizer */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label htmlFor="camp-organizer" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>
              Community Organizer <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <select
              id="camp-organizer"
              value={organizerId}
              onChange={(e) => setOrganizerId(e.target.value)}
              style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              required
            >
              <option value="">-- Select Organizer --</option>
              {organizers.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name} {org.is_verified ? '✓ (Verified)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Coordinating Blood Bank */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label htmlFor="camp-bank" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>
              Coordinating Blood Bank <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <select
              id="camp-bank"
              value={bloodBankId}
              onChange={(e) => setBloodBankId(e.target.value)}
              style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              required
            >
              <option value="">-- Select Blood Bank --</option>
              {bloodBanks.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Public Contact */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', gridColumn: '1 / -1' }}>
            <label htmlFor="camp-contact" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>
              Public Contact Information (Optional)
            </label>
            <input
              id="camp-contact"
              type="text"
              placeholder="e.g. 011-2850253 / info@lionsclub.lk"
              value={publicContact}
              onChange={(e) => setPublicContact(e.target.value)}
              style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            />
          </div>

          {/* Description */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', gridColumn: '1 / -1' }}>
            <label htmlFor="camp-desc" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>
              Camp Description / Donor Instructions
            </label>
            <textarea
              id="camp-desc"
              rows={3}
              placeholder="Provide briefing notes for donors: eligibility reminders, parking instructions, special arrangements..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            />
          </div>
        </div>
      </div>

      {/* Section B: Venue Type & Location */}
      <div style={{ padding: '20px', backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '1.05rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Building size={18} color="#ef4444" />
          B. Venue & Sri Lankan Geographic Location
        </h3>
        <CampLocationSelector
          venueType={venueType}
          setVenueType={setVenueType}
          locationId={locationId}
          setLocationId={setLocationId}
          customLocation={customLocation}
          setCustomLocation={setCustomLocation}
          disabled={loading}
        />
      </div>

      {/* Section C: Schedule & Capacity */}
      <div style={{ padding: '20px', backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '1.05rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CalendarDays size={18} color="#ef4444" />
          C. Schedule & Capacity
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          {/* Start Time */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label htmlFor="camp-start" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>
              Start Date & Time <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              id="camp-start"
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              required
            />
          </div>

          {/* End Time */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label htmlFor="camp-end" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>
              End Date & Time <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              id="camp-end"
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              required
            />
          </div>

          {/* Target Capacity */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label htmlFor="camp-capacity" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>
              Target Capacity / Donor Seats <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              id="camp-capacity"
              type="number"
              min="10"
              max="1000"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              required
            />
          </div>
        </div>
      </div>

      {/* Section D: Camp Poster */}
      <div style={{ padding: '20px', backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
        <CampPosterUpload
          posterData={posterData}
          setPosterData={setPosterData}
          disabled={loading}
        />
      </div>

      {/* Section E: Actions */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', flexWrap: 'wrap' }}>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            style={{
              padding: '10px 18px',
              backgroundColor: '#f1f5f9',
              color: '#475569',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '10px 20px',
            backgroundColor: '#ffffff',
            color: '#0f172a',
            border: '1px solid #94a3b8',
            borderRadius: '6px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Save Draft
        </button>

        <button
          type="button"
          disabled={loading}
          onClick={() => handleSubmit(true)}
          style={{
            padding: '10px 22px',
            backgroundColor: '#dc2626',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          Submit for Approval
        </button>
      </div>
    </form>
  );
}
