import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clearAuthSession, getSavedAuthUser } from '../../../../services/apiClient';
import adminService from '../../../../services/adminService';
import CustomerManagementPage from './CustomerManagementPage';
import BranchManagementPage from './BranchManagementPage';
import AccountManagementPage from './AccountManagementPage';
import KycManagementPage from './KycManagementPage';
import TransactionManagementPage from './TransactionManagementPage';
import ReportsAnalyticsPage from './ReportsAnalyticsPage';
import EmployeeManagementPage from './EmployeeManagementPage';
import BranchDetailsPage from './BranchDetailsPage';
import BankLoanManagerPage from '../bankManager/loan/BankLoanManagerPage';
import './AdminDashboard.css';

const { normalizeList, pageTotal } = adminService;

const initials = (name) =>
  String(name || 'Admin').trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || 'AD';

const formatMoney = (v) => {
  if (v == null || v === '') return '—';
  const n = Number(v);
  return Number.isNaN(n) ? String(v) : new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
};

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

const shortId = (id, len = 14) => (id ? String(id).slice(0, len) : '—');

const statusTone = (s) => {
  const v = String(s || '').toUpperCase();
  if (['SUCCESS', 'COMPLETED', 'APPROVED', 'ACTIVE'].includes(v)) return 'ok';
  if (['PENDING', 'UNDER_REVIEW', 'PROCESSING', 'IN_PROGRESS'].includes(v)) return 'warn';
  if (['FAILED', 'REJECTED', 'CLOSED', 'DECLINED'].includes(v)) return 'bad';
  return 'neutral';
};

const NAV_ITEMS = [
  { label: 'Dashboard', icon: '▦', id: 'Dashboard' },
  { label: 'Customer Management', icon: '👥', id: 'Customers' },
  { label: 'Employee Management', icon: '💼', id: 'Employees' },
  { label: 'Branch Management', icon: '🏛', id: 'Branches' },
  { label: 'Account Management', icon: '▣', id: 'Accounts' },
  { label: 'KYC Oversight', icon: '🛡', id: 'KYC' },
  { label: 'Transaction Monitoring', icon: '⇄', id: 'Transactions' },
  { label: 'Reports & Analytics', icon: '▤', id: 'Reports' },
  { label: 'Loan Products', icon: '₹', id: 'Loans' },
  { label: 'Settings', icon: '⚙', id: 'Settings' },
];

export default function AdminDashboardPage({ user, onSignOut }) {
  const navigate = useNavigate();

  const [activePage, setActivePage] = useState('Dashboard');
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
  
  // 👈 State for the Logout Confirmation Modal
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const [customers, setCustomers] = useState([]);
  const [customerTotal, setCustomerTotal] = useState(0);
  const [accounts, setAccounts] = useState([]);
  const [accountTotal, setAccountTotal] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [transactionTotal, setTransactionTotal] = useState(0);
  const [branches, setBranches] = useState([]);
  const [kyc, setKyc] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const identity = useMemo(() => {
    const saved = getSavedAuthUser();
    const merged = { ...(saved || {}), ...(user || {}) };
    return {
      name: merged.fullName ?? merged.name ?? merged.email ?? 'Administrator',
      email: merged.email ?? '',
      roles: merged.roles || [],
    };
  }, [user]);

  const load = useCallback(async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    setError('');

    const tasks = [
      { label: 'Customers', run: () => adminService.getAllCustomers({ page: 0, size: 100 }), apply: (v) => { setCustomers(normalizeList(v)); setCustomerTotal(pageTotal(v)); } },
      { label: 'Accounts', run: () => adminService.getAllAccounts({ page: 0, size: 100 }), apply: (v) => { setAccounts(normalizeList(v)); setAccountTotal(pageTotal(v)); } },
      { label: 'Transactions', run: () => adminService.getAllTransactions({ page: 0, size: 100 }), apply: (v) => { setTransactions(normalizeList(v)); setTransactionTotal(pageTotal(v)); } },
      { label: 'Branches', run: () => adminService.searchBranches({ page: 0, size: 100 }), apply: (v) => setBranches(normalizeList(v)) },
      { label: 'KYC', run: () => adminService.getAllKyc(), apply: (v) => setKyc(normalizeList(v)) },
    ];

    const results = await Promise.allSettled(tasks.map((t) => t.run()));
    const failures = [];
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') tasks[i].apply(r.value);
      else failures.push(`${tasks[i].label}: ${r.reason?.message || 'failed'}`);
    });

    if (failures.length === tasks.length) {
      setError(`Could not load any data. ${failures.join(' · ')}`);
    } else if (failures.length) {
      setError(`Some sections failed: ${failures.join(' · ')}`);
    }

    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const stats = useMemo(() => {
    const today = new Date().toDateString();
    const txnsToday = transactions.filter((t) => { const d = t.createdAt ?? t.transactionDate; return d && new Date(d).toDateString() === today; }).length;
    const txnsFailed = transactions.filter((t) => String(t.transactionStatus ?? t.status ?? '').toUpperCase() === 'FAILED').length;
    const pendingKyc = kyc.filter((k) => ['PENDING', 'UNDER_REVIEW'].includes(String(k.verificationStatus ?? k.kycVerificationStatus ?? '').toUpperCase())).length;
    const approvedKyc = kyc.filter((k) => String(k.verificationStatus ?? k.kycVerificationStatus ?? '').toUpperCase() === 'APPROVED').length;
    const activeAccounts = accounts.filter((a) => String(a.accountStatus ?? a.status ?? '').toUpperCase() === 'ACTIVE').length;
    const activeBranches = branches.filter((b) => String(b.status ?? '').toUpperCase() === 'ACTIVE').length;

    return {
      customers: customerTotal || customers.length, accounts: accountTotal || accounts.length, activeAccounts,
      branches: branches.length, activeBranches, kycTotal: kyc.length, pendingKyc, approvedKyc,
      txnsToday, txnsFailed, txnsTotal: transactionTotal || transactions.length,
    };
  }, [customerTotal, customers, accountTotal, accounts, transactions, transactionTotal, kyc, branches]);

  const recentActivity = useMemo(() => {
    const txns = transactions.slice(0, 8).map((t) => ({
      id: t.transactionId ?? t.id, time: t.createdAt ?? t.transactionDate, type: t.transactionType ?? t.type ?? 'Transaction',
      ref: t.accountNumber ?? t.fromAccountNumber ?? t.toAccountNumber ?? '—', detail: t.description ?? formatMoney(t.amount), status: t.transactionStatus ?? t.status ?? '—',
    }));

    const kycRows = kyc.slice(0, 4).map((k) => ({
      id: k.kycId ?? k.id, time: k.createdAt ?? k.updatedAt, type: 'KYC', ref: shortId(k.customerId), detail: `${k.kycType ?? 'KYC'} review`, status: k.verificationStatus ?? k.kycVerificationStatus ?? '—',
    }));

    return [...txns, ...kycRows].sort((a, b) => new Date(b.time ?? 0) - new Date(a.time ?? 0)).slice(0, 8);
  }, [transactions, kyc]);

  const handleLogout = () => {
    clearAuthSession();
    if (typeof onSignOut === 'function') onSignOut();
    else navigate('/login', { replace: true });
  };

  return (
    <div className="ad-shell">
      <aside className="ad-sidebar">
        <a className="ad-brand" href="#dashboard" onClick={(e) => e.preventDefault()}>
          <span className="ad-brand-mark">N</span>
          <span className="ad-brand-text">
            <strong>NOVA BANK</strong>
            <small>Your Trust. Our Priority.</small>
          </span>
        </a>

        <div className="ad-user">
          <span className="ad-avatar">{initials(identity.name)}</span>
          <div className="ad-user-info">
            <b>{identity.name}</b>
            <small>Super Admin</small>
            <span className="ad-online"><i />Online</span>
          </div>
        </div>

        <div className="ad-nav-label">Workspace</div>
        <nav className="ad-nav">
          {NAV_ITEMS.map((item) => (
            <button key={item.id} className={activePage === item.id ? 'active' : ''} onClick={() => { setActivePage(item.id); setSelectedBranch(null); }}>
              <span className="ad-nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="ad-sidebar-bottom">
          {/* 👈 Trigger the confirmation modal here */}
          <button className="ad-logout" onClick={() => setShowLogoutModal(true)}>
            <span className="ad-nav-icon">⏻</span>
            <span>Logout</span>
          </button>
          <div className="ad-secure">
            <span className="ad-secure-dot" /> Signed in securely
          </div>
        </div>
      </aside>

      <div className="ad-main">
        <header className="ad-topbar">
          <div className="ad-topbar-left">
            <div className="ad-topbar-title">
              <strong>Super Admin Dashboard</strong>
              <span>Bank-wide operations &amp; oversight</span>
            </div>
          </div>
          
          <div className="ad-topbar-right" style={{ position: 'relative' }}>
            <button className="ad-icon-btn" aria-label="Notifications">
              🔔
              <span className="ad-badge">{stats.pendingKyc + stats.txnsFailed}</span>
            </button>

            <button className="ad-profile" onClick={() => setProfileOpen(!profileOpen)} title="View Profile">
              <span className="ad-avatar-sm">{initials(identity.name)}</span>
              <span className="ad-profile-name">{identity.name}</span>
              <span className="ad-chevron"></span>
            </button>

            {profileOpen && (
              <div className="ad-profile-popover">
                <div className="ad-popover-header">
                  <span className="ad-avatar-lg">{initials(identity.name)}</span>
                  <div><b>{identity.name}</b><small>{identity.email}</small></div>
                </div>
                <div className="ad-popover-body">
                  <div className="ad-popover-row"><span>Role</span><b>{identity.roles[0] || 'ADMIN'}</b></div>
                  <div className="ad-popover-row"><span>Status</span><span className="ad-status ad-status-ok">Active</span></div>
                </div>
                <div className="ad-popover-footer">
                  {/* 👈 Trigger the confirmation modal here too */}
                  <button onClick={() => { setProfileOpen(false); setShowLogoutModal(true); }} className="ad-logout-btn">
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        <div className="ad-content">
          {selectedBranch ? (
            <BranchDetailsPage branch={selectedBranch} onBack={() => setSelectedBranch(null)} />
          ) : (
            <>
              {activePage === 'Customers' && <CustomerManagementPage />}
              {activePage === 'Employees' && <EmployeeManagementPage />}
              {activePage === 'Branches' && <BranchManagementPage onViewBranch={(branch) => setSelectedBranch(branch)} />}
              {activePage === 'Accounts' && <AccountManagementPage />}
              {activePage === 'KYC' && <KycManagementPage />}
              {activePage === 'Transactions' && <TransactionManagementPage />}
              {activePage === 'Reports' && <ReportsAnalyticsPage />}
              {activePage === 'Loans' && (
                <BankLoanManagerPage
                  canManageProducts
                  canProcessApplications
                  isBranchManager
                  currentUser={user}
                  onSignOut={onSignOut}
                />
              )}

              {!['Dashboard', 'Customers', 'Employees', 'Branches', 'Accounts', 'KYC', 'Transactions', 'Reports', 'Loans'].includes(activePage) && (
                <div className="ad-panel" style={{ padding: '40px', textAlign: 'center', color: '#7c879a' }}>
                  <h2>{activePage} Module</h2>
                  <p>This section is currently under construction.</p>
                </div>
              )}

              {activePage === 'Dashboard' && (
                <>
                  <div className="ad-welcome">
                    <div>
                      <h1>Welcome back, {identity.name.split(' ')[0]}!</h1>
                      <p>Monitor bank-wide operations, review activity, and oversee customer, branch, and compliance workflows.</p>
                    </div>
                    <div className="ad-welcome-side">
                      <div className="ad-chip">
                        <span className="ad-chip-icon">🏛</span>
                        <div><b>{stats.branches} branches</b><small>{stats.activeBranches} active</small></div>
                      </div>
                      <div className="ad-chip">
                        <span className="ad-chip-icon">📅</span>
                        <div>
                          <b>{new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }).format(new Date())}</b>
                          <small>{new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit' }).format(new Date())}</small>
                        </div>
                      </div>
                    </div>
                  </div>

                  {error && (
                    <div className="ad-alert" role="alert">
                      {error}
                      <button onClick={load} disabled={refreshing}>{refreshing ? 'Retrying…' : 'Retry'}</button>
                    </div>
                  )}

                  <section className="ad-kpis">
                    <Kpi icon="👥" label="Total customers" value={stats.customers} tone="blue" loading={loading} />
                    <Kpi icon="▣" label="Total accounts" value={stats.accounts} tone="violet" loading={loading} />
                    <Kpi icon="🏛" label="Total branches" value={stats.branches} tone="green" loading={loading} />
                    <Kpi icon="🛡" label="Pending KYC" value={stats.pendingKyc} tone="amber" loading={loading} />
                    <Kpi icon="⇄" label="Today's transactions" value={stats.txnsToday} tone="teal" loading={loading} />
                    <Kpi icon="⚠" label="Failed transactions" value={stats.txnsFailed} tone="red" loading={loading} />
                    <Kpi icon="✓" label="Approved KYC" value={stats.approvedKyc} tone="green" loading={loading} />
                    <Kpi icon="◆" label="Active accounts" value={stats.activeAccounts} tone="blue" loading={loading} />
                  </section>

                  <section className="ad-grid">
                    <div className="ad-panel">
                      <div className="ad-panel-head">
                        <div><h2>Recent system activity</h2><p>Latest transactions and KYC events</p></div>
                        <button className="ad-ghost" onClick={() => setActivePage('Transactions')}>View all →</button>
                      </div>

                      <div className="ad-table-wrap">
                        <table className="ad-table">
                          <thead>
                            <tr><th>Time</th><th>Type</th><th>Reference</th><th>Details</th><th>Status</th></tr>
                          </thead>
                          <tbody>
                            {loading ? (
                              <tr><td colSpan="5" className="ad-empty">Loading activity…</td></tr>
                            ) : recentActivity.length === 0 ? (
                              <tr><td colSpan="5" className="ad-empty">No recent activity.</td></tr>
                            ) : (
                              recentActivity.map((row, i) => (
                                <tr key={`${row.id || i}`}>
                                  <td className="ad-cell-time">{formatDate(row.time)} · {formatTime(row.time)}</td>
                                  <td>{row.type}</td>
                                  <td className="ad-cell-ref">{row.ref}</td>
                                  <td>{row.detail}</td>
                                  <td><StatusPill tone={statusTone(row.status)}>{String(row.status).replaceAll('_', ' ')}</StatusPill></td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="ad-panel">
                      <div className="ad-panel-head">
                        <div><h2>Quick actions</h2><p>Common administrative tasks</p></div>
                      </div>

                      <ul className="ad-actions">
                        <ActionRow icon="👥" label="Search customers" hint={`${stats.customers} records`} onClick={() => setActivePage('Customers')} />
                        <ActionRow icon="💼" label="Manage employees" hint="HR & Roles" onClick={() => setActivePage('Employees')} />
                        <ActionRow icon="🏛" label="Manage branches" hint={`${stats.branches} branches`} onClick={() => setActivePage('Branches')} />
                        <ActionRow icon="🛡" label="Review KYC queue" hint={`${stats.pendingKyc} pending`} onClick={() => setActivePage('KYC')} />
                        <ActionRow icon="⇄" label="Monitor transactions" hint={`${stats.txnsTotal} total`} onClick={() => setActivePage('Transactions')} />
                        <ActionRow icon="▣" label="Manage accounts" hint={`${stats.accounts} accounts`} onClick={() => setActivePage('Accounts')} />
                      </ul>
                    </div>
                  </section>

                  <footer className="ad-footer">
                    © 2026 Nova Bank · Super Admin
                    <span>{refreshing ? 'Refreshing…' : 'Live data'}</span>
                  </footer>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* 👈 LOGOUT CONFIRMATION MODAL */}
      {showLogoutModal && (
        <div 
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}
          onClick={() => setShowLogoutModal(false)}
        >
          <div 
            style={{ background: '#fff', padding: '24px', borderRadius: '12px', width: '100%', maxWidth: '400px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', color: '#0f172a' }}>Log out of Nova Bank?</h3>
            <p style={{ color: '#64748b', fontSize: '14px', margin: '0 0 24px 0', lineHeight: 1.5 }}>
              Are you sure you want to securely log out of your account? You will need to sign in again to continue.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button onClick={() => setShowLogoutModal(false)} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, color: '#475569' }}>
                Cancel
              </button>
              <button onClick={handleLogout} style={{ padding: '8px 16px', background: '#e11d48', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, color: 'white' }}>
                Yes, log out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Kpi({ icon, label, value, tone = 'blue', loading }) {
  return (
    <article className={`ad-kpi ad-kpi-${tone}`}>
      <span className="ad-kpi-icon">{icon}</span>
      <div className="ad-kpi-body">
        <span className="ad-kpi-label">{label}</span>
        <strong className="ad-kpi-value">{loading ? '—' : value}</strong>
      </div>
    </article>
  );
}

function StatusPill({ tone = 'neutral', children }) {
  return <span className={`ad-status ad-status-${tone}`}>{children}</span>;
}

function ActionRow({ icon, label, hint, onClick }) {
  return (
    <li>
      <button type="button" className="ad-action" onClick={onClick}>
        <span className="ad-action-icon">{icon}</span>
        <span className="ad-action-text">
          <b>{label}</b>
          <small>{hint}</small>
        </span>
        <span className="ad-action-arrow">›</span>
      </button>
    </li>
  );
}