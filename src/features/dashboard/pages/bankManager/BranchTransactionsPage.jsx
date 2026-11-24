import { useMemo, useState } from 'react';
import branchManagerService from '../../../../services/branchManagerService';
import Brand from '../../../../shared/components/Brand';
import './BranchTransactionsPage.css';

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
  if (['SUCCESS', 'COMPLETED', 'APPROVED'].includes(v)) return 'ok';
  if (['PENDING', 'PROCESSING'].includes(v)) return 'warn';
  if (['FAILED', 'REJECTED', 'DECLINED'].includes(v)) return 'bad';
  return 'neutral';
};

export default function BranchTransactionsPage({ transactions, loading, onRefresh }) {
  const [search, setSearch] = useState('');
  const [selectedTx, setSelectedTx] = useState(null);
  
  // Action Modal State
  const [actionType, setActionType] = useState(''); // 'transfer' or 'withdraw'
  const [actionForm, setActionForm] = useState({});
  const [actionSubmitting, setActionSubmitting] = useState(false);
  const [actionError, setActionError] = useState('');

  /* ---------- Derived Stats ---------- */
  const stats = useMemo(() => {
    const successful = transactions.filter(t => String(t.transactionStatus).toUpperCase() === 'SUCCESS');
    const failed = transactions.filter(t => String(t.transactionStatus).toUpperCase() === 'FAILED');
    const totalVolume = successful.reduce((sum, t) => sum + Number(t.amount || 0), 0);
    
    return { 
      total: transactions.length, 
      successful: successful.length, 
      failed: failed.length,
      totalVolume 
    };
  }, [transactions]);

  /* ---------- Filtered List ---------- */
  const filteredTx = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return transactions;
    return transactions.filter((t) => {
      const haystack = [t.transactionId, t.accountNumber, t.customerId, t.reference, t.transactionType].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(term);
    });
  }, [transactions, search]);

  /* ---------- Handle Action Submit ---------- */
  const handleActionSubmit = async (e) => {
    e.preventDefault();
    setActionSubmitting(true);
    setActionError('');
    try {
      if (actionType === 'transfer') {
        await branchManagerService.adminTransfer({
          fromAccountNumber: actionForm.fromAccountNumber,
          toAccountNumber: actionForm.toAccountNumber,
          amount: Number(actionForm.amount),
          currency: actionForm.currency || 'INR',
          description: actionForm.description || 'Admin Branch Transfer',
        });
      } else {
        await branchManagerService.adminWithdraw({
          accountNumber: actionForm.accountNumber,
          amount: Number(actionForm.amount),
          currency: actionForm.currency || 'INR',
          description: actionForm.description || 'Admin Branch Withdrawal',
        });
      }
      setActionType('');
      setActionForm({});
      if (onRefresh) onRefresh();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setActionSubmitting(false);
    }
  };

  return (
    <div className="bt-page">
      
      {/* Top KPI Cards */}
      <div className="bt-stats-grid">
        <div className="bt-stat-card">
          <span>Total Transactions</span>
          <b>{stats.total}</b>
        </div>
        <div className="bt-stat-card">
          <span>Successful</span>
          <b style={{ color: '#158456' }}>{stats.successful}</b>
        </div>
        <div className="bt-stat-card">
          <span>Failed</span>
          <b style={{ color: '#c53849' }}>{stats.failed}</b>
        </div>
        <div className="bt-stat-card">
          <span>Total Volume</span>
          <b>{formatMoney(stats.totalVolume)}</b>
        </div>
      </div>

      {/* Main Table Panel */}
      <div className="bm-panel">
        <div className="bt-panel-head">
          <div>
            <h2>Branch Transactions</h2>
            <p>Recent financial activity</p>
          </div>
          <div className="bt-header-actions">
            <input
              type="text"
              className="bt-search"
              placeholder="Search TxID, Acct No…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button className="bt-btn-primary" onClick={() => { setActionType('transfer'); setActionForm({ currency: 'INR' }); }}>
              + Transfer
            </button>
            <button className="bt-btn-secondary" onClick={() => { setActionType('withdraw'); setActionForm({ currency: 'INR' }); }}>
              - Withdraw
            </button>
          </div>
        </div>
        
        <div className="bm-table-wrap">
          <table className="bm-table">
            <thead>
              <tr>
                <th>Transaction ID</th>
                <th>Type</th>
                <th>Account(s)</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" className="bm-empty">Loading…</td></tr>
              ) : filteredTx.length === 0 ? (
                <tr><td colSpan="6" className="bm-empty">No transactions found.</td></tr>
              ) : (
                filteredTx.map((t, i) => (
                  <tr key={i} className="bt-row" onClick={() => setSelectedTx(t)}>
                    <td className="bm-cell-ref">{t.transactionId}</td>
                    <td>{t.transactionType}</td>
                    <td>{t.fromAccountNumber ? `${t.fromAccountNumber} → ${t.toAccountNumber}` : t.accountNumber}</td>
                    <td><b>{formatMoney(t.amount, t.currency)}</b></td>
                    <td>
                      <span className={`bm-status bm-status-${statusTone(t.transactionStatus)}`}>
                        {t.transactionStatus}
                      </span>
                    </td>
                    <td>
                      <span className="bt-link">View →</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transaction Detail Modal */}
      {selectedTx && (
        <div className="kyc-modal-backdrop" onClick={() => setSelectedTx(null)}>
          <div className="kyc-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '720px', width: '100%', padding: '0', overflow: 'hidden', borderRadius: '14px' }}>
            
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <Brand />
                <div style={{ borderLeft: '1px solid #cbd5e1', paddingLeft: '16px' }}>
                  <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>{selectedTx.transactionType} Transaction</h2>
                  <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748b', fontWeight: 500 }}>ID: {selectedTx.transactionId}</p>
                </div>
              </div>
              <button onClick={() => setSelectedTx(null)} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '50%', width: '32px', height: '32px', display: 'grid', placeItems: 'center', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                ✕
              </button>
            </div>

            <div style={{ padding: '24px' }}>
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#158456', letterSpacing: '-1px' }}>
                  {formatMoney(selectedTx.amount, selectedTx.currency)}
                </div>
                <span className={`bm-status bm-status-${statusTone(selectedTx.transactionStatus)}`} style={{ marginTop: '8px', fontSize: '11px', padding: '4px 12px', borderRadius: '20px', textTransform: 'uppercase' }}>
                  {selectedTx.transactionStatus}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                
                <DetailBlock label="Transaction Type" value={selectedTx.transactionType} />
                <DetailBlock label="Reference ID" value={selectedTx.reference || '—'} />
                <DetailBlock label="Description" value={selectedTx.description || '—'} />
                
                <div style={{ gridColumn: '1 / -1', borderTop: '1px dashed #cbd5e1', margin: '4px 0' }} />

                {selectedTx.fromAccountNumber && <DetailBlock label="From Account" value={selectedTx.fromAccountNumber} />}
                {selectedTx.toAccountNumber && <DetailBlock label="To Account" value={selectedTx.toAccountNumber} />}
                {selectedTx.accountNumber && <DetailBlock label="Account" value={selectedTx.accountNumber} />}
                <DetailBlock label="Customer ID" value={selectedTx.customerId || '—'} />
                
                <div style={{ gridColumn: '1 / -1', borderTop: '1px dashed #cbd5e1', margin: '4px 0' }} />

                <DetailBlock label="Created At" value={`${formatDate(selectedTx.createdAt)} · ${formatTime(selectedTx.createdAt)}`} />
                <DetailBlock label="Performed By" value={selectedTx.performedBy ? `${selectedTx.performedBy} (${selectedTx.performedByRole})` : 'System'} />
              </div>
            </div>

            <div style={{ padding: '0 24px 24px 24px' }}>
              <button type="button" className="bt-btn-secondary" onClick={() => setSelectedTx(null)} style={{ width: '100%', padding: '12px', fontSize: '13px', fontWeight: 700 }}>
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action Modal (Transfer/Withdraw) */}
      {actionType && (
        <div className="bt-modal-backdrop" onClick={() => setActionType('')}>
          <div className="bt-modal" onClick={(e) => e.stopPropagation()}>
            <header className="bt-modal-head">
              <div>
                <h2>{actionType === 'transfer' ? 'New Transfer' : 'New Withdrawal'}</h2>
                <p>Admin manual entry</p>
              </div>
              <button onClick={() => setActionType('')} className="bt-close-btn">✕</button>
            </header>

            {actionError && <div className="bt-error-box">{actionError}</div>}

            <form onSubmit={handleActionSubmit} className="bt-form">
              {actionType === 'transfer' ? (
                <div className="bt-grid">
                  <label className="bt-form-label">
                    <span>From Account Number</span>
                    <input required value={actionForm.fromAccountNumber || ''} onChange={e => setActionForm({...actionForm, fromAccountNumber: e.target.value})} />
                  </label>
                  <label className="bt-form-label">
                    <span>To Account Number</span>
                    <input required value={actionForm.toAccountNumber || ''} onChange={e => setActionForm({...actionForm, toAccountNumber: e.target.value})} />
                  </label>
                </div>
              ) : (
                <label className="bt-form-label">
                  <span>Account Number</span>
                  <input required value={actionForm.accountNumber || ''} onChange={e => setActionForm({...actionForm, accountNumber: e.target.value})} />
                </label>
              )}
              
              <div className="bt-grid">
                <label className="bt-form-label">
                  <span>Amount</span>
                  <input type="number" step="0.01" required value={actionForm.amount || ''} onChange={e => setActionForm({...actionForm, amount: e.target.value})} />
                </label>
                <label className="bt-form-label">
                  <span>Currency</span>
                  <input required maxLength={3} value={actionForm.currency || 'INR'} onChange={e => setActionForm({...actionForm, currency: e.target.value.toUpperCase()})} />
                </label>
              </div>
              
              <label className="bt-form-label">
                <span>Description (Optional)</span>
                <input value={actionForm.description || ''} onChange={e => setActionForm({...actionForm, description: e.target.value})} />
              </label>

              <div className="bt-form-actions">
                <button type="button" className="bt-btn-secondary" onClick={() => setActionType('')}>Cancel</button>
                <button type="submit" className="bt-btn-primary" disabled={actionSubmitting}>
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

function DetailBlock({ label, value }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
      <span style={{ fontSize: '13px', color: '#0f172a', fontWeight: 600, wordBreak: 'break-word' }}>{value}</span>
    </div>
  )
}