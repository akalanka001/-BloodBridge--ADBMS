import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Building2,
  Plus,
  X,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Loader2,
  Info,
} from 'lucide-react';
import { donorApi } from '../api/donorApi.js';
import { Pagination } from '../../../components/ui/Pagination.jsx';

export function DonorAppointmentsPage({ token, onBookSuccess }) {
  const [appointments, setAppointments] = useState([]);
  const [appointmentTotal, setAppointmentTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [bloodBanks, setBloodBanks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [bloodBankId, setBloodBankId] = useState('');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [timeSlot, setTimeSlot] = useState('09:30 - 10:00');
  const [donationType, setDonationType] = useState('WHOLE_BLOOD');
  const [notes, setNotes] = useState('');

  const loadData = async (pageToLoad = page) => {
    setLoading(true);
    try {
      const [apptRes, bbRes] = await Promise.all([
        donorApi.getAppointments(token, { limit: pageSize, offset: (pageToLoad - 1) * pageSize }),
        donorApi.getBloodBanks(token).catch(() => ({ data: [] })),
      ]);
      setAppointments(apptRes.data || []);
      setAppointmentTotal(apptRes.pagination?.total || 0);
      setBloodBanks(bbRes.data || []);
      if (bbRes.data && bbRes.data.length > 0 && !bloodBankId) {
        setBloodBankId(bbRes.data[0].id.toString());
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(page); }, [token, page]);

  const handleBook = async (e) => {
    e.preventDefault();
    if (!bloodBankId || !appointmentDate || !timeSlot) {
      setError('Please select a blood bank, date, and time slot.');
      return;
    }
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      await donorApi.bookAppointment(
        {
          bloodBankId: Number(bloodBankId),
          appointmentDate,
          timeSlot,
          donationType,
          notes: notes.trim() || undefined,
        },
        token,
      );
      setSuccess('Appointment successfully scheduled!');
      setShowModal(false);
      setNotes('');
      setPage(1);
      loadData(1);
      if (onBookSuccess) onBookSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (apptId) => {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) return;
    try {
      await donorApi.cancelAppointment(apptId, token);
      loadData();
    } catch (err) {
      alert(`Could not cancel appointment: ${err.message}`);
    }
  };

  // Min appointment date: tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDateStr = tomorrow.toISOString().split('T')[0];

  const timeSlots = [
    '08:30 - 09:00',
    '09:00 - 09:30',
    '09:30 - 10:00',
    '10:30 - 11:00',
    '11:00 - 11:30',
    '13:30 - 14:00',
    '14:00 - 14:30',
    '15:00 - 15:30',
  ];

  return (
    <div className="donor-appointments-page">
      <div className="appointments-header-row">
        <div>
          <h2 className="page-heading">Donation Appointments</h2>
          <p className="page-subheading">
            Schedule visits to verified regional blood banks or check-in for registered slots.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="btn-primary inline-flex items-center gap-2"
        >
          <Plus size={18} />
          Book Appointment
        </button>
      </div>

      {success && (
        <div className="alert-box alert-success mb-4 flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="alert-box alert-danger mb-4 flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Notice box */}
      <div className="appointment-disclaimer-banner mb-6">
        <Info size={18} className="text-blue-600 flex-shrink-0" />
        <p className="text-xs text-blue-900 leading-relaxed">
          <strong>Clinical reminder:</strong> Booking an appointment reserves your evaluation slot but does not bypass medical screening.
          Hemoglobin assessment, medical history review, and blood pressure checks are conducted in-person by staff prior to donation.
        </p>
      </div>

      {/* Appointments List */}
      {loading ? (
        <div className="loading-state-box">
          <Loader2 size={28} className="animate-spin text-rose-600 mx-auto" />
          <p className="text-sm text-slate-500 mt-2">Loading your appointments...</p>
        </div>
      ) : appointments.length === 0 ? (
        <div className="empty-appointments-card">
          <Calendar size={36} className="text-slate-400 mx-auto" />
          <h4 className="text-base font-bold text-navy mt-3">No upcoming appointments scheduled</h4>
          <p className="text-slate-500 text-sm max-w-sm mx-auto mt-1">
            Choose your preferred blood bank and time slot to book your next donation visit.
          </p>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="btn-primary mt-4 inline-flex items-center gap-2"
          >
            <Plus size={16} />
            Schedule Visit Now
          </button>
        </div>
      ) : (
        <div className="appointments-list-grid">
          {appointments.map((appt) => {
            const isBooked = appt.status === 'BOOKED';
            const statusClass =
              appt.status === 'BOOKED'
                ? 'status-booked'
                : appt.status === 'COMPLETED'
                ? 'status-completed'
                : 'status-cancelled';

            return (
              <div key={appt.id} className="appointment-card">
                <div className="appt-card-top">
                  <div className="appt-facility-info">
                    <Building2 size={18} className="text-rose-600 flex-shrink-0" />
                    <div>
                      <h4 className="appt-facility-name">
                        {appt.blood_bank_name || appt.camp_title || 'Regional Blood Center'}
                      </h4>
                      <span className="appt-type-tag">{appt.donation_type.replace('_', ' ')}</span>
                    </div>
                  </div>
                  <span className={`appt-status-pill ${statusClass}`}>{appt.status}</span>
                </div>

                <div className="appt-card-details">
                  <div className="appt-detail-row">
                    <Calendar size={14} className="text-slate-400" />
                    <span>
                      {new Date(appt.appointment_date).toLocaleDateString('en-GB', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  <div className="appt-detail-row">
                    <Clock size={14} className="text-slate-400" />
                    <span>{appt.time_slot}</span>
                  </div>
                </div>

                {appt.notes && (
                  <div className="appt-notes-box">
                    <span className="text-xs text-slate-500 font-medium">Note:</span> {appt.notes}
                  </div>
                )}

                {isBooked && (
                  <div className="appt-card-footer">
                    <button
                      type="button"
                      onClick={() => handleCancel(appt.id)}
                      className="btn-cancel-appt text-rose-600 hover:text-rose-800 text-xs inline-flex items-center gap-1 font-semibold"
                    >
                      <Trash2 size={13} />
                      Cancel Appointment
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Pagination page={page} pageSize={pageSize} total={appointmentTotal} onPageChange={setPage} loading={loading} />

      {/* Booking Modal */}
      {showModal && (
        <div className="modal-backdrop-overlay">
          <div className="modal-content-card">
            <div className="modal-header">
              <h3 className="modal-title">Book Donation Appointment</h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="btn-close-modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleBook} className="modal-form-body">
              <div className="form-group">
                <label className="form-label">Select Blood Bank *</label>
                <select
                  value={bloodBankId}
                  onChange={(e) => setBloodBankId(e.target.value)}
                  required
                  className="form-control"
                >
                  <option value="">-- Choose a blood bank --</option>
                  {bloodBanks.map((bb) => (
                    <option key={bb.id} value={bb.id}>
                      {bb.name} ({bb.district_name || bb.district_code || 'Sri Lanka'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">Date *</label>
                  <input
                    type="date"
                    min={minDateStr}
                    value={appointmentDate}
                    onChange={(e) => setAppointmentDate(e.target.value)}
                    required
                    className="form-control"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Time Slot *</label>
                  <select
                    value={timeSlot}
                    onChange={(e) => setTimeSlot(e.target.value)}
                    required
                    className="form-control"
                  >
                    {timeSlots.map((ts) => (
                      <option key={ts} value={ts}>
                        {ts}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Donation Type</label>
                <select
                  value={donationType}
                  onChange={(e) => setDonationType(e.target.value)}
                  className="form-control"
                >
                  <option value="WHOLE_BLOOD">Whole Blood Donation</option>
                  <option value="PLATELETS">Platelets (Apheresis)</option>
                  <option value="PLASMA">Plasma (Apheresis)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Optional Notes for Staff</label>
                <textarea
                  rows={2}
                  maxLength={300}
                  placeholder="e.g. First-time donor or morning time preference"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="form-control"
                />
              </div>

              <div className="modal-footer-actions">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary inline-flex items-center gap-2"
                >
                  {submitting && <Loader2 size={16} className="animate-spin" />}
                  Confirm Booking
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
