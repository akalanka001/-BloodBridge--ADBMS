import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  Link2,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  Loader2,
  Shield,
} from 'lucide-react';
import { donorApi } from '../api/donorApi.js';

export function AccountSettingsPage({ token, user }) {
  const [claims, setClaims] = useState([]);
  const [loadingClaims, setLoadingClaims] = useState(true);
  const [donorId, setDonorId] = useState('');
  const [verificationNotes, setVerificationNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [claimSuccess, setClaimSuccess] = useState('');
  const [claimError, setClaimError] = useState('');

  const loadClaims = async () => {
    setLoadingClaims(true);
    try {
      const res = await donorApi.getClaims(token);
      setClaims(res.data || []);
    } catch {
      setClaims([]);
    } finally {
      setLoadingClaims(false);
    }
  };

  useEffect(() => {
    loadClaims();
  }, [token]);

  const handleClaimSubmit = async (e) => {
    e.preventDefault();
    if (!donorId.trim()) {
      setClaimError('Please provide a valid donor reference ID.');
      return;
    }
    setSubmitting(true);
    setClaimSuccess('');
    setClaimError('');
    try {
      await donorApi.submitClaim(
        {
          donorId: donorId.trim(),
          verificationNotes: verificationNotes.trim() || undefined,
        },
        token,
      );
      setClaimSuccess('Claim submitted for administrative review! Staff will verify your records.');
      setDonorId('');
      setVerificationNotes('');
      loadClaims();
    } catch (err) {
      setClaimError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="account-settings-page max-w-4xl space-y-8">
      <div className="page-header-row">
        <div>
          <h2 className="page-heading">Account & Security Settings</h2>
          <p className="page-subheading">
            Manage your account credentials, security preferences, and link legacy offline donation records.
          </p>
        </div>
      </div>

      {/* Account Info Box */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="text-base font-bold text-navy mb-4 flex items-center gap-2">
          <Shield size={18} className="text-rose-600" />
          Authentication & Credentials
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide block">
              Registered Email
            </span>
            <span className="text-sm font-medium text-navy block mt-1">
              {user?.email || 'donor@bloodbridge.lk'}
            </span>
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide block">
              Account Role
            </span>
            <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700">
              AUTHENTICATED DONOR
            </span>
          </div>
        </div>
      </div>

      {/* Link Existing Offline Donation Record Section */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="text-base font-bold text-navy mb-2 flex items-center gap-2">
          <Link2 size={18} className="text-rose-600" />
          Link Existing Offline Donation History
        </h3>
        <p className="text-sm text-slate-500 mb-6">
          Did you donate blood at a hospital or mobile camp prior to registering online?
          Submit a linkage claim with your historical reference ID or NIC so administrative staff can verify and merge your completed collections.
        </p>

        {claimSuccess && (
          <div className="alert-box alert-success mb-4 flex items-center gap-2">
            <CheckCircle2 size={16} />
            <span>{claimSuccess}</span>
          </div>
        )}

        {claimError && (
          <div className="alert-box alert-danger mb-4 flex items-center gap-2">
            <AlertCircle size={16} />
            <span>{claimError}</span>
          </div>
        )}

        <form onSubmit={handleClaimSubmit} className="space-y-4">
          <div className="form-group">
            <label className="form-label">Existing Donor Reference UUID / Record ID *</label>
            <input
              type="text"
              placeholder="e.g. 11111111-2222-3333-4444-555555555555"
              value={donorId}
              onChange={(e) => setDonorId(e.target.value)}
              required
              className="form-control"
            />
            <span className="text-xs text-slate-400 mt-1 block">
              Can be found on your physical National Blood Transfusion Service card or donation receipt.
            </span>
          </div>

          <div className="form-group">
            <label className="form-label">Verification Notes & Details</label>
            <textarea
              rows={3}
              placeholder="Provide supporting details such as your NIC number, approximate donation years, or hospitals/camps where you previously donated."
              value={verificationNotes}
              onChange={(e) => setVerificationNotes(e.target.value)}
              className="form-control"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary inline-flex items-center gap-2"
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <Link2 size={16} />}
              Submit Linkage Claim
            </button>
          </div>
        </form>

        {/* Previous Claims Table */}
        <div className="mt-8 pt-6 border-t border-slate-100">
          <h4 className="text-sm font-bold text-navy mb-3">Submitted Linkage Claims</h4>

          {loadingClaims ? (
            <div className="text-center py-4 text-slate-400 text-sm">
              <Loader2 size={18} className="animate-spin inline mr-2" />
              Loading claims...
            </div>
          ) : claims.length === 0 ? (
            <p className="text-sm text-slate-400 italic">No previous linkage claims submitted.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 text-xs uppercase font-semibold">
                    <th className="py-2.5">Claimed Donor ID</th>
                    <th className="py-2.5">Submitted Date</th>
                    <th className="py-2.5">Status</th>
                    <th className="py-2.5">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {claims.map((c) => (
                    <tr key={c.id}>
                      <td className="py-3 font-mono text-xs text-navy">{c.donor_id}</td>
                      <td className="py-3 text-slate-500 text-xs">
                        {new Date(c.claimed_at).toLocaleDateString()}
                      </td>
                      <td className="py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            c.status === 'APPROVED'
                              ? 'bg-emerald-50 text-emerald-700'
                              : c.status === 'REJECTED'
                              ? 'bg-rose-50 text-rose-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {c.status === 'APPROVED' && <CheckCircle2 size={12} />}
                          {c.status === 'REJECTED' && <XCircle size={12} />}
                          {c.status === 'PENDING' && <Clock size={12} />}
                          {c.status}
                        </span>
                      </td>
                      <td className="py-3 text-slate-500 text-xs max-w-xs truncate">
                        {c.verification_notes || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
