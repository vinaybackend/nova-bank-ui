import { useMemo, useState } from 'react';
import branchManagerService from '../../../../services/branchManagerService';
import './BranchCustomersPage.css';

/* ---------- helpers ---------- */
const formatDate = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatDateTime = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const formatMoney = (v) => {
  if (v == null || v === '') return '—';
  const n = Number(v);
  return Number.isNaN(n) ? String(v) : new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
};

const formatValue = (v) => (v == null || v === '' ? '—' : String(v).replaceAll('_', ' '));

const statusTone = (s) => {
  const v = String(s || '').toUpperCase();
  if (['ACTIVE', 'APPROVED'].includes(v)) return 'ok';
  if (['PENDING', 'UNDER_REVIEW'].includes(v)) return 'warn';
  if (['CLOSED', 'INACTIVE', 'BLOCKED', 'REJECTED'].includes(v)) return 'bad';
  return 'neutral';
};

export default function BranchCustomersPage({ customers, loading }) {
  const [search, setSearch] = useState('');
  
  // Detail View State
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerAccounts, setCustomerAccounts] = useState([]);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState('');

  /* ---------- Derived Stats ---------- */
  const stats = useMemo(() => {
    const active = customers.filter(c => String(c.status).toUpperCase() === 'ACTIVE').length;
    const pending = customers.filter(c => String(c.status).toUpperCase() === 'PENDING').length;
    return { total: customers.length, active, pending };
  }, [customers]);

  /* ---------- Filtered List ---------- */
  const filteredCustomers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return customers;
    return customers.filter((c) => {
      const haystack = [c.customerId, c.name, c.email, c.mobileNumber].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(term);
    });
  }, [customers, search]);

  /* ---------- Open Detail View & Fetch Full Data ---------- */
  const handleOpenCustomer = async (customer) => {
    setSelectedCustomer(customer); // Show basic info instantly
    setCustomerAccounts([]);
    setProfileLoading(true);
    setProfileError('');
    
    try {
      const id = customer.customerId;
      
      // Fetch Full Profile and Accounts in parallel
      const [fullProfile, accounts] = await Promise.all([
        branchManagerService.getCustomerById(id),
        branchManagerService.getAccountsByCustomer(id).catch(() => [])
      ]);
      
      setSelectedCustomer(fullProfile);
      setCustomerAccounts(Array.isArray(accounts) ? accounts : []);
    } catch (err) {
      console.error("Failed to fetch full profile", err);
      setProfileError("Could not load full profile details.");
    } finally {
      setProfileLoading(false);
    }
  };

  return (
    <div className="bc-page">
      
      {/* CONDITIONAL RENDERING: Show Details Page OR Table */}
      {selectedCustomer ? (
        
        /* ================= FULL PAGE DETAILS VIEW ================= */
        <div className="bc-details-page">
          
          <div className="bc-details-header-top">
            <button className="bc-back-btn" onClick={() => setSelectedCustomer(null)}>
              ← Back to Customers
            </button>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
               <span className={`bm-status bm-status-${statusTone(selectedCustomer.status)}`} style={{ padding: '6px 12px', fontSize: '12px' }}>
                  {formatValue(selectedCustomer.status || 'PENDING')}
               </span>
            </div>
          </div>

          <div className="bc-details-title-area">
            <h1>
              {formatValue(selectedCustomer.title)} {selectedCustomer.name}
            </h1>
            <p>Customer ID: <b>{selectedCustomer.customerId}</b></p>
          </div>

          {/* Top Summary Bar */}
          <div className="bc-summary-bar">
            <div className="bc-summary-item">
              <div className="bc-summary-icon">👤</div>
              <div className="bc-summary-text">
                <span>Customer Name</span>
                <b>{selectedCustomer.name || '—'}</b>
              </div>
            </div>
            <div className="bc-summary-item">
              <div className="bc-summary-icon">✉️</div>
              <div className="bc-summary-text">
                <span>Email Address</span>
                <b>{selectedCustomer.email || '—'}</b>
              </div>
            </div>
            <div className="bc-summary-item">
              <div className="bc-summary-icon">📱</div>
              <div className="bc-summary-text">
                <span>Mobile Number</span>
                <b>{selectedCustomer.mobileNumber || '—'}</b>
              </div>
            </div>
            <div className="bc-summary-item">
              <div className="bc-summary-icon">🛡️</div>
              <div className="bc-summary-text">
                <span>Status</span>
                <b>{formatValue(selectedCustomer.status)}</b>
              </div>
            </div>
          </div>

          {/* Two Column Layout */}
          <div className="bc-details-grid">
            
            {/* Left Column: Profile Info */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Personal Info */}
              <div className="bc-details-panel">
                <div className="bc-details-panel-header">
                  <div className="bc-summary-icon">📋</div>
                  <div>
                    <h3>Personal Information</h3>
                    <p>Basic demographic details</p>
                  </div>
                </div>
                <div className="bc-profile-grid">
                  <div className="bc-profile-item"><span>Full Name</span><b>{selectedCustomer.name || '—'}</b></div>
                  <div className="bc-profile-item"><span>Date of Birth</span><b>{formatDate(selectedCustomer.dateOfBirth)}</b></div>
                  <div className="bc-profile-item"><span>Gender</span><b>{formatValue(selectedCustomer.gender)}</b></div>
                  <div className="bc-profile-item"><span>Marital Status</span><b>{formatValue(selectedCustomer.maritalStatus)}</b></div>
                  <div className="bc-profile-item"><span>Nationality</span><b>{selectedCustomer.nationality || '—'}</b></div>
                  <div className="bc-profile-item"><span>Language</span><b>{selectedCustomer.language || '—'}</b></div>
                </div>
              </div>

              {/* Contact Info */}
              <div className="bc-details-panel">
                <div className="bc-details-panel-header">
                  <div className="bc-summary-icon">📞</div>
                  <div>
                    <h3>Contact Information</h3>
                    <p>Email and phone numbers</p>
                  </div>
                </div>
                <div className="bc-profile-grid">
                  <div className="bc-profile-item" style={{ gridColumn: '1 / -1' }}><span>Email</span><b>{selectedCustomer.email || '—'}</b></div>
                  <div className="bc-profile-item"><span>Mobile</span><b>{selectedCustomer.mobileNumber || '—'}</b></div>
                  <div className="bc-profile-item"><span>Alternate Mobile</span><b>{selectedCustomer.alternateMobileNumber || '—'}</b></div>
                </div>
              </div>

              {/* Address Info */}
              <div className="bc-details-panel">
                <div className="bc-details-panel-header">
                  <div className="bc-summary-icon">🏠</div>
                  <div>
                    <h3>Address Details</h3>
                    <p>Permanent and communication addresses</p>
                  </div>
                </div>
                <div className="bc-profile-grid" style={{ gridTemplateColumns: '1fr' }}>
                  <div className="bc-profile-item">
                    <span>Permanent Address</span>
                    <b>{[selectedCustomer.permanentAddress, selectedCustomer.permanentCity, selectedCustomer.permanentState, selectedCustomer.permanentCountry, selectedCustomer.permanentPinCode].filter(Boolean).join(', ') || '—'}</b>
                  </div>
                  <div className="bc-profile-item">
                    <span>Communication Address</span>
                    <b>{[selectedCustomer.communicationAddress, selectedCustomer.communicationCity, selectedCustomer.communicationState, selectedCustomer.communicationCountry, selectedCustomer.communicationPinCode].filter(Boolean).join(', ') || 'Same as permanent'}</b>
                  </div>
                </div>
              </div>

              {/* Timestamps */}
              <div className="bc-details-panel">
                <div className="bc-details-panel-header">
                  <div className="bc-summary-icon">🕒</div>
                  <div>
                    <h3>System Info</h3>
                    <p>Record timestamps</p>
                  </div>
                </div>
                <div className="bc-profile-grid">
                  <div className="bc-profile-item"><span>Created At</span><b>{formatDateTime(selectedCustomer.createdAt)}</b></div>
                  <div className="bc-profile-item"><span>Last Updated</span><b>{formatDateTime(selectedCustomer.updatedAt)}</b></div>
                </div>
              </div>

            </div>

            {/* Right Column: Financial, Bank Info & Accounts */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Financial Info */}
              <div className="bc-details-panel">
                <div className="bc-details-panel-header">
                  <div className="bc-summary-icon">💼</div>
                  <div>
                    <h3>Financial Details</h3>
                    <p>Income and employment</p>
                  </div>
                </div>
                <div className="bc-profile-grid" style={{ gridTemplateColumns: '1fr' }}>
                  <div className="bc-profile-item"><span>Occupation</span><b>{selectedCustomer.occupation || '—'}</b></div>
                  <div className="bc-profile-item"><span>Annual Income</span><b>{selectedCustomer.annualIncome ? formatMoney(selectedCustomer.annualIncome) : '—'}</b></div>
                  <div className="bc-profile-item"><span>Source of Income</span><b>{formatValue(selectedCustomer.sourceOfIncome)}</b></div>
                  <div className="bc-profile-item"><span>Opening Balance</span><b>{selectedCustomer.openingBalance ? formatMoney(selectedCustomer.openingBalance) : '—'}</b></div>
                </div>
              </div>

              {/* Bank Details */}
              <div className="bc-details-panel">
                <div className="bc-details-panel-header">
                  <div className="bc-summary-icon">🏦</div>
                  <div>
                    <h3>Branch Info</h3>
                    <p>Assigned banking branch</p>
                  </div>
                </div>
                <div className="bc-profile-grid" style={{ gridTemplateColumns: '1fr' }}>
                  <div className="bc-profile-item"><span>Branch Name</span><b>{selectedCustomer.branchName || '—'}</b></div>
                  <div className="bc-profile-item"><span>Branch Code</span><b>{selectedCustomer.branchCode || '—'}</b></div>
                  <div className="bc-profile-item"><span>IFSC Code</span><b>{selectedCustomer.ifscCode || '—'}</b></div>
                </div>
              </div>

              {/* Linked Accounts */}
              <div className="bc-details-panel">
                <div className="bc-details-panel-header">
                  <div className="bc-summary-icon">💳</div>
                  <div>
                    <h3>Linked Accounts</h3>
                    <p>Active bank accounts</p>
                  </div>
                </div>
                {profileLoading ? (
                  <p style={{ fontSize: '12px', color: '#8792a5' }}>Loading accounts…</p>
                ) : customerAccounts.length === 0 ? (
                  <div style={{ padding: '16px', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '8px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                    No bank accounts opened yet.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {customerAccounts.map((acc) => (
                      <div key={acc.accountId} style={{ background: '#f8fafc', border: '1px solid #eef2f8', borderRadius: '10px', padding: '14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <b style={{ fontSize: '13px', color: '#1c2740' }}>{formatValue(acc.accountType)} Account</b>
                          <span className={`bm-status bm-status-${statusTone(acc.accountStatus)}`} style={{ fontSize: '10px', padding: '2px 8px' }}>{formatValue(acc.accountStatus)}</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                          <div className="bc-profile-item" style={{ padding: '8px' }}><span>Account No</span><b>{acc.accountNumber}</b></div>
                          <div className="bc-profile-item" style={{ padding: '8px', background: '#f0fdf4', borderColor: '#bbf7d0' }}>
                            <span style={{ color: '#158456' }}>Balance</span>
                            <b style={{ color: '#158456', fontSize: '14px' }}>{formatMoney(acc.balance)} {acc.currency}</b>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

          </div>
        </div>

      ) : (

        /* ================= MAIN TABLE VIEW ================= */
        <>
          {/* Top KPI Cards */}
          <div className="bc-stats-grid">
            <div className="bc-stat-card">
              <span>Total Customers</span>
              <b>{stats.total}</b>
            </div>
            <div className="bc-stat-card">
              <span>Active Customers</span>
              <b style={{ color: '#158456' }}>{stats.active}</b>
            </div>
            <div className="bc-stat-card">
              <span>Pending Customers</span>
              <b style={{ color: '#d97706' }}>{stats.pending}</b>
            </div>
          </div>

          {/* Main Table Panel */}
          <div className="bm-panel">
            <div className="bc-panel-head">
              <div>
                <h2>Branch Customers</h2>
                <p>All customers registered to your branch</p>
              </div>
              <input
                type="text"
                className="bc-search"
                placeholder="Search by name, email, ID…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            
            <div className="bm-table-wrap" style={{ overflowX: 'auto' }}>
              <table className="bm-table">
                <thead>
                  <tr>
                    <th>Customer Name</th>
                    <th>ID</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="6" className="bm-empty">Loading…</td></tr>
                  ) : filteredCustomers.length === 0 ? (
                    <tr><td colSpan="6" className="bm-empty">No customers found.</td></tr>
                  ) : (
                    filteredCustomers.map((c, i) => (
                      <tr key={i} onClick={() => handleOpenCustomer(c)} className="bc-row">
                        <td>
                          <b>{c.name || c.email}</b>
                        </td>
                        <td className="bm-cell-ref">{c.customerId}</td>
                        <td>{c.email || '—'}</td>
                        <td>{c.mobileNumber || '—'}</td>
                        <td>
                          <span className={`bm-status bm-status-${statusTone(c.status)}`}>
                            {c.status || 'PENDING'}
                          </span>
                        </td>
                        <td>
                          <span className="bc-link">View →</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

    </div>
  );
}