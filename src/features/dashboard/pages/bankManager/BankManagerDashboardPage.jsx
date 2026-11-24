import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import branchManagerService from '../../../../services/branchManagerService';
import './BankManagerDashboard.css';
import ChangePasswordModal from '../../../profile/ChangePasswordModal';
import KycApplicationDetail from '../kycOfficer/KycApplicationDetail';

import BranchCustomersPage from './BranchCustomersPage';
import BranchAccountsPage from './BranchAccountsPage';
import BranchTransactionsPage from './BranchTransactionsPage';
import BranchKycPage from './BranchKycPage';
import BranchEmployeesPage from './BranchEmployeesPage';
import BranchReportsPage from './BranchReportsPage';
import BranchSettingsPage from './BranchSettingsPage';
import BankLoanManagerPage from './loan/BankLoanManagerPage'

const { normalizeList } = branchManagerService;

const initials = (name) =>
  String(name || '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('') || 'BM';

const formatMoney = (v) => {
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

const formatDate = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime())
    ? String(v)
    : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatTime = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime())
    ? String(v)
    : d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
};

const statusTone = (status) => {
  const s = String(status || '').toUpperCase();
  if (['SUCCESS', 'COMPLETED', 'APPROVED', 'ACTIVE'].includes(s)) return 'ok';
  if (['PENDING', 'IN_PROGRESS', 'UNDER_REVIEW', 'PROCESSING'].includes(s)) return 'warn';
  if (['FAILED', 'REJECTED', 'CLOSED', 'DECLINED'].includes(s)) return 'bad';
  return 'neutral';
};

const shortId = (id) => (id ? String(id).slice(0, 14) : '—');

const NAV_ITEMS = [
  { label: 'Dashboard', icon: '▦', id: 'Dashboard' },
  { label: 'Customers', icon: '👥', id: 'Customers' },
  { label: 'Accounts', icon: '▣', id: 'Accounts' },
  { label: 'KYC Oversight', icon: '🛡', id: 'KYC' },
  { label: 'Transactions', icon: '⇄', id: 'Transactions' },
  { label: 'Loans', icon: '💰', id: 'Loans' },  
  { label: 'Employees', icon: '♧', id: 'Employees' },
  { label: 'Reports', icon: '▤', id: 'Reports' },
  { label: 'Settings', icon: '⚙', id: 'Settings' },
];

/* =========================================================
   Inline Modal Components (To avoid creating extra files)
   ========================================================= */

function DetailBlock({ label, value }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <span
        style={{
          fontSize: '10px',
          color: '#64748b',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}
      >
        {label}
      </span>
      <span style={{ fontSize: '13px', color: '#0f172a', fontWeight: 600, wordBreak: 'break-word' }}>
        {value}
      </span>
    </div>
  );
}

function TransactionModal({ transaction, onClose }) {
  if (!transaction) return null;
  return (
    <div className="kyc-modal-backdrop" onClick={onClose}>
      <div
        className="kyc-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '720px',
          width: '100%',
          padding: '0',
          overflow: 'hidden',
          borderRadius: '14px',
        }}
      >
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#f8fafc',
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
              {transaction.transactionType} Transaction
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748b', fontWeight: 500 }}>
              ID: {transaction.transactionId}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'grid',
              placeItems: 'center',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            }}
          >
            ✕
          </button>
        </div>
        <div style={{ padding: '24px' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#158456', letterSpacing: '-1px' }}>
              {formatMoney(transaction.amount)}
            </div>
            <span
              className={`bm-status bm-status-${statusTone(transaction.transactionStatus)}`}
              style={{
                marginTop: '8px',
                fontSize: '11px',
                padding: '4px 12px',
                borderRadius: '20px',
                textTransform: 'uppercase',
                display: 'inline-block',
              }}
            >
              {transaction.transactionStatus}
            </span>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '16px',
              background: '#f8fafc',
              padding: '20px',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
            }}
          >
            <DetailBlock label="Transaction Type" value={transaction.transactionType} />
            <DetailBlock label="Reference ID" value={transaction.reference || '—'} />
            <DetailBlock label="Description" value={transaction.description || '—'} />
            <div
              style={{
                gridColumn: '1 / -1',
                borderTop: '1px dashed #cbd5e1',
                margin: '4px 0',
              }}
            />
            {transaction.fromAccountNumber && (
              <DetailBlock label="From Account" value={transaction.fromAccountNumber} />
            )}
            {transaction.toAccountNumber && (
              <DetailBlock label="To Account" value={transaction.toAccountNumber} />
            )}
            {transaction.accountNumber && (
              <DetailBlock label="Account" value={transaction.accountNumber} />
            )}
            <DetailBlock label="Customer ID" value={transaction.customerId || '—'} />
            <div
              style={{
                gridColumn: '1 / -1',
                borderTop: '1px dashed #cbd5e1',
                margin: '4px 0',
              }}
            />
            <DetailBlock
              label="Created At"
              value={`${formatDate(transaction.createdAt)} · ${formatTime(transaction.createdAt)}`}
            />
            <DetailBlock
              label="Performed By"
              value={
                transaction.performedBy
                  ? `${transaction.performedBy} (${transaction.performedByRole})`
                  : 'System'
              }
            />
          </div>
        </div>
        <div style={{ padding: '0 24px 24px 24px' }}>
          <button
            type="button"
            className="bt-btn-secondary"
            onClick={onClose}
            style={{ width: '100%', padding: '12px', fontSize: '13px', fontWeight: 700 }}
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   Main Dashboard Component
   ========================================================= */

export default function BankManagerDashboardPage({ user, onSignOut }) {
  const navigate = useNavigate();
  const [activePage, setActivePage] = useState('Dashboard');

  const [branch, setBranch] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [kyc, setKyc] = useState([]);
  const [employees, setEmployees] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showIdleWarning, setShowIdleWarning] = useState(false);
  const [idleCountdown, setIdleCountdown] = useState(60);

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // State for Dashboard Modals
  const [selectedTx, setSelectedTx] = useState(null);
  const [selectedKycId, setSelectedKycId] = useState(null); // Stores ID to open the full page

  const identity = useMemo(() => {
    const fromService = branchManagerService.getManagerIdentity?.();
    if (fromService && (fromService.name || fromService.email)) return fromService;
    return { name: user?.name || user?.fullName || 'Branch Manager', email: user?.email || '' };
  }, [user]);

  const idleTimerRef = useRef(null);
  const countdownTimerRef = useRef(null);
  const profileMenuRef = useRef(null);

  const load = useCallback(async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    setError('');

    const tasks = [
      {
        label: 'Branch',
        run: () => branchManagerService.getMyBranch(),
        apply: (v) => setBranch(v?.data ?? v ?? null),
      },
      {
        label: 'Customers',
        run: () => branchManagerService.getCustomers({ page: 0, size: 100 }),
        apply: (v) => setCustomers(normalizeList(v?.data ?? v)),
      },
      {
        label: 'Accounts',
        run: () => branchManagerService.getAccounts({ page: 0, size: 100 }),
        apply: (v) => setAccounts(normalizeList(v?.data ?? v)),
      },
      {
        label: 'Transactions',
        run: () => branchManagerService.getTransactions({ page: 0, size: 100 }),
        apply: (v) => setTransactions(normalizeList(v?.data ?? v)),
      },
      {
        label: 'KYC',
        run: () => branchManagerService.getKycRequests(),
        apply: (v) => setKyc(normalizeList(v?.data ?? v)),
      },
      {
        label: 'Employees',
        run: () => branchManagerService.getBranchEmployees(),
        apply: (v) => setEmployees(normalizeList(v?.data ?? v)),
      },
    ];

    const results = await Promise.allSettled(tasks.map((t) => t.run()));
    const failures = [];
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') tasks[i].apply(r.value);
      else failures.push(`${tasks[i].label}: ${r.reason?.message || 'failed'}`);
    });

    if (failures.length === tasks.length)
      setError(`Could not load any data. ${failures.join(' · ')}`);
    else if (failures.length) setError(`Some sections failed: ${failures.join(' · ')}`);

    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const IDLE_TIME = 10 * 60 * 1000;

    const resetTimer = () => {
      if (showIdleWarning) return;
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
        setShowIdleWarning(true);
        startCountdown();
      }, IDLE_TIME);
    };

    const startCountdown = () => {
      setIdleCountdown(60);
      countdownTimerRef.current = setInterval(() => {
        setIdleCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownTimerRef.current);
            if (typeof onSignOut === 'function') onSignOut();
            else navigate('/login', { replace: true });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    };

    const handleActivity = () => resetTimer();
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach((e) => window.addEventListener(e, handleActivity));
    resetTimer();

    return () => {
      events.forEach((e) => window.removeEventListener(e, handleActivity));
      clearTimeout(idleTimerRef.current);
      clearInterval(countdownTimerRef.current);
    };
  }, [navigate, onSignOut, showIdleWarning]);

  const handleStayActive = () => {
    setShowIdleWarning(false);
    setIdleCountdown(60);
    clearInterval(countdownTimerRef.current);
  };

  const stats = useMemo(() => {
    const activeAccounts = accounts.filter(
      (a) => String(a.accountStatus || a.status || '').toUpperCase() === 'ACTIVE'
    ).length;
    const pendingKyc = kyc.filter((k) =>
      ['PENDING', 'UNDER_REVIEW'].includes(
        String(k.verificationStatus || k.kycVerificationStatus || '').toUpperCase()
      )
    ).length;
    const today = new Date().toDateString();
    const todayTxns = transactions.filter(
      (t) => new Date(t.createdAt || t.transactionDate).toDateString() === today
    ).length;

    return {
      customers: customers.length,
      accounts: activeAccounts || accounts.length,
      pendingKyc,
      todayTxns,
      totalEmployees: employees.length,
    };
  }, [customers, accounts, kyc, transactions, employees]);

  const recentActivity = useMemo(() => {
    const txnRows = transactions.slice(0, 8).map((t) => ({
      id: t.transactionId ?? t.id,
      time: t.createdAt ?? t.transactionDate,
      type: t.transactionType ?? t.type ?? 'Transaction',
      ref: t.accountNumber ?? t.fromAccountNumber ?? t.toAccountNumber ?? '—',
      detail: t.description ?? `${formatMoney(t.amount)}`,
      status: t.transactionStatus ?? t.status ?? '—',
      isKyc: false,
      originalData: t,
    }));

    const kycRows = kyc.slice(0, 4).map((k) => ({
      id: k.kycId ?? k.id,
      time: k.createdAt ?? k.updatedAt,
      type: 'KYC',
      ref: shortId(k.customerId),
      detail: `${k.kycType ?? 'KYC'} review`,
      status: k.verificationStatus ?? k.kycVerificationStatus ?? '—',
      isKyc: true,
      originalData: k,
    }));

    return [...txnRows, ...kycRows]
      .sort((a, b) => new Date(b.time ?? 0) - new Date(a.time ?? 0))
      .slice(0, 8);
  }, [transactions, kyc]);

  const confirmLogout = () => {
    setShowLogoutModal(false);
    if (typeof onSignOut === 'function') onSignOut();
    else navigate('/login', { replace: true });
  };

  // Helper to handle sidebar navigation and clear KYC view
  const handleNavClick = (pageId) => {
    setActivePage(pageId);
    setSelectedKycId(null);
  };

  return (
    <div className="bm-shell">
      <aside className="bm-sidebar">
        <a className="bm-brand" href="#dashboard" onClick={(e) => e.preventDefault()}>
          <span className="bm-brand-mark">N</span>
          <span className="bm-brand-text">
            <strong>NOVA BANK</strong>
            <small>Your Trust. Our Priority.</small>
          </span>
        </a>

        <div className="bm-user">
          <span className="bm-avatar">{initials(identity.name)}</span>
          <div className="bm-user-info">
            <b>{identity.name}</b>
            <small>Branch Manager</small>
            <span className="bm-online">
              <i />
              Online
            </span>
          </div>
        </div>

        <div className="bm-nav-label">Workspace</div>
        <nav className="bm-nav">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              className={activePage === item.id && !selectedKycId ? 'active' : ''}
              onClick={() => handleNavClick(item.id)}
            >
              <span className="bm-nav-icon">{item.icon}</span>
              <span className="bm-nav-label-text">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="bm-sidebar-bottom">
          <button className="bm-logout" onClick={() => setShowLogoutModal(true)}>
            <span className="bm-nav-icon">⏻</span>
            <span>Logout</span>
          </button>
          <div className="bm-secure">
            <span className="bm-secure-dot" />
            Signed in securely
          </div>
        </div>
      </aside>

      <div className="bm-main">
        <header className="bm-topbar">
          <div className="bm-topbar-left">
            <div className="bm-topbar-title">
              <strong>Branch Manager Dashboard</strong>
              <span>Branch operations &amp; team management</span>
            </div>
          </div>
          <div className="bm-topbar-right">
            <button className="bm-icon-btn" aria-label="Notifications">
              🔔<span className="bm-badge">{stats.pendingKyc}</span>
            </button>

            <div style={{ position: 'relative' }} ref={profileMenuRef}>
              <button
                className="bm-profile"
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                style={{ cursor: 'pointer' }}
              >
                <span className="bm-avatar-sm">{initials(identity.name)}</span>
                <span className="bm-profile-name">{identity.name}</span>
              </button>

              {showProfileMenu && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '8px',
                    background: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    minWidth: '200px',
                    zIndex: 50,
                    overflow: 'hidden',
                  }}
                >
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      navigate('/profile');
                    }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '12px 16px',
                      background: 'transparent',
                      border: 'none',
                      borderBottom: '1px solid #f1f5f9',
                      cursor: 'pointer',
                      fontSize: '13px',
                      color: '#1e293b',
                    }}
                  >
                    👤 View Profile
                  </button>
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      setShowPasswordModal(true);
                    }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '12px 16px',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '13px',
                      color: '#1e293b',
                    }}
                  >
                    🔒 Change Password
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="bm-content">
          
          {/* IF A KYC ID IS SELECTED, SHOW THE KYC DETAIL PAGE INSIDE THE MAIN CONTENT */}
          {selectedKycId ? (
             <div style={{ background: '#fff', borderRadius: '14px', border: '1px solid #e1e7f0', padding: '20px', minHeight: '500px' }}>
                <KycApplicationDetail
                  kycId={selectedKycId}
                  onBack={() => setSelectedKycId(null)}
                  onUpdate={load}
                />
             </div>
          ) : (
            /* OTHERWISE, SHOW THE NORMAL DASHBOARD PAGES */
            <>
              {activePage === 'Customers' && (
                <BranchCustomersPage customers={customers} loading={loading} />
              )}
              {activePage === 'Accounts' && (
                <BranchAccountsPage
                  accounts={accounts}
                  customers={customers}
                  loading={loading}
                  onRefresh={load}
                />
              )}
              {activePage === 'Transactions' && (
                <BranchTransactionsPage
                  transactions={transactions}
                  loading={loading}
                  onRefresh={load}
                />
              )}
              {activePage === 'KYC' && (
                <BranchKycPage kycList={kyc} loading={loading} onRefresh={load} />
              )}
              {activePage === 'Loans' && (
               <BankLoanManagerPage
                 onBack={() => setActivePage('Dashboard')}
                 isBranchManager
                 canManageProducts
                 canProcessApplications
                 currentUser={user}
                 onSignOut={onSignOut}
               />
              )}

              {activePage === 'Employees' && (
                <BranchEmployeesPage
                  employees={employees}
                  loading={loading}
                  onRefresh={() => load(true)}
                  currentBranchId={branch?.branchCode}
                />
              )}

              {activePage === 'Reports' && (
                <BranchReportsPage
                  accounts={accounts}
                  transactions={transactions}
                  customers={customers}
                />
              )}
              {activePage === 'Settings' && (
                <BranchSettingsPage branch={branch} identity={identity} />
              )}

              {activePage === 'Dashboard' && (
                <>
                  <div className="bm-welcome">
                    <div>
                      <h1>Welcome back, {identity.name.split(' ')[0] || 'Manager'}!</h1>
                      <p>
                        Manage your branch operations, monitor customers, and keep the team on track.
                      </p>
                    </div>
                    <div className="bm-welcome-side">
                      <div className="bm-branch-chip">
                        <span className="bm-branch-icon">🏛</span>
                        <div>
                          <b>{branch?.branchName || 'Assigned branch'}</b>
                          <small>
                            {branch?.branchCode
                              ? `Branch Code · ${branch.branchCode}`
                              : 'Branch Code · —'}
                            {branch?.city ? ` · ${branch.city}` : ''}
                          </small>
                        </div>
                      </div>
                      <div className="bm-date-chip">
                        <span>📅</span>
                        <div>
                          <b>
                            {new Intl.DateTimeFormat('en-IN', {
                              weekday: 'short',
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            }).format(new Date())}
                          </b>
                          <small>
                            {new Intl.DateTimeFormat('en-IN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            }).format(new Date())}
                          </small>
                        </div>
                      </div>
                    </div>
                  </div>

                  {error && (
                    <div className="bm-alert" role="alert">
                      {error}
                      <button onClick={load} disabled={refreshing}>
                        {refreshing ? 'Retrying…' : 'Retry'}
                      </button>
                    </div>
                  )}

                  <section
                    className="bm-kpis"
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                      gap: '16px',
                      marginBottom: '24px',
                    }}
                  >
                    <KpiCard icon="👥" label="Total customers" value={stats.customers} tone="blue" loading={loading} />
                    <KpiCard icon="▣" label="Active accounts" value={stats.accounts} tone="violet" loading={loading} />
                    <KpiCard icon="🛡" label="Pending KYC" value={stats.pendingKyc} tone="amber" loading={loading} />
                    <KpiCard icon="⇄" label="Today's transactions" value={stats.todayTxns} tone="green" loading={loading} />
                    <KpiCard icon="👔" label="Total employees" value={stats.totalEmployees} tone="blue" loading={loading} />
                  </section>

                  <section
                    className="bm-grid"
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr',
                      gap: '24px',
                      alignItems: 'start',
                    }}
                  >
                    <div className="bm-panel" style={{ overflow: 'visible' }}>
                      <div className="bm-panel-head">
                        <div>
                          <h2>Recent branch activity</h2>
                          <p>Latest transactions and KYC actions</p>
                        </div>
                        <button className="bm-ghost" onClick={() => setActivePage('Transactions')}>
                          View all →
                        </button>
                      </div>
                      <div className="bm-table-wrap" style={{ overflowX: 'auto' }}>
                        <table className="bm-table" style={{ width: '100%', tableLayout: 'auto' }}>
                          <thead>
                            <tr>
                              <th style={{ width: '20%' }}>Time</th>
                              <th style={{ width: '15%' }}>Type</th>
                              <th style={{ width: '25%' }}>Reference</th>
                              <th style={{ width: '25%' }}>Details</th>
                              <th style={{ width: '15%' }}>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {loading ? (
                              <tr>
                                <td colSpan="5" className="bm-empty">
                                  Loading activity…
                                </td>
                              </tr>
                            ) : recentActivity.length === 0 ? (
                              <tr>
                                <td colSpan="5" className="bm-empty">
                                  No recent activity.
                                </td>
                              </tr>
                            ) : (
                              recentActivity.map((row, i) => (
                                <tr
                                  key={`${row.id || i}`}
                                  onClick={() => {
                                    if (row.isKyc) {
                                      setSelectedKycId(row.id);
                                    } else {
                                      setSelectedTx(row.originalData);
                                    }
                                  }}
                                  style={{ cursor: 'pointer' }}
                                  className="bm-row-hover"
                                >
                                  <td className="bm-cell-time">
                                    {formatDate(row.time)} · {formatTime(row.time)}
                                  </td>
                                  <td>{row.type}</td>
                                  <td className="bm-cell-ref">{row.ref}</td>
                                  <td>{row.detail}</td>
                                  <td>
                                    <StatusPill tone={statusTone(row.status)}>
                                      {String(row.status).replaceAll('_', ' ')}
                                    </StatusPill>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </section>

                  <footer className="bm-footer">
                    © 2026 Nova Bank · Branch Operations
                    <span>{refreshing ? 'Refreshing…' : 'Live data'}</span>
                  </footer>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {showLogoutModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
          onClick={() => setShowLogoutModal(false)}
        >
          <div
            style={{
              background: '#fff',
              padding: '24px',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '400px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', color: '#0f172a' }}>
              Log out of Nova Bank?
            </h3>
            <p
              style={{
                color: '#64748b',
                fontSize: '14px',
                margin: '0 0 24px 0',
                lineHeight: 1.5,
              }}
            >
              Are you sure you want to securely log out of your account? You will need to sign
              in again to continue.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                onClick={() => setShowLogoutModal(false)}
                style={{
                  padding: '8px 16px',
                  background: 'transparent',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  color: '#475569',
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmLogout}
                style={{
                  padding: '8px 16px',
                  background: '#e11d48',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  color: 'white',
                }}
              >
                Yes, log out
              </button>
            </div>
          </div>
        </div>
      )}

      {showIdleWarning && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
          }}
        >
          <div
            style={{
              background: '#fff',
              padding: '24px',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '400px',
              textAlign: 'center',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>⏳</div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', color: '#0f172a' }}>
              Are you still there?
            </h3>
            <p
              style={{
                color: '#64748b',
                fontSize: '14px',
                margin: '0 0 24px 0',
                lineHeight: 1.5,
              }}
            >
              For your security, you will be logged out automatically in{' '}
              <b>{idleCountdown}</b> seconds due to inactivity.
            </p>
            <button
              onClick={handleStayActive}
              style={{
                width: '100%',
                padding: '12px',
                background: '#1769e0',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '14px',
              }}
            >
              I'm still here, continue session
            </button>
          </div>
        </div>
      )}

      {showPasswordModal && (
        <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />
      )}

      {selectedTx && (
        <TransactionModal transaction={selectedTx} onClose={() => setSelectedTx(null)} />
      )}
    </div>
  );
}

/* =========================================================
   Small Presentational Helpers
   ========================================================= */

function KpiCard({ icon, label, value, tone = 'blue', loading }) {
  return (
    <article className={`bm-kpi bm-kpi-${tone}`}>
      <span className="bm-kpi-icon">{icon}</span>
      <div className="bm-kpi-body">
        <span className="bm-kpi-label" style={{ fontSize: '12px' }}>
          {label}
        </span>
        <strong className="bm-kpi-value" style={{ fontSize: '20px' }}>
          {loading ? '—' : value}
        </strong>
      </div>
    </article>
  );
}

function StatusPill({ tone = 'neutral', children }) {
  return <span className={`bm-status bm-status-${tone}`}>{children}</span>;
}

function EmptyState({ icon = '📭', title = 'Nothing here yet', message = '' }) {
  return (
    <div style={{ padding: '48px 24px', textAlign: 'center', color: '#64748b' }}>
      <div style={{ fontSize: '40px', marginBottom: '12px' }}>{icon}</div>
      <h3 style={{ margin: '0 0 6px', fontSize: '15px', color: '#0f172a' }}>{title}</h3>
      {message && <p style={{ margin: 0, fontSize: '13px' }}>{message}</p>}
    </div>
  );
}