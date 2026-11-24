import React, { useEffect, useState } from 'react';
import adminService from '../../../../services/adminService';
import './EmployeeDetailsModal.css'; // Reusing CSS for consistent styling

const formatDate = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  return isNaN(d.getTime()) ? String(v) : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatMoney = (v) => {
  if (v == null) return '—';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(v);
};

const statusTone = (s) => {
  const v = String(s || '').toUpperCase();
  if (['ACTIVE', 'APPROVED'].includes(v)) return 'ok';
  if (['PENDING', 'PREVIEW'].includes(v)) return 'warn';
  if (['CLOSED', 'FROZEN', 'REJECTED'].includes(v)) return 'bad';
  return 'neutral';
};

export default function AccountDetailsModal({ accountId, onClose }) {
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;
    const loadAccount = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await adminService.getAccountById(accountId);
        if (isMounted) setAccount(data);
      } catch (err) {
        if (isMounted) setError(err.message || 'Failed to load account details.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadAccount();
    return () => { isMounted = false; };
  }, [accountId]);

  return (
    <div className="edm-backdrop" onClick={onClose}>
      <div className="edm-modal" onClick={e => e.stopPropagation()}>
        <header className="edm-header">
          <div>
            <h2>{loading ? 'Loading...' : `Account: ${account?.accountNumber || '—'}`}</h2>
            {!loading && account && <p>ID: {account.accountId}</p>}
          </div>
          <button className="ad-icon-btn" onClick={onClose}>✕</button>
        </header>

        <div className="edm-body">
          {loading ? (
            <p style={{ textAlign: 'center', color: '#6b7280', padding: '40px 0' }}>Fetching account details...</p>
          ) : error ? (
            <p style={{ textAlign: 'center', color: '#ef4444', padding: '40px 0' }}>{error}</p>
          ) : account && (
            <>
              {/* Account Overview */}
              <div>
                <div className="edm-section-title">Account Overview</div>
                <div className="edm-grid">
                  <div className="edm-field">
                    <label>Account Number</label>
                    <span style={{ fontWeight: 'bold', color: '#1e293b' }}>{account.accountNumber}</span>
                  </div>
                  <div className="edm-field">
                    <label>Account Type</label>
                    <span>{account.accountType || '—'}</span>
                  </div>
                  <div className="edm-field">
                    <label>Customer Name</label>
                    <span>{account.customerName || '—'}</span>
                  </div>
                  <div className="edm-field">
                    <label>Customer ID</label>
                    <span>{account.customerId || '—'}</span>
                  </div>
                  <div className="edm-field">
                    <label>Balance</label>
                    <span style={{ fontWeight: 'bold', color: '#059669' }}>{formatMoney(account.balance)}</span>
                  </div>
                  <div className="edm-field">
                    <label>Status</label>
                    <span>
                      <span className={`ad-status ad-status-${statusTone(account.accountStatus)}`}>
                        {account.accountStatus}
                      </span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Branch Info */}
              <div>
                <div className="edm-section-title">Branch Information</div>
                <div className="edm-grid">
                  <div className="edm-field">
                    <label>Branch Code</label>
                    <span>{account.branchCode || '—'}</span>
                  </div>
                  <div className="edm-field">
                    <label>Branch Name</label>
                    <span>{account.branchName || '—'}</span>
                  </div>
                  <div className="edm-field">
                    <label>IFSC Code</label>
                    <span>{account.ifsc || '—'}</span>
                  </div>
                </div>
              </div>

              {/* Debit Card Details */}
              {account.debitCard ? (
                <div>
                  <div className="edm-section-title">Debit Card Details</div>
                  <div className="edm-grid">
                    <div className="edm-field span-2">
                      <label>Card Number (Preview)</label>
                      <span style={{ fontFamily: 'monospace', letterSpacing: '2px' }}>
                        {account.debitCard.debitCardNumber || '•••• •••• •••• ' + (account.debitCard.debitCardLastFourDigits || '••••')}
                      </span>
                    </div>
                    <div className="edm-field">
                      <label>Card Type</label>
                      <span>{account.debitCard.debitCardType || '—'}</span>
                    </div>
                    <div className="edm-field">
                      <label>Card Status</label>
                      <span>
                        <span className={`ad-status ad-status-${statusTone(account.debitCard.debitCardStatus)}`}>
                          {account.debitCard.debitCardStatus || '—'}
                        </span>
                      </span>
                    </div>
                    <div className="edm-field">
                      <label>Issued At</label>
                      <span>{formatDate(account.debitCard.debitCardIssuedAt)}</span>
                    </div>
                    <div className="edm-field">
                      <label>Expiry Date</label>
                      <span>{formatDate(account.debitCard.debitCardExpiryDate)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                 <div>
                  <div className="edm-section-title">Debit Card Details</div>
                  <p style={{ fontSize: '0.875rem', color: '#6b7280', fontStyle: 'italic' }}>No debit card issued for this account.</p>
                 </div>
              )}

              {/* Audit Info */}
              <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '10px', textAlign: 'right' }}>
                Created: {formatDate(account.createdAt)} • Last Updated: {formatDate(account.updatedAt)}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}