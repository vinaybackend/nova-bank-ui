import { useCallback, useEffect, useMemo, useState } from 'react';
import adminService from '../../../../services/adminService';
import './AccountManagementPage.css';

const { normalizeList, pageTotal } = adminService;

/* ---------- helpers ---------- */
const formatDate = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime())
    ? String(v)
    : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatMoney = (v, currency = 'INR') => {
  if (v == null || v === '') return '—';
  const n = Number(v);
  return Number.isNaN(n)
    ? String(v)
    : new Intl.NumberFormat('en-IN', {
        style: 'currency', currency: currency, maximumFractionDigits: 2,
      }).format(n);
};

const statusTone = (s) => {
  const v = String(s || '').toUpperCase();
  if (['ACTIVE', 'OPEN'].includes(v)) return 'ok';
  if (['PENDING', 'UNDER_REVIEW', 'PROCESSING'].includes(v)) return 'warn';
  if (['BLOCKED', 'CLOSED', 'INACTIVE'].includes(v)) return 'bad';
  return 'neutral';
};

const customerName = (a) => a.name || a.customerName || '—';
const customerEmail = (a) => a.email || '—';

const PAGE_SIZE = 10;

export default function AccountManagementPage() {
  const [accounts, setAccounts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  /* ---------- Detail view state ---------- */
  const [selectedAccount, setSelectedAccount] = useState(null);
  
  /* ---------- status update state ---------- */
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusError, setStatusError] = useState('');

  /* ---------- Transaction Action State (Withdraw/Transfer) ---------- */
  const [actionType, setActionType] = useState(null); // 'WITHDRAW' | 'TRANSFER' | null
  const [actionAmount, setActionAmount] = useState('');
  const [actionTargetAccount, setActionTargetAccount] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  /* ---------- load data ---------- */
  const loadAccounts = useCallback(async (pageIndex = 0) => {
    setLoading(true);
    setError('');
    try {
      const data = await adminService.getAllAccounts({
        page: pageIndex,
        size: PAGE_SIZE,
      });
      setAccounts(normalizeList(data));
      setTotal(pageTotal(data));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAccounts(page);
  }, [page, loadAccounts]);

  /* ---------- derived data ---------- */
  const filteredAccounts = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return accounts;
    return accounts.filter((a) => {
      const haystack = [
        a.accountId, a.accountNumber, a.customerId, a.branchName, a.ifsc, a.accountStatus, customerName(a), customerEmail(a)
      ].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(term);
    });
  }, [accounts, search]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  /* ---------- Handlers ---------- */
  const handleUpdateStatus = async (newStatus) => {
    if (!selectedAccount) return;
    setUpdatingStatus(true);
    setStatusError('');
    try {
      const updated = await adminService.updateAccountStatus(selectedAccount.accountId, newStatus);
      setSelectedAccount(prev => ({ ...prev, accountStatus: newStatus }));
      setAccounts((prev) =>
        prev.map((a) => a.accountId === selectedAccount.accountId ? { ...a, accountStatus: newStatus } : a)
      );
    } catch (err) {
      setStatusError(err.message);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleTransaction = async (e) => {
    e.preventDefault();
    if (!actionAmount || Number(actionAmount) <= 0) {
      setActionError('Please enter a valid amount.');
      return;
    }

    setActionLoading(true);
    setActionError('');
    setActionSuccess('');

    try {
      const payload = {
        accountNumber: selectedAccount.accountNumber,
        amount: Number(actionAmount),
      };

      if (actionType === 'WITHDRAW') {
        await adminService.adminWithdraw(payload);
        setActionSuccess('Withdrawal successful!');
      } else if (actionType === 'TRANSFER') {
        if (!actionTargetAccount) {
          setActionError('Target account number is required for transfer.');
          setActionLoading(false);
          return;
        }
        await adminService.adminTransfer({
          fromAccountNumber: selectedAccount.accountNumber,
          toAccountNumber: actionTargetAccount,
          amount: Number(actionAmount),
        });
        setActionSuccess('Transfer successful!');
      }
      
      // Refresh the account data to show new balance
      const updated = await adminService.getAccountById(selectedAccount.accountId);
      setSelectedAccount(updated);
      
      // Reset form
      setActionAmount('');
      setActionTargetAccount('');
      setTimeout(() => setActionType(null), 1500); // close form after success
    } catch (err) {
      setActionError(err.message || 'Transaction failed.');
    } finally {
      setActionLoading(false);
    }
  };

  /* ---------- render ---------- */
  return (
    <div className="am-page">
      
      {selectedAccount ? (
        
        /* ================= FULL PAGE DETAILS VIEW ================= */
        <div className="bc-details-page">
          
          <div className="bc-details-header-top">
            <button className="bc-back-btn" onClick={() => setSelectedAccount(null)}>
              ← Back to Accounts
            </button>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
               <span className={`bm-status bm-status-${statusTone(selectedAccount.accountStatus)}`} style={{ padding: '6px 12px', fontSize: '12px' }}>
                  {String(selectedAccount.accountStatus || '—').replaceAll('_', ' ')}
               </span>
            </div>
          </div>

          <div className="bc-details-title-area">
            <h1>{selectedAccount.accountType || 'Account'} Details</h1>
            <p>Account Number: <b>{selectedAccount.accountNumber}</b></p>
          </div>

          {/* Top Summary Bar */}
          <div className="bc-summary-bar">
            <div className="bc-summary-item">
              <div className="bc-summary-icon">👤</div>
              <div className="bc-summary-text">
                <span>Customer Name</span>
                <b>{customerName(selectedAccount)}</b>
              </div>
            </div>
            <div className="bc-summary-item">
              <div className="bc-summary-icon">✉️</div>
              <div className="bc-summary-text">
                <span>Email Address</span>
                <b>{customerEmail(selectedAccount)}</b>
              </div>
            </div>
            <div className="bc-summary-item">
              <div className="bc-summary-icon">💰</div>
              <div className="bc-summary-text">
                <span>Current Balance</span>
                <b>{formatMoney(selectedAccount.balance, selectedAccount.currency)}</b>
              </div>
            </div>
            <div className="bc-summary-item">
              <div className="bc-summary-icon">🏦</div>
              <div className="bc-summary-text">
                <span>Branch Name</span>
                <b>{selectedAccount.branchName || '—'}</b>
              </div>
            </div>
          </div>

          {/* Two Column Layout */}
          <div className="bc-details-grid">
            
            {/* Left Column: Core Details & Debit Card */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              <div className="bc-details-panel">
                <div className="bc-details-panel-header">
                  <div className="bc-summary-icon">📋</div>
                  <div>
                    <h3>Account Information</h3>
                    <p>Core identifiers and branch details</p>
                  </div>
                </div>
                <div className="bc-profile-grid">
                  <div className="bc-profile-item"><span>Account ID</span><b>{selectedAccount.accountId || '—'}</b></div>
                  <div className="bc-profile-item"><span>Account Number</span><b>{selectedAccount.accountNumber || '—'}</b></div>
                  <div className="bc-profile-item"><span>Account Type</span><b>{selectedAccount.accountType || '—'}</b></div>
                  <div className="bc-profile-item"><span>Currency</span><b>{selectedAccount.currency || 'INR'}</b></div>
                  <div className="bc-profile-item"><span>Branch Code</span><b>{selectedAccount.branchCode || '—'}</b></div>
                  <div className="bc-profile-item"><span>IFSC Code</span><b>{selectedAccount.ifsc || '—'}</b></div>
                </div>
              </div>

              {selectedAccount.debitCard ? (
                <div className="bc-details-panel">
                  <div className="bc-details-panel-header">
                    <div className="bc-summary-icon">💳</div>
                    <div>
                      <h3>Debit Card Details</h3>
                      <p>Linked payment card information</p>
                    </div>
                  </div>
                  <div className="bc-profile-grid">
                    <div className="bc-profile-item"><span>Card Type</span><b>{selectedAccount.debitCard.cardType || '—'}</b></div>
                    <div className="bc-profile-item"><span>Card Status</span><b>{selectedAccount.debitCard.cardStatus || '—'}</b></div>
                    <div className="bc-profile-item"><span>Card Reference</span><b>{selectedAccount.debitCard.debitCardReference || '—'}</b></div>
                    <div className="bc-profile-item"><span>Card Number</span><b>•••• {selectedAccount.debitCard.lastFourDigits || '—'}</b></div>
                    <div className="bc-profile-item"><span>Issued Date</span><b>{formatDate(selectedAccount.debitCard.issuedAt)}</b></div>
                    <div className="bc-profile-item"><span>Expiry Date</span><b>{formatDate(selectedAccount.debitCard.expiryDate)}</b></div>
                  </div>
                </div>
              ) : (
                <div className="bc-details-panel">
                  <div className="bc-details-panel-header">
                    <div className="bc-summary-icon">💳</div>
                    <div><h3>Debit Card</h3></div>
                  </div>
                  <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>No debit card is currently linked to this account.</p>
                </div>
              )}

            </div>

            {/* Right Column: Status Management & Quick Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Status Management */}
              <div className="bc-details-panel" style={{ background: '#f8fafc' }}>
                <div className="bc-details-panel-header" style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: 16 }}>
                  <div className="bc-summary-icon">⚙️</div>
                  <div>
                    <h3>Manage Status</h3>
                    <p>Update account state</p>
                  </div>
                </div>
                
                {statusError && <div className="ad-alert" style={{ marginBottom: '12px' }}>{statusError}</div>}
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '6px' }}>Current Status</label>
                    <span className={`bm-status bm-status-${statusTone(selectedAccount.accountStatus)}`} style={{ padding: '4px 10px', fontSize: '11px' }}>
                      {String(selectedAccount.accountStatus || '—').replaceAll('_', ' ')}
                    </span>
                  </div>
                  
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '6px' }}>Change Status</label>
                    <select 
                      value={selectedAccount.accountStatus}
                      onChange={(e) => handleUpdateStatus(e.target.value)}
                      disabled={updatingStatus || selectedAccount.accountStatus === 'CLOSED'}
                      style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }}
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="BLOCKED">BLOCKED</option>
                      <option value="CLOSED">CLOSED</option>
                    </select>
                    {updatingStatus && <span style={{ fontSize: '12px', color: '#1769e0', marginTop: '6px', display: 'block' }}>Updating…</span>}
                  </div>
                </div>
              </div>

              {/* ✨ NEW: Quick Actions (Withdraw / Transfer) */}
              <div className="bc-details-panel">
                <div className="bc-details-panel-header">
                  <div className="bc-summary-icon">💸</div>
                  <div>
                    <h3>Quick Actions</h3>
                    <p>Modify account balance</p>
                  </div>
                </div>

                {actionSuccess && <div style={{ color: '#158456', fontSize: '13px', marginBottom: '12px', fontWeight: 'bold' }}>{actionSuccess}</div>}
                {actionError && <div style={{ color: '#b91c1c', fontSize: '13px', marginBottom: '12px' }}>{actionError}</div>}

                {!actionType ? (
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button 
                      onClick={() => { setActionType('WITHDRAW'); setActionError(''); setActionSuccess(''); }} 
                      disabled={selectedAccount.accountStatus !== 'ACTIVE'}
                      style={{ flex: 1, padding: '10px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                      Withdraw
                    </button>
                    <button 
                      onClick={() => { setActionType('TRANSFER'); setActionError(''); setActionSuccess(''); }}
                      disabled={selectedAccount.accountStatus !== 'ACTIVE'}
                      style={{ flex: 1, padding: '10px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                      Transfer
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleTransaction} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <h4 style={{ margin: 0, fontSize: '14px', color: '#0f172a' }}>
                      {actionType === 'WITHDRAW' ? 'Withdraw Funds' : 'Transfer Funds'}
                    </h4>
                    
                    {actionType === 'TRANSFER' && (
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>Target Account No</label>
                        <input 
                          type="text" 
                          value={actionTargetAccount} 
                          onChange={(e) => setActionTargetAccount(e.target.value)}
                          placeholder="Enter destination account"
                          style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                        />
                      </div>
                    )}

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>Amount</label>
                      <input 
                        type="number" 
                        value={actionAmount} 
                        onChange={(e) => setActionAmount(e.target.value)}
                        placeholder="e.g. 500"
                        style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                      <button 
                        type="button"
                        onClick={() => setActionType(null)}
                        disabled={actionLoading}
                        style={{ flex: 1, padding: '10px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit"
                        disabled={actionLoading}
                        style={{ flex: 1, padding: '10px', background: '#1769e0', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: actionLoading ? 'not-allowed' : 'pointer' }}
                      >
                        {actionLoading ? 'Processing...' : 'Confirm'}
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Timestamps */}
              <div className="bc-details-panel">
                <div className="bc-details-panel-header">
                  <div className="bc-summary-icon">🕒</div>
                  <div>
                    <h3>Timestamps</h3>
                    <p>Record history</p>
                  </div>
                </div>
                <div className="bc-profile-grid" style={{ gridTemplateColumns: '1fr' }}>
                  <div className="bc-profile-item"><span>Created At</span><b>{formatDate(selectedAccount.createdAt)}</b></div>
                  <div className="bc-profile-item"><span>Last Updated</span><b>{formatDate(selectedAccount.updatedAt)}</b></div>
                </div>
              </div>

            </div>

          </div>
        </div>

      ) : (

        /* ================= MAIN TABLE VIEW ================= */
        <>
          <div className="am-head">
            <div>
              <h1>Account Management</h1>
              <p>View all accounts and manage their status.</p>
            </div>
          </div>

          {error && (
            <div className="ad-alert" role="alert">
              {error}
              <button onClick={() => loadAccounts(page)}>Retry</button>
            </div>
          )}

          <section className="ad-panel">
            <div className="ad-panel-head">
              <div>
                <h2>All accounts</h2>
                <p>Click a row to view full account details</p>
              </div>
              <label className="am-search">
                <span aria-hidden>🔍</span>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by Acct No, Customer Name, ID…"
                />
                {search && (
                  <button type="button" onClick={() => setSearch('')}>✕</button>
                )}
              </label>
            </div>

            <div className="ad-table-wrap">
              <table className="ad-table">
                <thead>
                  <tr>
                    <th>Account Number</th>
                    <th>Customer</th>
                    <th>Branch</th>
                    <th>Balance</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="ad-empty">Loading accounts…</td>
                    </tr>
                  ) : filteredAccounts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="ad-empty">No accounts found.</td>
                    </tr>
                  ) : (
                    filteredAccounts.map((a) => (
                      <tr
                        key={a.accountId}
                        className="am-row"
                        onClick={() => setSelectedAccount(a)}
                      >
                        <td>
                          <div className="am-cell-main">
                            <b>{a.accountNumber || '—'}</b>
                            <small>{a.accountType || '—'}</small>
                          </div>
                        </td>
                        <td>
                          <div className="am-cell-main">
                            <b>{customerName(a)}</b>
                            <small>{a.customerId}</small>
                          </div>
                        </td>
                        <td>
                          <div className="am-cell-main">
                            <b>{a.branchName || '—'}</b>
                            <small>{a.ifsc || '—'}</small>
                          </div>
                        </td>
                        <td>
                          <b>{formatMoney(a.balance, a.currency)}</b>
                        </td>
                        <td>
                          <span className={`bm-status bm-status-${statusTone(a.accountStatus)}`}>
                            {String(a.accountStatus || '—').replaceAll('_', ' ')}
                          </span>
                        </td>
                        <td>{formatDate(a.createdAt)}</td>
                        <td>
                          <span className="am-link">Manage →</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* ---------- Pagination ---------- */}
            <div className="am-pagination">
              <span>
                Page {page + 1} of {totalPages} · {total} accounts
              </span>
              <div>
                <button
                  disabled={page === 0 || loading}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  Previous
                </button>
                <button
                  disabled={page + 1 >= totalPages || loading}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          </section>
        </>
      )}

    </div>
  );
}