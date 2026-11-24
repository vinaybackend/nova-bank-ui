import { useState, useEffect, useCallback, useMemo } from 'react';
import { getSavedAuthUser } from '../../../../services/apiClient';
import adminService from '../../../../services/adminService';
import KycApplicationDetail from '../kycOfficer/KycApplicationDetail'; // ✨ Use the full-page detail component
import './KycManagementPage.css';

const { normalizeList } = adminService;

/* ---------- helpers ---------- */
const formatDate = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const statusTone = (s) => {
  const v = String(s || '').toUpperCase();
  if (['APPROVED'].includes(v)) return 'ok';
  if (['PENDING', 'UNDER_REVIEW', 'PROCESSING'].includes(v)) return 'warn';
  if (['REJECTED', 'FAILED'].includes(v)) return 'bad';
  return 'neutral';
};

const getReviewerId = () => {
  const user = getSavedAuthUser();
  return user?.email || user?.id || 'admin@novabank.com';
};

export default function KycManagementPage() {
  const [kycList, setKycList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');

  // ✨ State to trigger the full-page detail view
  const [selectedKycId, setSelectedKycId] = useState(null);

  // ✨ State to hold the fetched customer names
  const [customerNames, setCustomerNames] = useState({});

  /* ---------- load data ---------- */
  const loadKyc = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await adminService.getAllKyc();
      setKycList(normalizeList(data));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadKyc();
  }, [loadKyc]);

  /* ---------- ✨ Fetch missing customer names ---------- */
  useEffect(() => {
    if (!kycList.length) return;

    const fetchNames = async () => {
      const namesMap = {};
      
      // Find all KYC records that don't have a name embedded in the payload
      const uniqueCustomerIds = [...new Set(
        kycList
          .filter(k => !k.customer?.name && !k.customerName && !k.name && k.customerId)
          .map(k => k.customerId)
      )];

      // Fetch them in parallel from the customer service
      await Promise.all(
        uniqueCustomerIds.map(async (id) => {
          try {
            const customer = await adminService.getCustomerById(id);
            if (customer && customer.name) {
              namesMap[id] = customer.name;
            }
          } catch (err) {
            console.error(`Failed to fetch name for customer ${id}`, err);
          }
        })
      );

      setCustomerNames(namesMap);
    };

    fetchNames();
  }, [kycList]);

  /* ---------- Derived Data ---------- */
  const stats = useMemo(() => {
    return {
      total: kycList.length,
      pending: kycList.filter((k) => ['PENDING', 'UNDER_REVIEW'].includes(String(k.verificationStatus).toUpperCase())).length,
      approved: kycList.filter((k) => String(k.verificationStatus).toUpperCase() === 'APPROVED').length,
      rejected: kycList.filter((k) => String(k.verificationStatus).toUpperCase() === 'REJECTED').length,
    };
  }, [kycList]);

  const filteredKyc = useMemo(() => {
    const term = search.trim().toLowerCase();
    return kycList.filter((k) => {
      // ✨ Include the newly fetched names in the search
      const resolvedName = k.customer?.name || k.customerName || k.name || customerNames[k.customerId] || '';
      
      const searchableText = [
        k.kycId, 
        k.customerId, 
        k.kycType, 
        resolvedName
      ].filter(Boolean).join(' ').toLowerCase();

      const matchesSearch = !term || searchableText.includes(term);
      const matchesStatus = filter === 'ALL' || String(k.verificationStatus).toUpperCase() === filter;
      return matchesSearch && matchesStatus;
    });
  }, [kycList, search, filter, customerNames]);

  /* ---------- render ---------- */
  
  // ✨ If a KYC is selected, show the full-page detail component
  if (selectedKycId) {
    return (
      <div style={{ background: '#eef2f8', minHeight: '100%' }}>
        <KycApplicationDetail 
          kycId={selectedKycId} 
          onBack={() => setSelectedKycId(null)} 
          onUpdate={loadKyc} 
        />
      </div>
    );
  }

  return (
    <div className="bk-page">
      
      {/* Top KPI Cards */}
      <div className="bk-stats-grid">
        <div className="bk-stat-card">
          <span>Total KYC Applications</span>
          <b>{stats.total}</b>
        </div>
        <div className="bk-stat-card">
          <span>Pending Review</span>
          <b style={{ color: '#d97706' }}>{stats.pending}</b>
        </div>
        <div className="bk-stat-card">
          <span>Approved</span>
          <b style={{ color: '#158456' }}>{stats.approved}</b>
        </div>
        <div className="bk-stat-card">
          <span>Rejected</span>
          <b style={{ color: '#c53849' }}>{stats.rejected}</b>
        </div>
      </div>

      {/* Main Table Panel */}
      <div className="bm-panel">
        <div className="bk-panel-head">
          <div>
            <h2>All KYC Applications</h2>
            <p>Review identity verification for all customers</p>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <input
              type="text"
              className="bk-search"
              placeholder="Search KYC ID, Customer ID, Name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="bk-search"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="UNDER_REVIEW">Under Review</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
            <button 
              className="bm-ghost" 
              onClick={loadKyc} 
              disabled={loading}
              style={{ background: '#fff', border: '1px solid #dde4ee', padding: '8px 12px' }}
            >
              ↻ {loading ? 'Loading…' : 'Refresh'}
            </button>
          </div>
        </div>
        
        <div className="bm-table-wrap" style={{ overflowX: 'auto' }}>
          <table className="bm-table">
            <thead>
              <tr>
                <th>KYC ID</th>
                <th>Customer Name</th>
                <th>Customer ID</th>
                <th>Type</th>
                <th>Status</th>
                <th>Submitted</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" className="bm-empty">Loading applications…</td></tr>
              ) : filteredKyc.length === 0 ? (
                <tr><td colSpan="7" className="bm-empty">No KYC applications found.</td></tr>
              ) : (
                filteredKyc.map((k) => {
                  // ✨ Resolve the name from the fetched map if it's not in the KYC object
                  const resolvedName = k.customer?.name || k.customerName || k.name || customerNames[k.customerId];

                  return (
                    <tr key={k.kycId} onClick={() => setSelectedKycId(k.kycId)} className="bk-row">
                      <td className="bm-cell-ref">{k.kycId}</td>
                      <td>
                        {/* Show a small loading state if the name hasn't loaded yet */}
                        <b>{resolvedName || <span style={{ color: '#94a3b8', fontWeight: 'normal' }}>Loading...</span>}</b>
                      </td>
                      <td>{k.customerId}</td>
                      <td>{k.kycType || 'Standard'}</td>
                      <td>
                        <span className={`bm-status bm-status-${statusTone(k.verificationStatus)}`}>
                          {String(k.verificationStatus || 'PENDING').replaceAll('_', ' ')}
                        </span>
                      </td>
                      <td>{formatDate(k.createdAt)}</td>
                      <td>
                        <span className="bk-link">Review →</span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}