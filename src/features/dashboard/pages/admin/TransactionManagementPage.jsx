import { useCallback, useEffect, useMemo, useState } from 'react';
import adminService from '../../../../services/adminService';
import './TransactionManagementPage.css';

const { normalizeList, pageTotal } = adminService;

/* ---------- helpers ---------- */
const formatDate = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatTime = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
};

const formatMoney = (v, currency = 'INR') => {
  if (v == null || v === '') return '—';
  const n = Number(v);
  return Number.isNaN(n) ? String(v) : new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 2 }).format(n);
};

const statusTone = (s) => {
  const v = String(s || '').toUpperCase();
  if (['SUCCESS', 'COMPLETED'].includes(v)) return 'ok';
  if (['PENDING', 'PROCESSING', 'IN_PROGRESS'].includes(v)) return 'warn';
  if (['FAILED', 'REJECTED', 'CANCELLED'].includes(v)) return 'bad';
  return 'neutral';
};

const PAGE_SIZE = 10;

export default function TransactionManagementPage() {
  const [transactions, setTransactions] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');

  /* ---------- Modal State ---------- */
  const [selectedTx, setSelectedTx] = useState(null);
  const [accountBalances, setAccountBalances] = useState({});
  const [loadingBalance, setLoadingBalance] = useState(false);

  /* ---------- Action Modal State ---------- */
  const [actionType, setActionType] = useState(''); // 'transfer' or 'withdraw'
  const [actionForm, setActionForm] = useState({});
  const [actionSubmitting, setActionSubmitting] = useState(false);
  const [actionError, setActionError] = useState('');

  /* ---------- load data ---------- */
  const loadTransactions = useCallback(async (pageIndex = 0) => {
    setLoading(true);
    setError('');
    try {
      const data = await adminService.getAllTransactions({ page: pageIndex, size: PAGE_SIZE });
      setTransactions(normalizeList(data));
      setTotal(pageTotal(data));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTransactions(page);
  }, [page, loadTransactions]);

  /* ---------- derived data ---------- */
  const filteredTxs = useMemo(() => {
    const term = search.trim().toLowerCase();
    return transactions.filter((t) => {
      const matchesSearch = !term || [
        t.transactionId, t.accountNumber, t.fromAccountNumber, t.toAccountNumber, 
        t.customerId, t.reference
      ].filter(Boolean).join(' ').toLowerCase().includes(term);
      
      const matchesFilter = filter === 'ALL' || String(t.transactionType).toUpperCase() === filter;
      
      return matchesSearch && matchesFilter;
    });
  }, [transactions, search, filter]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  /* ---------- actions ---------- */
  const openDetails = async (tx) => {
    setSelectedTx(tx);
    setAccountBalances({});
    setLoadingBalance(true);
    try {
      const balances = {};
      if (tx.fromAccountNumber) {
        const acc = await adminService.getAccountByNumber(tx.fromAccountNumber);
        balances[tx.fromAccountNumber] = acc.balance;
      }
      if (tx.accountNumber && tx.accountNumber !== tx.fromAccountNumber) {
        const acc = await adminService.getAccountByNumber(tx.accountNumber);
        balances[tx.accountNumber] = acc.balance;
      }
      if (tx.toAccountNumber && tx.toAccountNumber !== tx.accountNumber) {
        const acc = await adminService.getAccountByNumber(tx.toAccountNumber);
        balances[tx.toAccountNumber] = acc.balance;
      }
      setAccountBalances(balances);
    } catch (err) {
      console.error('Could not load balances', err);
    } finally {
      setLoadingBalance(false);
    }
  };

  const handleActionSubmit = async (e) => {
    e.preventDefault();
    setActionSubmitting(true);
    setActionError('');
    try {
      if (actionType === 'transfer') {
        await adminService.adminTransfer({
          fromAccountNumber: actionForm.fromAccountNumber,
          toAccountNumber: actionForm.toAccountNumber,
          amount: Number(actionForm.amount),
          currency: actionForm.currency || 'INR',
          description: actionForm.description,
        });
      } else {
        await adminService.adminWithdraw({
          accountNumber: actionForm.accountNumber,
          amount: Number(actionForm.amount),
          currency: actionForm.currency || 'INR',
          description: actionForm.description,
        });
      }
      setActionType('');
      setActionForm({});
      loadTransactions(page);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setActionSubmitting(false);
    }
  };

  return (
    <div className="tx-page">
      <div className="tx-head">
        <div>
          <h1>Transaction Monitoring</h1>
          <p>Review system activity, audit transfers, and manage manual entries.</p>
        </div>
        <div className="tx-actions">
          <button className="tx-btn-primary" onClick={() => { setActionType('transfer'); setActionForm({ currency: 'INR' }); }}>
            + New Transfer
          </button>
          <button className="tx-btn-secondary" onClick={() => { setActionType('withdraw'); setActionForm({ currency: 'INR' }); }}>
            - New Withdrawal
          </button>
        </div>
      </div>

      {error && <div className="ad-alert">{error} <button onClick={() => loadTransactions(page)}>Retry</button></div>}

      <section className="ad-panel">
        <div className="ad-panel-head">
          <div>
            <h2>All Transactions</h2>
            <p>Click a row to view the full receipt and current balances</p>
          </div>
          <div className="tx-filters">
            <label className="tx-search">
              <span>🔍</span>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search ID, Acct No, Ref…" />
            </label>
            <select className="tx-select" value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="ALL">All Types</option>
              <option value="TRANSFER">Transfer</option>
              <option value="DEPOSIT">Deposit</option>
              <option value="WITHDRAWAL">Withdrawal</option>
            </select>
          </div>
        </div>

        <div className="ad-table-wrap">
          <table className="ad-table">
            <thead>
              <tr>
                <th>Transaction ID</th>
                <th>Type</th>
                <th>Accounts</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="ad-empty">Loading transactions…</td></tr>
              ) : filteredTxs.length === 0 ? (
                <tr><td colSpan={7} className="ad-empty">No transactions found.</td></tr>
              ) : (
                filteredTxs.map((t) => (
                  <tr key={t.transactionId} className="tx-row" onClick={() => openDetails(t)}>
                    <td><span className="tx-mono">{t.transactionId}</span></td>
                    <td>{t.transactionType}</td>
                    <td>
                      <div className="tx-accounts">
                        <span>{t.fromAccountNumber || t.accountNumber || '—'}</span>
                        {t.toAccountNumber && (
                          <>
                            <span className="tx-arrow">→</span>
                            <span>{t.toAccountNumber}</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="tx-amount">{formatMoney(t.amount, t.currency)}</td>
                    <td>
                      <span className={`ad-status ad-status-${statusTone(t.transactionStatus)}`}>
                        {t.transactionStatus}
                      </span>
                    </td>
                    <td>{formatDate(t.createdAt)}</td>
                    <td><span className="tx-link">View →</span></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="tx-pagination">
          <span>Page {page + 1} of {totalPages} · {total} transactions</span>
          <div>
            <button disabled={page === 0 || loading} onClick={() => setPage((p) => p - 1)}>Previous</button>
            <button disabled={page + 1 >= totalPages || loading} onClick={() => setPage((p) => p + 1)}>Next</button>
          </div>
        </div>
      </section>

      {/* Receipt Modal */}
      {selectedTx && (
        <div className="tx-modal-backdrop" onClick={() => setSelectedTx(null)}>
          <div className="tx-modal receipt-modal" onClick={(e) => e.stopPropagation()}>
            <header className="tx-modal-head">
              <div>
                <h2>Transaction Receipt</h2>
                <p className="tx-mono">{selectedTx.transactionId}</p>
              </div>
              <button className="ad-icon-btn" onClick={() => setSelectedTx(null)}>✕</button>
            </header>
            
            <div className="receipt-body">
              <div className="receipt-amount-row">
                <span>Amount</span>
                <h1>{formatMoney(selectedTx.amount, selectedTx.currency)}</h1>
                <span className={`ad-status ad-status-${statusTone(selectedTx.transactionStatus)}`}>
                  {selectedTx.transactionStatus}
                </span>
              </div>

              <div className="receipt-grid">
                <div><span>Date & Time</span><b>{formatDate(selectedTx.createdAt)} · {formatTime(selectedTx.createdAt)}</b></div>
                <div><span>Transaction Type</span><b>{selectedTx.transactionType}</b></div>
                <div><span>Reference</span><b className="tx-mono">{selectedTx.reference}</b></div>
                <div><span>Description</span><b>{selectedTx.description || '—'}</b></div>
                <div><span>Customer ID</span><b>{selectedTx.customerId || '—'}</b></div>
                <div><span>Requested By</span><b>{selectedTx.requestedBy || 'System'}</b></div>
                {selectedTx.performedBy && (
                  <div><span>Performed By</span><b>{selectedTx.performedBy} ({selectedTx.performedByRole})</b></div>
                )}
              </div>

              <div className="receipt-accounts-box">
                {selectedTx.fromAccountNumber && (
                  <div className="tx-account-card">
                    <span>From Account</span>
                    <b>{selectedTx.fromAccountNumber}</b>
                    <small>
                      {loadingBalance ? 'Loading…' : `Available Balance: ${formatMoney(accountBalances[selectedTx.fromAccountNumber] || 0, selectedTx.currency)}`}
                    </small>
                  </div>
                )}
                {selectedTx.toAccountNumber && (
                  <div className="tx-account-card">
                    <span>To Account</span>
                    <b>{selectedTx.toAccountNumber}</b>
                    <small>
                      {loadingBalance ? 'Loading…' : `Available Balance: ${formatMoney(accountBalances[selectedTx.toAccountNumber] || 0, selectedTx.currency)}`}
                    </small>
                  </div>
                )}
                {!selectedTx.fromAccountNumber && selectedTx.accountNumber && (
                  <div className="tx-account-card full">
                    <span>Account Number</span>
                    <b>{selectedTx.accountNumber}</b>
                    <small>
                      {loadingBalance ? 'Loading…' : `Available Balance: ${formatMoney(accountBalances[selectedTx.accountNumber] || 0, selectedTx.currency)}`}
                    </small>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Modal (Transfer/Withdraw) */}
      {actionType && (
        <div className="tx-modal-backdrop" onClick={() => setActionType('')}>
          <div className="tx-modal action-modal" onClick={(e) => e.stopPropagation()}>
            <header className="tx-modal-head">
              <div>
                <h2>{actionType === 'transfer' ? 'New Transfer' : 'New Withdrawal'}</h2>
                <p>Admin manual entry</p>
              </div>
              <button className="ad-icon-btn" onClick={() => setActionType('')}>✕</button>
            </header>

            {actionError && <div className="ad-alert" style={{marginBottom: '16px'}}>{actionError}</div>}

            <form onSubmit={handleActionSubmit} className="action-form">
              {actionType === 'transfer' ? (
                <div className="form-row">
                  <label><span>From Account</span><input required value={actionForm.fromAccountNumber || ''} onChange={e => setActionForm({...actionForm, fromAccountNumber: e.target.value})} /></label>
                  <label><span>To Account</span><input required value={actionForm.toAccountNumber || ''} onChange={e => setActionForm({...actionForm, toAccountNumber: e.target.value})} /></label>
                </div>
              ) : (
                <label><span>Account Number</span><input required value={actionForm.accountNumber || ''} onChange={e => setActionForm({...actionForm, accountNumber: e.target.value})} /></label>
              )}
              
              <div className="form-row">
                <label><span>Amount</span><input type="number" step="0.01" required value={actionForm.amount || ''} onChange={e => setActionForm({...actionForm, amount: e.target.value})} /></label>
                <label><span>Currency</span><input required maxLength={3} value={actionForm.currency || 'INR'} onChange={e => setActionForm({...actionForm, currency: e.target.value.toUpperCase()})} /></label>
              </div>
              
              <label><span>Description (Optional)</span><input value={actionForm.description || ''} onChange={e => setActionForm({...actionForm, description: e.target.value})} /></label>

              <div className="action-footer">
                <button type="button" className="tx-btn-secondary" onClick={() => setActionType('')}>Cancel</button>
                <button type="submit" className="tx-btn-primary" disabled={actionSubmitting}>
                  {actionSubmitting ? 'Processing…' : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}