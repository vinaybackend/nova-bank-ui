import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { clearAuthSession } from '../../../../services/apiClient';
import { fetchAllKyc } from '../../../../services/kycOfficerService';
import KycApplicationDetail from './KycApplicationDetail'; 
import ChangePasswordModal from '../../../profile/ChangePasswordModal'; // 👈 Import the modal
import './KycOfficerDashboard.css';

const getId = (item) => item?.kycId ?? item?.id ?? '';
const getCustomerId = (item) => item?.customerId ?? '';
const getStatus = (item) =>
  String(item?.verificationStatus ?? item?.status ?? 'PENDING').toUpperCase();
const statusLabel = (s) => String(s || '').replaceAll('_', ' ');
const formatDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? String(value)
    : d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
};

export default function KycOfficerDashboard({ onSignOut }) {
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [view, setView] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [activeTab, setActiveTab] = useState('DASHBOARD'); 
  const [selectedKycId, setSelectedKycId] = useState(null);

  // 👈 State for password modal and dropdown
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef(null);

  function handleLogout() {
    clearAuthSession();
    if (typeof onSignOut === 'function') onSignOut();
    else navigate('/login', { replace: true });
  }

  const loadApplications = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchAllKyc();
      setApplications(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Unable to load KYC applications.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  // 👈 Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const stats = useMemo(
    () => ({
      total: applications.length,
      pending: applications.filter((i) =>
        ['PENDING', 'UNDER_REVIEW'].includes(getStatus(i))
      ).length,
      approved: applications.filter((i) => getStatus(i) === 'APPROVED').length,
      rejected: applications.filter((i) => getStatus(i) === 'REJECTED').length,
    }),
    [applications]
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    let result = applications.filter((item) => {
      const status = getStatus(item);
      const text = [getId(item), getCustomerId(item), item?.kycType]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return (
        (!query || text.includes(query)) &&
        (filter === 'ALL' || status === filter)
      );
    });
    if (view === 'QUEUE') {
      result = result.filter((i) =>
        ['PENDING', 'UNDER_REVIEW'].includes(getStatus(i))
      );
    }
    result.sort(
      (a, b) => new Date(b.createdAt ?? 0) - new Date(a.createdAt ?? 0)
    );
    return result;
  }, [applications, search, filter, view]);

  return (
    <div className="kyc-shell">
      <aside className="kyc-sidebar">
        <a href="#dashboard" className="kyc-brand" onClick={(e) => { 
          e.preventDefault(); 
          setSelectedKycId(null); 
          setActiveTab('DASHBOARD'); 
          setView('ALL'); 
          setFilter('ALL'); 
        }}>
          <span className="kyc-brand-mark">N</span>
          <span className="kyc-brand-text">
            <strong>NOVA BANK</strong>
            <small>Your Trust. Our Priority.</small>
          </span>
        </a>

        <div className="kyc-user">
          <span className="kyc-avatar">KO</span>
          <div className="kyc-user-info">
            <b>KYC Officer</b>
            <small>Verification Team</small>
            <span className="kyc-online">Online</span>
          </div>
        </div>

        <div className="kyc-nav-label">Workspace</div>
        <nav className="kyc-nav">
          <button 
            className={!selectedKycId && activeTab === 'DASHBOARD' ? 'active' : ''} 
            onClick={() => { 
              setSelectedKycId(null); 
              setActiveTab('DASHBOARD');
              setView('ALL'); 
              setFilter('ALL'); 
            }}
          >
            <span className="kyc-nav-icon">▦</span>
            <span>Dashboard</span>
          </button>

          <button 
            className={!selectedKycId && activeTab === 'APPLICATIONS' ? 'active' : ''} 
            onClick={() => { 
              setSelectedKycId(null); 
              setActiveTab('APPLICATIONS');
              setView('ALL'); 
              setFilter('ALL'); 
            }}
          >
            <span className="kyc-nav-icon">◈</span>
            <span>KYC Applications</span>
          </button>

          <button 
            className={!selectedKycId && activeTab === 'QUEUE' ? 'active' : ''}
            onClick={() => { 
              setSelectedKycId(null); 
              setActiveTab('QUEUE');
              setView('QUEUE'); 
              setFilter('ALL'); 
            }}
          >
            <span className="kyc-nav-icon">◷</span>
            <span>Review Queue</span>
          </button>
        </nav>

        <div className="kyc-sidebar-bottom">
          <button className="kyc-logout" onClick={handleLogout}>
            <span className="kyc-nav-icon">⏻</span>
            <span>Logout</span>
          </button>
          <div className="kyc-secure">
            <span className="kyc-secure-dot" />
            Signed in securely
          </div>
        </div>
      </aside>

      <div className="kyc-main">
        {selectedKycId ? (
          <div className="kyc-content" style={{ padding: '20px 24px' }}>
            <KycApplicationDetail 
              kycId={selectedKycId} 
              onBack={() => setSelectedKycId(null)} 
              onUpdate={loadApplications} 
            />
          </div>
        ) : (
          <>
            <header className="kyc-topbar">
              <div className="kyc-topbar-left">
                <button className="kyc-icon-btn" aria-label="Menu">☰</button>
                <div className="kyc-topbar-title">
                  <strong>KYC Operations</strong>
                  <span>Identity verification workspace</span>
                </div>
              </div>
              <div className="kyc-topbar-right">
                <button className="kyc-icon-btn kyc-notify" aria-label="Notifications">
                  🔔
                  <span className="kyc-notify-badge">2</span>
                </button>
                
                {/* 👈 Profile Dropdown Wrapper */}
                <div style={{ position: 'relative' }} ref={profileMenuRef}>
                  <button 
                    className="kyc-profile" 
                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                    style={{ cursor: 'pointer', background: 'transparent', border: 'none' }}
                  >
                    <span className="kyc-avatar-sm">KO</span>
                    <span>KYC Officer</span>
                  </button>

                  {showProfileMenu && (
                    <div style={{
                      position: 'absolute', top: '100%', right: 0, marginTop: '8px', 
                      background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', 
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', minWidth: '200px', zIndex: 50, overflow: 'hidden'
                    }}>
                      <button 
                        onClick={() => { setShowProfileMenu(false); navigate('/profile'); }}
                        style={{ width: '100%', textAlign: 'left', padding: '12px 16px', background: 'transparent', border: 'none', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', fontSize: '13px', color: '#1e293b' }}
                      >
                        👤 View Profile
                      </button>
                      <button 
                        onClick={() => { setShowProfileMenu(false); setShowPasswordModal(true); }}
                        style={{ width: '100%', textAlign: 'left', padding: '12px 16px', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '13px', color: '#1e293b' }}
                      >
                        🔒 Change Password
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </header>

            <div className="kyc-content">
              <div className="kyc-welcome">
                <div>
                  <h1>
                    {activeTab === 'DASHBOARD' ? 'Welcome to your KYC workspace' : 
                     activeTab === 'APPLICATIONS' ? 'All KYC Applications' : 
                     'Review Queue'}
                  </h1>
                  <p>
                    {activeTab === 'DASHBOARD' ? 'Review customer identity verification and keep your banking secure.' : 
                     activeTab === 'APPLICATIONS' ? 'Browse and manage all submitted KYC profiles.' : 
                     'Focus on pending applications requiring your review.'}
                  </p>
                </div>
                <div className="kyc-welcome-meta">
                  <span className="kyc-chip">
                    <span className="kyc-chip-dot" />
                    KYC OFFICER · ACTIVE
                  </span>
                  <span className="kyc-date">
                    📅 {new Intl.DateTimeFormat('en-IN', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    }).format(new Date())}
                  </span>
                </div>
              </div>

              {error && (
                <div className="kyc-alert" role="alert">
                  {error}
                  <button onClick={() => setError('')}>Dismiss</button>
                </div>
              )}

              {activeTab === 'DASHBOARD' && (
                <>
                  <div className="kyc-stats" style={{ marginBottom: '24px' }}>
                    <StatCard icon="▤" label="Total" value={stats.total} tone="blue" />
                    <StatCard icon="◷" label="Awaiting review" value={stats.pending} tone="orange" />
                    <StatCard icon="✓" label="Approved" value={stats.approved} tone="green" />
                    <StatCard icon="×" label="Rejected" value={stats.rejected} tone="red" />
                  </div>
                </>
              )}

              <section className="kyc-panel">
                <div className="kyc-panel-head">
                  <div>
                    <h2>
                      {activeTab === 'DASHBOARD' ? 'Recent KYC Submissions' : 
                       activeTab === 'APPLICATIONS' ? 'All Applications' : 
                       'Pending Applications'}
                    </h2>
                    <p>Click View to open the full application.</p>
                  </div>
                  <button
                    type="button"
                    className="kyc-refresh"
                    onClick={loadApplications}
                    disabled={loading}
                  >
                    ↻ {loading ? 'Loading…' : 'Refresh'}
                  </button>
                </div>

                {activeTab !== 'DASHBOARD' && (
                  <div className="kyc-filters">
                    <label className="kyc-field">
                      <span>Status</span>
                      <select value={filter} onChange={(e) => setFilter(e.target.value)}>
                        <option value="ALL">All statuses</option>
                        <option value="PENDING">Pending</option>
                        <option value="UNDER_REVIEW">Under review</option>
                        <option value="APPROVED">Approved</option>
                        <option value="REJECTED">Rejected</option>
                      </select>
                    </label>
                    <label className="kyc-field kyc-field-search">
                      <span>Search</span>
                      <div className="kyc-search-wrap">
                        <span className="kyc-search-icon">🔍</span>
                        <input
                          type="search"
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          placeholder="Search KYC ID, customer ID…"
                        />
                      </div>
                    </label>
                  </div>
                )}

                <div className="kyc-table-wrapper">
                  <table className="kyc-table">
                    <thead>
                      <tr>
                        <th>KYC ID</th>
                        <th>Customer ID</th>
                        <th>Type</th>
                        <th>Status</th>
                        <th>Submitted</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan="6" className="kyc-empty">Loading applications…</td>
                        </tr>
                      ) : filtered.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="kyc-empty">No matching applications found.</td>
                        </tr>
                      ) : (
                        filtered.map((item, index) => (
                          <tr key={getId(item) || index}>
                            <td className="kyc-col-id">{getId(item)}</td>
                            <td>{getCustomerId(item)}</td>
                            <td>{item.kycType ?? '—'}</td>
                            <td><StatusBadge status={getStatus(item)} /></td>
                            <td>{formatDate(item.createdAt)}</td>
                            <td className="kyc-col-action">
                              <button
                                type="button"
                                className="kyc-view-btn"
                                onClick={() => setSelectedKycId(getId(item))}
                                style={{ background: 'transparent', border: 0, cursor: 'pointer' }}
                              >
                                View →
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="kyc-table-foot">
                  Showing {filtered.length} of {applications.length} applications
                </div>
              </section>

              <footer className="kyc-footer">
                © 2026 Nova Bank · KYC Operations
              </footer>
            </div>
          </>
        )}
      </div>

      {/* 👈 Render the Password Modal */}
      {showPasswordModal && (
        <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />
      )}
    </div>
  );
}

function StatCard({ icon, label, value, tone = 'blue' }) {
  return (
    <div className={`kyc-stat kyc-stat-${tone}`}>
      <span className="kyc-stat-icon">{icon}</span>
      <div className="kyc-stat-body">
        <span className="kyc-stat-label">{label}</span>
        <strong className="kyc-stat-value">{value}</strong>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const tone =
    {
      PENDING: 'pending',
      UNDER_REVIEW: 'review',
      APPROVED: 'approved',
      REJECTED: 'rejected',
    }[status] || 'neutral';
  return (
    <span className={`kyc-status kyc-status-${tone}`}>
      {statusLabel(status)}
    </span>
  );
}