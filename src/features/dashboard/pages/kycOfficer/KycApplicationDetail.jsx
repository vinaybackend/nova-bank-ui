import { useCallback, useEffect, useMemo, useState } from 'react';
import { getSavedAuthUser } from '../../../../services/apiClient';
import {
  fetchAllKyc,
  fetchCustomerById,
  changeKycStatus,
  fetchKycDocument,
} from '../../../../services/kycOfficerService';
import './KycApplicationDetail.css';

/* ---------- Helpers ---------- */

const getId = (item) => item?.kycId ?? item?.id ?? '';
const getStatus = (item) =>
  String(item?.verificationStatus ?? 'PENDING').toUpperCase();
const statusLabel = (s) => String(s || '').replaceAll('_', ' ');
const statusTone = (status) =>
  ({
    PENDING: 'pending',
    UNDER_REVIEW: 'review',
    APPROVED: 'approved',
    REJECTED: 'rejected',
  }[status] || 'pending');

const formatDate = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime())
    ? String(v)
    : d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
};

const formatCurrency = (v) => {
  if (v == null || v === '') return '—';
  const n = Number(v);
  return Number.isNaN(n)
    ? String(v)
    : new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
      }).format(n);
};

const orDash = (v) => (v == null || v === '' ? '—' : String(v));

function getReviewerId() {
  const user = getSavedAuthUser();
  return user?.email ?? user?.id ?? user?.userId ?? '';
}

/* ---------- Reusable subcomponents ---------- */

function Panel({ icon, title, subtitle, action, children }) {
  return (
    <section className="kyc-panel">
      <header className="kyc-panel-head">
        <div className="kyc-panel-head-left">
          {icon && <span className="kyc-panel-icon">{icon}</span>}
          <div>
            <h2 className="kyc-panel-title">{title}</h2>
            {subtitle && <p className="kyc-panel-sub">{subtitle}</p>}
          </div>
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

function ProfileItem({ label, value, full }) {
  return (
    <div className={`kyc-profile-item${full ? ' full' : ''}`}>
      <dt>{label}</dt>
      <dd>{orDash(value)}</dd>
    </div>
  );
}

/* ---------- Main page ---------- */

export default function KycApplicationDetail({ kycId, onBack, onUpdate }) {
  const [application, setApplication] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [docLoadingId, setDocLoadingId] = useState('');
  const [docError, setDocError] = useState('');
  const [docModal, setDocModal] = useState(null);

  const [nextStatus, setNextStatus] = useState('UNDER_REVIEW');
  const [remarks, setRemarks] = useState('');
  const [saving, setSaving] = useState(false);

  const [checks, setChecks] = useState({
    customerReviewed: false,
    panVerified: false,
    aadhaarVerified: false,
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const rows = await fetchAllKyc();
      const found = rows.find((x) => String(getId(x)) === String(kycId));
      if (!found) {
        setError('Application not found.');
        return;
      }
      setApplication(found);
      setNextStatus(getStatus(found));

      if (found.customerId) {
        try {
          const cust = await fetchCustomerById(found.customerId);
          setCustomer(cust);
        } catch {
          setCustomer(null);
        }
      }
    } catch (err) {
      setError(err.message || 'Unable to load application.');
    } finally {
      setLoading(false);
    }
  }, [kycId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    return () => {
      if (docModal?.url) URL.revokeObjectURL(docModal.url);
    };
  }, [docModal]);

  async function openDocument(doc) {
    if (!application || !doc?.documentId) return;
    setDocLoadingId(doc.documentId);
    setDocError('');
    try {
      const blob = await fetchKycDocument(getId(application), doc.documentId);
      const url = URL.createObjectURL(blob);
      const type = (doc.fileName || '').toLowerCase().endsWith('.pdf') ? 'pdf' : 'image';
      setDocModal((prev) => {
        if (prev?.url) URL.revokeObjectURL(prev.url);
        return {
          name: doc.fileName || doc.documentType || 'KYC document',
          url,
          type,
        };
      });

      if (String(doc.documentType || '').toUpperCase().includes('PAN')) {
        setChecks((c) => ({ ...c, panVerified: true }));
      }
      if (String(doc.documentType || '').toUpperCase().includes('AADHAAR')) {
        setChecks((c) => ({ ...c, aadhaarVerified: true }));
      }
    } catch (err) {
      setDocError(err.message || 'Unable to open document.');
    } finally {
      setDocLoadingId('');
    }
  }

  function closeDocModal() {
    setDocModal((prev) => {
      if (prev?.url) URL.revokeObjectURL(prev.url);
      return null;
    });
  }

  async function submitStatus(e) {
    e.preventDefault();
    if (!application || saving) return;

    if (!['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED'].includes(nextStatus)) {
      setError('Please select a valid status.');
      return;
    }
    if (nextStatus === 'REJECTED' && !remarks.trim()) {
      setError('A rejection reason is required when rejecting an application.');
      return;
    }
    const reviewerId = getReviewerId();
    if (!reviewerId) {
      setError('Reviewer ID is missing from the session. Please sign in again.');
      return;
    }
    if (!window.confirm(`Change ${getId(application)} to ${statusLabel(nextStatus)}?`)) return;

    setSaving(true);
    setError('');
    setMessage('');
    try {
      await changeKycStatus({
        kycId: getId(application),
        verificationStatus: nextStatus,
        reviewerId,
        rejectionReason: nextStatus === 'REJECTED' ? remarks.trim() : null,
      });
      setMessage(`Status updated to ${statusLabel(nextStatus)}.`);
      
      if (onUpdate) onUpdate();

      await load();
      setRemarks('');
      setChecks({ customerReviewed: true, panVerified: true, aadhaarVerified: true });
    } catch (err) {
      setError(err.message || 'Unable to update status.');
    } finally {
      setSaving(false);
    }
  }

  // ✨ FIXED: Now uses the `name` field from your DTO
  const fullName = useMemo(() => {
    if (!customer) return '—';
    return customer.name || customer.customerName || customer.email || '—';
  }, [customer]);

  const documents = Array.isArray(application?.documents) ? application.documents : [];

  if (loading) {
    return (
      <div className="kyc-verify-page" style={{ background: 'transparent', padding: 0 }}>
        <div className="kyc-verify-container">
          <div className="kyc-state">Loading application…</div>
        </div>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="kyc-verify-page" style={{ background: 'transparent', padding: 0 }}>
        <div className="kyc-verify-container">
          <button className="kyc-back-btn" onClick={onBack}>← Back to Dashboard</button>
          <div className="kyc-state-error">{error || 'Not found.'}</div>
        </div>
      </div>
    );
  }

  const currentStatus = getStatus(application);

  return (
    <div className="kyc-verify-page" style={{ background: 'transparent', padding: 0 }}>
      <div className="kyc-verify-container">
        {/* Breadcrumb */}
        <nav className="kyc-breadcrumb" aria-label="Breadcrumb">
          <button onClick={onBack}>Dashboard</button>
          <span className="sep">›</span>
          <button onClick={onBack}>KYC</button>
          <span className="sep">›</span>
          <span className="current">Application Review</span>
        </nav>

        {/* Header */}
        <header className="kyc-page-header">
          <div>
            <button className="kyc-back-btn" onClick={onBack} style={{ marginBottom: '12px', display: 'inline-flex' }}>
              ← Back to Dashboard
            </button>
            <h1 className="kyc-page-title">Customer Verification</h1>
            <p className="kyc-page-subtitle">Review applicant details, identity documents, and verification status in one place.</p>
          </div>
          <div className="kyc-page-header-right">
            <span className={`kyc-status-pill ${statusTone(currentStatus)}`}>
              <span className="dot" />
              {statusLabel(currentStatus)}
            </span>
            <span className="kyc-app-id">Application ID · {getId(application)}</span>
          </div>
        </header>

        {error && (
          <div className="kyc-state-error" role="alert">
            {error}
            <button onClick={() => setError('')}>Dismiss</button>
          </div>
        )}
        {message && <div className="kyc-state-success">{message}</div>}
        {docError && (
          <div className="kyc-state-error" role="alert">
            {docError}
            <button onClick={() => setDocError('')}>Dismiss</button>
          </div>
        )}

        {/* Summary strip */}
        <section className="kyc-summary-strip">
          <div className="kyc-summary-cell">
            <span className="kyc-summary-icon">👤</span>
            <div className="kyc-summary-text">
              <span className="kyc-summary-label">Applicant</span>
              <span className="kyc-summary-value">{fullName}</span>
            </div>
          </div>
          <div className="kyc-summary-cell">
            <span className="kyc-summary-icon">✉</span>
            <div className="kyc-summary-text">
              <span className="kyc-summary-label">Email</span>
              <span className="kyc-summary-value">{orDash(customer?.email)}</span>
            </div>
          </div>
          <div className="kyc-summary-cell">
            <span className="kyc-summary-icon">☎</span>
            <div className="kyc-summary-text">
              <span className="kyc-summary-label">Mobile</span>
              <span className="kyc-summary-value">{orDash(customer?.mobileNumber)}</span>
            </div>
          </div>
          <div className="kyc-summary-cell">
            <span className="kyc-summary-icon">🛡</span>
            <div className="kyc-summary-text">
              <span className="kyc-summary-label">Current KYC status</span>
              <span className="kyc-summary-value">{statusLabel(currentStatus)}</span>
            </div>
          </div>
        </section>

        {/* Two-column body */}
        <div className="kyc-verify-grid">
          {/* LEFT column */}
          <div className="kyc-verify-left">
            {/* Customer profile */}
            <Panel icon="👤" title="Customer profile" subtitle="Details submitted by the applicant during account opening">
              {customer ? (
                <dl className="kyc-profile-grid">
                  {/* ✨ FIXED: Uses the new DTO fields */}
                  <ProfileItem label="Full name" value={fullName} />
                  <ProfileItem label="Email" value={customer.email} />
                  <ProfileItem label="Mobile" value={customer.mobileNumber} />
                  <ProfileItem label="Alternate mobile" value={customer.alternateMobileNumber} />
                  <ProfileItem label="Date of birth" value={formatDate(customer.dateOfBirth)} />
                  <ProfileItem label="Gender" value={customer.gender} />
                  <ProfileItem label="Nationality" value={customer.nationality} />
                  <ProfileItem label="Marital status" value={customer.maritalStatus} />
                  <ProfileItem label="Occupation" value={customer.occupation} />
                  <ProfileItem label="Annual income" value={formatCurrency(customer.annualIncome)} />
                  <ProfileItem label="Source of income" value={customer.sourceOfIncome} />
                  <ProfileItem label="Language" value={customer.language} />
                  <ProfileItem
                    label="Permanent address"
                    value={[customer.permanentAddress, customer.permanentCity, customer.permanentState, customer.permanentCountry, customer.permanentPinCode].filter(Boolean).join(', ')}
                    full
                  />
                  <ProfileItem
                    label="Communication address"
                    value={[customer.communicationAddress, customer.communicationCity, customer.communicationState, customer.communicationCountry, customer.communicationPinCode].filter(Boolean).join(', ') || 'Same as permanent'}
                    full
                  />
                </dl>
              ) : (
                <p className="kyc-panel-sub">Customer profile could not be loaded.</p>
              )}
            </Panel>

            {/* Identity documents */}
            <Panel icon="▧" title="Identity documents" subtitle="Click View Document to open the file in a secure preview">
              {documents.length === 0 ? (
                <p className="kyc-panel-sub">No documents were attached to this application.</p>
              ) : (
                <div className="kyc-doc-grid">
                  {documents.map((doc, index) => (
                    <article className="kyc-doc-card" key={doc.documentId ?? index}>
                      <span className="kyc-doc-icon">▧</span>
                      <div className="kyc-doc-info">
                        <span className="kyc-doc-name">{doc.documentType || 'Document'}</span>
                        <span className="kyc-doc-file">{doc.fileName || 'Uploaded file'}</span>
                      </div>
                      <button type="button" className="kyc-doc-view" onClick={() => openDocument(doc)} disabled={docLoadingId === doc.documentId}>
                        {docLoadingId === doc.documentId ? 'Loading…' : <><span>👁</span> View Document</>}
                      </button>
                    </article>
                  ))}
                </div>
              )}
            </Panel>
          </div>

          {/* RIGHT column */}
          <div className="kyc-verify-right">
            {/* Verification decision */}
            <Panel icon="🛡" title="Verification decision" subtitle="Set a new status and provide remarks if required">
              <div className="kyc-decision-current">
                <span className="kyc-decision-current-label">Current status</span>
                <span className={`kyc-decision-current-value ${statusTone(currentStatus)}`}>
                  {statusLabel(currentStatus)}
                </span>
              </div>

              <form onSubmit={submitStatus}>
                <div className="kyc-form-field">
                  <label className="kyc-form-label" htmlFor="kyc-next-status">New status</label>
                  <select id="kyc-next-status" className="kyc-form-select" value={nextStatus} onChange={(e) => setNextStatus(e.target.value)} disabled={saving}>
                    <option value="PENDING">Pending</option>
                    <option value="UNDER_REVIEW">Under review</option>
                    <option value="APPROVED">Approved</option>
                    <option value="REJECTED">Rejected</option>
                  </select>
                </div>

                <div className="kyc-form-field">
                  <label className="kyc-form-label" htmlFor="kyc-remarks">
                    {nextStatus === 'REJECTED' ? 'Rejection reason (required)' : 'Review remarks'}
                  </label>
                  <textarea id="kyc-remarks" className="kyc-form-textarea" value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Add review notes…" rows={4} disabled={saving} required={nextStatus === 'REJECTED'} />
                </div>

                <button type="submit" className="kyc-form-submit" disabled={saving}>
                  💾 {saving ? 'Saving…' : 'Save status update'}
                </button>
              </form>
            </Panel>

            {/* Review checklist */}
            <Panel icon="📋" title="Review checklist">
              <ul className="kyc-checklist">
                <CheckItem done={checks.customerReviewed} label="Customer details reviewed" onToggle={() => setChecks((c) => ({ ...c, customerReviewed: !c.customerReviewed }))} />
                <CheckItem done={checks.panVerified} label="PAN document verified" onToggle={() => setChecks((c) => ({ ...c, panVerified: !c.panVerified }))} />
                <CheckItem done={checks.aadhaarVerified} label="Aadhaar document verified" onToggle={() => setChecks((c) => ({ ...c, aadhaarVerified: !c.aadhaarVerified }))} />
              </ul>

              <div className="kyc-checklist-foot">
                <div>
                  <span>🕓</span>
                  <span>Last updated <strong>{formatDate(application.updatedAt ?? application.createdAt)}</strong></span>
                </div>
                <div>
                  <span>👤</span>
                  <span>Reviewed by <strong>{orDash(application.reviewerId)}</strong></span>
                </div>
              </div>
            </Panel>
          </div>
        </div>
      </div>

      {/* Document preview modal */}
      {docModal && (
        <div className="kyc-doc-modal-backdrop" onClick={closeDocModal} role="presentation">
          <div className="kyc-doc-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={docModal.name}>
            <header className="kyc-doc-modal-head">
              <strong>{docModal.name}</strong>
              <button className="kyc-doc-modal-close" onClick={closeDocModal} aria-label="Close document preview">✕</button>
            </header>
            <div className="kyc-doc-modal-body">
              {docModal.type === 'pdf' ? <iframe title={docModal.name} src={docModal.url} loading="lazy" /> : <img src={docModal.url} alt={docModal.name} />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CheckItem({ done, label, onToggle }) {
  return (
    <li className={`kyc-check-item${done ? ' done' : ''}`} onClick={onToggle} role="checkbox" aria-checked={done} tabIndex={0} onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); onToggle(); } }} style={{ cursor: 'pointer' }}>
      <span className="kyc-check-box">{done ? '✓' : ''}</span>
      <span>{label}</span>
    </li>
  );
}