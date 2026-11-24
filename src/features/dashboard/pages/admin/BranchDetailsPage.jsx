import React, { useEffect, useState } from 'react';
import adminService from '../../../../services/adminService';
import KycApplicationDetail from '../kycOfficer/KycApplicationDetail'; 
import './BranchManagementPage.css';
import './CustomerManagementPage.css'; // Import styles for the customer layout

const { normalizeList } = adminService;

/* ---------- helpers ---------- */
const formatDate = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  return isNaN(d.getTime()) ? String(v) : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatDateTime = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  return isNaN(d.getTime()) ? String(v) : d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const formatMoney = (v) => {
  if (v == null || v === '') return '—';
  const n = Number(v);
  return Number.isNaN(n) ? String(v) : new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
};

const statusTone = (s) => {
  const v = String(s || '').toUpperCase();
  if (['ACTIVE', 'APPROVED', 'SUCCESS', 'COMPLETED'].includes(v)) return 'ok';
  if (['PENDING', 'UNDER_REVIEW', 'PROCESSING', 'ONBOARDING'].includes(v)) return 'warn';
  if (['CLOSED', 'INACTIVE', 'BLOCKED', 'REJECTED', 'FAILED', 'SUSPENDED', 'TERMINATED'].includes(v)) return 'bad';
  return 'neutral';
};

const formatValue = (v) => (v == null || v === '' ? '—' : String(v).replaceAll('_', ' '));

export default function BranchDetailsPage({ branch, onBack }) {
  const [activeTab, setActiveTab] = useState('Activities');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Data States
  const [activities, setActivities] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [kycList, setKycList] = useState([]);

  // ✨ Detail View States
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedKycId, setSelectedKycId] = useState(null);

  // Fetch helpers
  const fetchBranchData = async () => {
    setLoading(true);
    setError('');
    try {
      const results = await Promise.allSettled([
        adminService.getTransactionsByBranch(branch.branchCode, { size: 100 }),
        adminService.getBranchStatusHistory(branch.branchCode),
        adminService.getEmployeesByBranch(branch.branchCode, { size: 100 }),
        adminService.getCustomersByBranch(branch.branchCode, { size: 100 }),
        adminService.getAccountsByBranch(branch.branchCode, { size: 100 }),
        adminService.getKycByBranch(branch.branchCode, { size: 100 }),
      ]);

      const [txnsRes, histRes, empsRes, custRes, accRes, kycRes] = results;
      const failedSections = [];

      const combinedActivities = [];
      if (txnsRes.status === 'fulfilled') {
        normalizeList(txnsRes.value).forEach(t => combinedActivities.push({
          id: t.transactionId || t.id, time: t.createdAt || t.updatedAt, type: t.transactionType || 'Transaction',
          detail: `${t.description || 'Transaction'} - ${formatMoney(t.amount)}`, status: t.transactionStatus || 'SUCCESS'
        }));
      } else { failedSections.push('Transactions'); }

      if (histRes.status === 'fulfilled') {
        normalizeList(histRes.value).forEach(h => combinedActivities.push({
          id: `hist-${h.id}`, time: h.changedAt, type: 'Branch Status',
          detail: `Status changed to ${h.newStatus} - ${h.reason || 'No reason provided'}`, status: h.newStatus
        }));
      } else { failedSections.push('Status History'); }

      setActivities(combinedActivities.sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0)));

      if (empsRes.status === 'fulfilled') setEmployees(normalizeList(empsRes.value)); else failedSections.push('Employees');
      if (custRes.status === 'fulfilled') setCustomers(normalizeList(custRes.value)); else failedSections.push('Customers');
      if (accRes.status === 'fulfilled') setAccounts(normalizeList(accRes.value)); else failedSections.push('Accounts');
      if (kycRes.status === 'fulfilled') setKycList(normalizeList(kycRes.value)); else failedSections.push('KYC');

      if (failedSections.length > 0) setError(`Failed to load some data: ${failedSections.join(', ')}`);
    } catch (err) {
      setError('Failed to load branch data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    if (isMounted) fetchBranchData();
    return () => { isMounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branch.branchCode]);

  /* ---------- Handlers ---------- */
  const handleOpenEmployee = async (empCode) => {
    try {
      const data = await adminService.getEmployeeDetails(empCode);
      setSelectedEmployee(data);
    } catch (err) { alert("Failed to load employee details"); }
  };

  const handleOpenCustomer = async (customerId) => {
    try {
      const [profile, accs] = await Promise.all([
        adminService.getCustomerById(customerId),
        adminService.getAccountsByCustomer(customerId).catch(() => [])
      ]);
      setSelectedCustomer({ profile, accounts: normalizeList(accs) });
    } catch (err) { alert("Failed to load customer details"); }
  };

  const handleOpenKyc = (kycId) => setSelectedKycId(kycId);

  const closeDetailView = () => {
    setSelectedEmployee(null);
    setSelectedCustomer(null);
    setSelectedKycId(null);
  };

  /* ================= FULL PAGE VIEWS ================= */

  if (selectedKycId) {
    return (
      <div className="bm-page" style={{ padding: '0', background: 'transparent' }}>
        <KycApplicationDetail kycId={selectedKycId} onBack={closeDetailView} onUpdate={fetchBranchData} />
      </div>
    );
  }

  // ✨ EMPLOYEE DETAILS VIEW (Exact Copy of EmployeeManagementPage layout)
  if (selectedEmployee) {
    const emp = selectedEmployee;
    return (
      <div className="bm-page">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <button onClick={closeDetailView} style={{ background: '#ffffff', border: '1px solid #dde4ee', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', color: '#475569', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            ← Back to Branch
          </button>
          <span className={`ad-status ad-status-${statusTone(emp.employmentStatus)}`} style={{ padding: '6px 12px', fontSize: '12px' }}>
            {emp.employmentStatus || 'ONBOARDING'}
          </span>
        </div>

        <div className="em-head" style={{ marginBottom: '16px' }}>
          <div>
            <h1 style={{ fontSize: '24px', textTransform: 'capitalize' }}>{emp.name || 'Loading...'}</h1>
            <p>{emp.employeeCode} • {emp.jobTitle}</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ background: '#fff', border: '1px solid #e1e7f0', borderRadius: '12px', padding: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '16px', borderBottom: '1px solid #eef2f8', paddingBottom: '12px' }}>Personal Information</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div><span style={{ display: 'block', fontSize: '10px', color: '#8792a5', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Full Name</span><b style={{ fontSize: '13px', color: '#1c2740' }}>{emp.name || '—'}</b></div>
                <div><span style={{ display: 'block', fontSize: '10px', color: '#8792a5', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Email</span><b style={{ fontSize: '13px', color: '#1c2740' }}>{emp.email || '—'}</b></div>
                <div><span style={{ display: 'block', fontSize: '10px', color: '#8792a5', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Mobile</span><b style={{ fontSize: '13px', color: '#1c2740' }}>{emp.mobileNumber || '—'}</b></div>
                <div><span style={{ display: 'block', fontSize: '10px', color: '#8792a5', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Date of Birth</span><b style={{ fontSize: '13px', color: '#1c2740' }}>{formatDate(emp.dateOfBirth)}</b></div>
                <div><span style={{ display: 'block', fontSize: '10px', color: '#8792a5', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Gender</span><b style={{ fontSize: '13px', color: '#1c2740' }}>{emp.gender || '—'}</b></div>
                <div><span style={{ display: 'block', fontSize: '10px', color: '#8792a5', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Marital Status</span><b style={{ fontSize: '13px', color: '#1c2740' }}>{emp.maritalStatus || '—'}</b></div>
              </div>
            </div>

            <div style={{ background: '#fff', border: '1px solid #e1e7f0', borderRadius: '12px', padding: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '16px', borderBottom: '1px solid #eef2f8', paddingBottom: '12px' }}>Employment Details</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div><span style={{ display: 'block', fontSize: '10px', color: '#8792a5', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Department</span><b style={{ fontSize: '13px', color: '#1c2740' }}>{emp.department || '—'}</b></div>
                <div><span style={{ display: 'block', fontSize: '10px', color: '#8792a5', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Grade</span><b style={{ fontSize: '13px', color: '#1c2740' }}>{emp.grade || '—'}</b></div>
                <div><span style={{ display: 'block', fontSize: '10px', color: '#8792a5', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Type</span><b style={{ fontSize: '13px', color: '#1c2740' }}>{emp.employeeType || '—'}</b></div>
                <div><span style={{ display: 'block', fontSize: '10px', color: '#8792a5', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Date of Joining</span><b style={{ fontSize: '13px', color: '#1c2740' }}>{formatDate(emp.dateOfJoining)}</b></div>
                <div style={{ gridColumn: 'span 2' }}><span style={{ display: 'block', fontSize: '10px', color: '#8792a5', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Branch</span><b style={{ fontSize: '13px', color: '#1c2740' }}>{emp.branchName} ({emp.branchCode})</b></div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {emp.bankAccount && (
              <div style={{ background: '#fff', border: '1px solid #e1e7f0', borderRadius: '12px', padding: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '16px', borderBottom: '1px solid #eef2f8', paddingBottom: '12px' }}>Bank Account</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div><span style={{ display: 'block', fontSize: '10px', color: '#8792a5', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Account Number</span><b style={{ fontSize: '13px', color: '#1c2740' }}>{emp.bankAccount.accountNumber || '—'}</b></div>
                  <div><span style={{ display: 'block', fontSize: '10px', color: '#8792a5', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Bank Name</span><b style={{ fontSize: '13px', color: '#1c2740' }}>{emp.bankAccount.bankName || '—'}</b></div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ✨ CUSTOMER DETAILS VIEW (Exact Copy of CustomerManagementPage layout)
  if (selectedCustomer) {
    const { profile, accounts: custAccounts } = selectedCustomer;
    return (
      <div className="bm-page">
        <div className="bm-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div>
            <button onClick={closeDetailView} className="bc-back-btn" style={{ marginBottom: '10px' }}>← Back to Branch</button>
            <h1 style={{ margin: 0, fontSize: '24px' }}>{profile?.name || 'Loading...'}</h1>
            <p style={{ margin: '4px 0 0', color: '#64748b' }}>Customer ID: {profile?.customerId}</p>
          </div>
          {profile && <span className={`ad-status ad-status-${statusTone(profile.status)}`} style={{ fontSize: '14px', padding: '6px 12px' }}>{profile.status}</span>}
        </div>

        {/* Top Summary Bar */}
        <div className="bc-summary-bar">
          <div className="bc-summary-item">
            <div className="bc-summary-icon">👤</div>
            <div className="bc-summary-text"><span>Customer Name</span><b>{profile?.name || '—'}</b></div>
          </div>
          <div className="bc-summary-item">
            <div className="bc-summary-icon">✉️</div>
            <div className="bc-summary-text"><span>Email Address</span><b>{profile?.email || '—'}</b></div>
          </div>
          <div className="bc-summary-item">
            <div className="bc-summary-icon">📱</div>
            <div className="bc-summary-text"><span>Mobile Number</span><b>{profile?.mobileNumber || '—'}</b></div>
          </div>
          <div className="bc-summary-item">
            <div className="bc-summary-icon">🛡️</div>
            <div className="bc-summary-text"><span>Status</span><b>{formatValue(profile?.status)}</b></div>
          </div>
        </div>

        <div className="bc-details-grid">
          
          {/* Left Column: Profile Info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="bc-details-panel">
              <div className="bc-details-panel-header"><div className="bc-summary-icon">📋</div><div><h3>Personal Information</h3><p>Basic demographic details</p></div></div>
              <div className="bc-profile-grid">
                <div className="bc-profile-item"><span>Full Name</span><b>{profile?.name || '—'}</b></div>
                <div className="bc-profile-item"><span>Date of Birth</span><b>{formatDate(profile?.dateOfBirth)}</b></div>
                <div className="bc-profile-item"><span>Gender</span><b>{formatValue(profile?.gender)}</b></div>
                <div className="bc-profile-item"><span>Marital Status</span><b>{formatValue(profile?.maritalStatus)}</b></div>
                <div className="bc-profile-item"><span>Nationality</span><b>{profile?.nationality || '—'}</b></div>
                <div className="bc-profile-item"><span>Language</span><b>{profile?.language || '—'}</b></div>
              </div>
            </div>

            <div className="bc-details-panel">
              <div className="bc-details-panel-header"><div className="bc-summary-icon">📞</div><div><h3>Contact Information</h3><p>Email and phone numbers</p></div></div>
              <div className="bc-profile-grid">
                <div className="bc-profile-item" style={{ gridColumn: '1 / -1' }}><span>Email</span><b>{profile?.email || '—'}</b></div>
                <div className="bc-profile-item"><span>Mobile</span><b>{profile?.mobileNumber || '—'}</b></div>
                <div className="bc-profile-item"><span>Alternate Mobile</span><b>{profile?.alternateMobileNumber || '—'}</b></div>
              </div>
            </div>

            <div className="bc-details-panel">
              <div className="bc-details-panel-header"><div className="bc-summary-icon">🏠</div><div><h3>Address Details</h3><p>Permanent and communication addresses</p></div></div>
              <div className="bc-profile-grid" style={{ gridTemplateColumns: '1fr' }}>
                <div className="bc-profile-item">
                  <span>Permanent Address</span>
                  <b>{[profile?.permanentAddress, profile?.permanentCity, profile?.permanentState, profile?.permanentCountry, profile?.permanentPinCode].filter(Boolean).join(', ') || '—'}</b>
                </div>
                <div className="bc-profile-item">
                  <span>Communication Address</span>
                  <b>{[profile?.communicationAddress, profile?.communicationCity, profile?.communicationState, profile?.communicationCountry, profile?.communicationPinCode].filter(Boolean).join(', ') || 'Same as permanent'}</b>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Financial & Bank Info & Accounts */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            <div className="bc-details-panel">
              <div className="bc-details-panel-header"><div className="bc-summary-icon">💼</div><div><h3>Financial Details</h3><p>Income and employment</p></div></div>
              <div className="bc-profile-grid" style={{ gridTemplateColumns: '1fr' }}>
                <div className="bc-profile-item"><span>Occupation</span><b>{profile?.occupation || '—'}</b></div>
                <div className="bc-profile-item"><span>Annual Income</span><b>{profile?.annualIncome ? formatMoney(profile.annualIncome) : '—'}</b></div>
                <div className="bc-profile-item"><span>Source of Income</span><b>{formatValue(profile?.sourceOfIncome)}</b></div>
                <div className="bc-profile-item"><span>Opening Balance</span><b>{profile?.openingBalance ? formatMoney(profile.openingBalance) : '—'}</b></div>
              </div>
            </div>

            <div className="bc-details-panel">
              <div className="bc-details-panel-header"><div className="bc-summary-icon">🏦</div><div><h3>Branch Info</h3><p>Assigned banking branch</p></div></div>
              <div className="bc-profile-grid" style={{ gridTemplateColumns: '1fr' }}>
                <div className="bc-profile-item"><span>Branch Name</span><b>{profile?.branchName || '—'}</b></div>
                <div className="bc-profile-item"><span>Branch Code</span><b>{profile?.branchCode || '—'}</b></div>
                <div className="bc-profile-item"><span>IFSC Code</span><b>{profile?.ifscCode || '—'}</b></div>
              </div>
            </div>

            <div className="bc-details-panel">
              <div className="bc-details-panel-header"><div className="bc-summary-icon">💳</div><div><h3>Linked Accounts</h3><p>Active bank accounts</p></div></div>
              {custAccounts.length === 0 ? (
                <div style={{ padding: '16px', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '8px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                  No bank accounts opened yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {custAccounts.map((acc, idx) => (
                    <div key={acc.accountId || acc.accountNumber || idx} style={{ background: '#f8fafc', border: '1px solid #eef2f8', borderRadius: '10px', padding: '14px' }}>
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
    );
  }

  /* ================= DEFAULT BRANCH DETAILS VIEW ================= */

  return (
    <div className="bm-page">
      <div className="bm-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', marginBottom: '10px', padding: 0, fontWeight: '600', display: 'flex', alignItems: 'center', gap: '5px' }}>
            ← Back to All Branches
          </button>
          <h1 style={{ margin: 0 }}>{branch.branchName} <span style={{ fontSize: '16px', color: '#6b7280', fontWeight: 'normal' }}>({branch.branchCode})</span></h1>
          <p>{branch.city}, {branch.state} • IFSC: <b>{branch.ifscCode}</b></p>
        </div>
        <div>
          <span className={`ad-status ad-status-${statusTone(branch.status)}`} style={{ fontSize: '14px', padding: '6px 12px' }}>{branch.status}</span>
        </div>
      </div>

      {error && <div className="ad-alert" style={{ marginBottom: '20px' }}>{error}</div>}

      <section className="ad-panel">
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid #e5e7eb', paddingBottom: '10px', overflowX: 'auto' }}>
          {['Activities', 'Employees', 'Customers', 'Accounts', 'KYC'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{ background: activeTab === tab ? '#e0e7ff' : 'transparent', color: activeTab === tab ? '#1e40af' : '#4b5563', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: activeTab === tab ? 'bold' : 'normal', cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              {tab} {!loading && `(${
                tab === 'Activities' ? activities.length : tab === 'Employees' ? employees.length : tab === 'Customers' ? customers.length : tab === 'Accounts' ? accounts.length : tab === 'KYC' ? kycList.length : 0
              })`}
            </button>
          ))}
        </div>

        {activeTab === 'Activities' && (
          <div className="ad-table-wrap">
            <table className="ad-table">
              <thead><tr><th>Date/Time</th><th>Activity Type</th><th>Details</th><th>Status</th></tr></thead>
              <tbody>
                {loading ? (<tr><td colSpan="4" className="ad-empty">Loading data...</td></tr>) : activities.length === 0 ? (<tr><td colSpan="4" className="ad-empty">No recent activities found for this branch.</td></tr>) : (
                  activities.map((r, i) => (
                    <tr key={r.id || i}>
                      <td>{formatDateTime(r.time)}</td><td>{r.type}</td><td>{r.detail}</td>
                      <td><span className={`ad-status ad-status-${statusTone(r.status)}`}>{String(r.status).replaceAll('_', ' ')}</span></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'Employees' && (
          <div className="ad-table-wrap">
            <table className="ad-table">
              <thead><tr><th>Emp Code</th><th>Name</th><th>Job Title</th><th>Email</th><th>Status</th></tr></thead>
              <tbody>
                {loading ? (<tr><td colSpan="5" className="ad-empty">Loading data...</td></tr>) : employees.length === 0 ? (<tr><td colSpan="5" className="ad-empty">No employees assigned.</td></tr>) : (
                  employees.map((r, i) => (
                    <tr key={r.employeeCode || i}>
                      <td>{r.employeeCode || '—'}</td>
                      <td><span style={{ cursor: 'pointer', color: '#2563eb', fontWeight: '600' }} onClick={() => handleOpenEmployee(r.employeeCode)}>{r.name}</span></td>
                      <td>{r.jobTitle || '—'}</td><td>{r.email || '—'}</td>
                      <td><span className={`ad-status ad-status-${statusTone(r.employmentStatus)}`}>{r.employmentStatus}</span></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'Customers' && (
          <div className="ad-table-wrap">
            <table className="ad-table">
              <thead><tr><th>Customer ID</th><th>Name</th><th>Email</th><th>Mobile</th><th>Status</th></tr></thead>
              <tbody>
                {loading ? (<tr><td colSpan="5" className="ad-empty">Loading data...</td></tr>) : customers.length === 0 ? (<tr><td colSpan="5" className="ad-empty">No customers registered.</td></tr>) : (
                  customers.map((r, i) => (
                    <tr key={r.customerId || i}>
                      <td><span style={{ cursor: 'pointer', color: '#2563eb', fontWeight: '600' }} onClick={() => handleOpenCustomer(r.customerId)}>{r.customerId}</span></td>
                      <td>{r.name}</td><td>{r.email || '—'}</td><td>{r.mobileNumber || '—'}</td>
                      <td><span className={`ad-status ad-status-${statusTone(r.status)}`}>{r.status}</span></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'Accounts' && (
          <div className="ad-table-wrap">
            <table className="ad-table">
              <thead><tr><th>Account Number</th><th>Type</th><th>Balance</th><th>Status</th></tr></thead>
              <tbody>
                {loading ? (<tr><td colSpan="4" className="ad-empty">Loading data...</td></tr>) : accounts.length === 0 ? (<tr><td colSpan="4" className="ad-empty">No accounts opened.</td></tr>) : (
                  accounts.map((r, i) => (
                    <tr key={r.accountId || i}>
                      <td>{r.accountNumber}</td>
                      <td>{r.accountType}</td><td>{formatMoney(r.balance)}</td>
                      <td><span className={`ad-status ad-status-${statusTone(r.accountStatus)}`}>{r.accountStatus}</span></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'KYC' && (
          <div className="ad-table-wrap">
            <table className="ad-table">
              <thead><tr><th>KYC ID</th><th>Customer ID</th><th>Document Type</th><th>Submitted On</th><th>Status</th></tr></thead>
              <tbody>
                {loading ? (<tr><td colSpan="5" className="ad-empty">Loading data...</td></tr>) : kycList.length === 0 ? (<tr><td colSpan="5" className="ad-empty">No KYC applications found.</td></tr>) : (
                  kycList.map((r, i) => (
                    <tr key={r.kycId || i}>
                      <td><span style={{ cursor: 'pointer', color: '#2563eb', fontWeight: '600' }} onClick={() => handleOpenKyc(r.kycId)}>{r.kycId}</span></td>
                      <td>{r.customerId}</td><td>{r.kycType}</td><td>{formatDateTime(r.createdAt)}</td>
                      <td><span className={`ad-status ad-status-${statusTone(r.verificationStatus)}`} style={{ cursor: 'pointer' }} onClick={() => handleOpenKyc(r.kycId)}>{r.verificationStatus}</span></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}