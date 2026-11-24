import { useCallback, useEffect, useState } from 'react';
import adminService from '../../../../services/adminService';
import './BranchManagementPage.css';

const { normalizeList, pageTotal } = adminService;

const formatDate = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const statusTone = (s) => {
  const v = String(s || '').toUpperCase();
  if (['ACTIVE'].includes(v)) return 'ok';
  if (['TEMPORARILY_CLOSED', 'UNDER_MAINTENANCE'].includes(v)) return 'warn';
  if (['INACTIVE'].includes(v)) return 'bad';
  return 'neutral';
};

const EMPTY_FORM = {
  branchName: '', ifscCode: '', branchType: 'STANDARD', address: '', city: '',
  district: '', state: '', pinCode: '', country: 'India', phone: '', email: '',
  openingDate: '', openingTime: '', closingTime: '', timeZone: 'Asia/Kolkata'
};

export default function BranchManagementPage({ onViewBranch }) {
  const [branches, setBranches] = useState([]);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal State (removed selectedBranch)
  const [historyBranch, setHistoryBranch] = useState(null);
  const [statusModal, setStatusModal] = useState(null);
  const [editBranch, setEditBranch] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [form, setForm] = useState(EMPTY_FORM);
  const [statusForm, setStatusForm] = useState({ status: 'ACTIVE', reason: '' });

  // Search State
  const [searchParams, setSearchParams] = useState({
    branchCode: '', city: '', status: '', branchType: '', page: 0, size: 10
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminService.searchBranches({
        branchCode: searchParams.branchCode,
        city: searchParams.city,
        status: searchParams.status,
        branchType: searchParams.branchType,
        page: searchParams.page,
        size: searchParams.size
      });
      setBranches(normalizeList(res));
      setTotalElements(pageTotal(res));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSearchChange = (e) => {
    const { name, value } = e.target;
    setSearchParams(prev => ({ ...prev, [name]: value, page: 0 }));
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const openEdit = (branch) => {
    setForm({
      branchName: branch.branchName || '',
      ifscCode: branch.ifscCode || '',
      branchType: branch.branchType || 'STANDARD',
      address: branch.address || '',
      city: branch.city || '',
      district: branch.district || '',
      state: branch.state || '',
      pinCode: branch.pinCode || '',
      country: branch.country || 'India',
      phone: branch.phone || '',
      email: branch.email || '',
      openingDate: branch.openingDate || '',
      openingTime: branch.openingTime || '',
      closingTime: branch.closingTime || '',
      timeZone: branch.timeZone || 'Asia/Kolkata'
    });
    setEditBranch(branch);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await adminService.createBranch(form);
      setCreateOpen(false);
      loadData();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await adminService.updateBranch(editBranch.id, form); 
      setEditBranch(null);
      loadData();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusUpdate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await adminService.updateBranchStatus(statusModal.id, statusForm);
      setStatusModal(null);
      loadData();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bm-page">
      <div className="bm-head">
        <div>
          <h1>Branch Management</h1>
          <p>Manage Nova Bank branches, view status history, and edit details.</p>
        </div>
        <button className="bm-primary" onClick={() => { setForm(EMPTY_FORM); setCreateOpen(true); }}>
          + New Branch
        </button>
      </div>

      {error && <div className="ad-alert">{error}</div>}

      <section className="ad-panel">
        <div className="ad-panel-head">
          <div><h2>Directory</h2><p>Advanced search by code, city, or status</p></div>
        </div>
        
        {/* Advanced Search Grid */}
        <div className="bm-search-grid">
          <input name="branchCode" placeholder="Branch Code..." value={searchParams.branchCode} onChange={handleSearchChange} />
          <input name="city" placeholder="City..." value={searchParams.city} onChange={handleSearchChange} />
          <select name="status" value={searchParams.status} onChange={handleSearchChange}>
            <option value="">All Statuses</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
            <option value="TEMPORARILY_CLOSED">TEMPORARILY CLOSED</option>
            <option value="UNDER_MAINTENANCE">UNDER MAINTENANCE</option>
          </select>
          <select name="branchType" value={searchParams.branchType} onChange={handleSearchChange}>
            <option value="">All Types</option>
            <option value="HEAD_OFFICE">HEAD OFFICE</option>
            <option value="REGIONAL_OFFICE">REGIONAL OFFICE</option>
            <option value="STANDARD">STANDARD</option>
            <option value="SPECIALIZED">SPECIALIZED</option>
          </select>
        </div>

        <div className="ad-table-wrap">
          <table className="ad-table">
            <thead>
              <tr>
                <th>Branch Name / Code</th>
                <th>IFSC</th>
                <th>Location</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="ad-empty">Loading...</td></tr>
              ) : branches.length === 0 ? (
                <tr><td colSpan={5} className="ad-empty">No branches found.</td></tr>
              ) : (
                branches.map(b => (
                  <tr key={b.id}>
                    <td>
                      <div className="bm-cell-main">
                        <b 
                          style={{ cursor: 'pointer', color: '#2563eb' }} 
                          onClick={() => onViewBranch(b)}
                        >
                          {b.branchName}
                        </b>
                        <small>{b.branchCode} • {b.branchType}</small>
                      </div>
                    </td>
                    <td><span className="bm-mono">{b.ifscCode}</span></td>
                    <td><div className="bm-cell-main"><b>{b.city}</b><small>{b.state}</small></div></td>
                    <td>
                      <span className={`ad-status ad-status-${statusTone(b.status)}`}>
                        {String(b.status).replaceAll('_', ' ')}
                      </span>
                    </td>
                    <td>
                      <div className="bm-action-row">
                        <button className="bm-link" onClick={() => onViewBranch(b)}>View</button>
                        <button className="bm-link" onClick={() => openEdit(b)}>Edit</button>
                        <button className="bm-link" onClick={() => { setStatusModal(b); setStatusForm({status: b.status, reason: ''}); }}>Status</button>
                        <button className="bm-link" onClick={() => setHistoryBranch(b)}>History</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="bm-pagination">
          <span>Page {searchParams.page + 1} of {Math.ceil(totalElements / searchParams.size) || 1} • {totalElements} branches</span>
          <div>
            <button className="bm-secondary" disabled={searchParams.page === 0} onClick={() => setSearchParams(p => ({...p, page: p.page - 1}))}>Previous</button>
            <button className="bm-secondary" disabled={(searchParams.page + 1) * searchParams.size >= totalElements} onClick={() => setSearchParams(p => ({...p, page: p.page + 1}))}>Next</button>
          </div>
        </div>
      </section>

      {/* Status History Modal */}
      {historyBranch && <HistoryModal branch={historyBranch} onClose={() => setHistoryBranch(null)} />}

      {/* Change Status Modal */}
      {statusModal && (
        <div className="bm-modal-backdrop" onClick={() => setStatusModal(null)}>
          <div className="bm-modal" onClick={e => e.stopPropagation()}>
            <header className="bm-modal-head">
              <div><h2>Update Status</h2><p>Change status for {statusModal.branchCode}</p></div>
              <button className="ad-icon-btn" onClick={() => setStatusModal(null)}>✕</button>
            </header>
            <form onSubmit={handleStatusUpdate} className="bm-form">
              <label className="bm-field">
                <span>New Status</span>
                <select value={statusForm.status} onChange={e => setStatusForm(p => ({...p, status: e.target.value}))} required>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                  <option value="TEMPORARILY_CLOSED">TEMPORARILY CLOSED</option>
                  <option value="UNDER_MAINTENANCE">UNDER MAINTENANCE</option>
                </select>
              </label>
              <label className="bm-field">
                <span>Reason for change *</span>
                <textarea required value={statusForm.reason} onChange={e => setStatusForm(p => ({...p, reason: e.target.value}))} placeholder="Why is the status changing?" />
              </label>
              <div className="bm-form-actions">
                <button type="button" className="bm-secondary" onClick={() => setStatusModal(null)}>Cancel</button>
                <button type="submit" className="bm-primary" disabled={submitting}>{submitting ? 'Updating...' : 'Update Status'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {(createOpen || editBranch) && (
        <div className="bm-modal-backdrop" onClick={() => { setCreateOpen(false); setEditBranch(null); }}>
          <div className="bm-modal" onClick={e => e.stopPropagation()}>
            <header className="bm-modal-head">
              <div><h2>{editBranch ? 'Edit Branch' : 'New Branch'}</h2></div>
              <button className="ad-icon-btn" onClick={() => { setCreateOpen(false); setEditBranch(null); }}>✕</button>
            </header>
            <form onSubmit={editBranch ? handleUpdate : handleCreate} className="bm-form">
              <div className="bm-grid">
                <label className="bm-field bm-span-2"><span>Branch Name *</span><input name="branchName" required value={form.branchName} onChange={handleFormChange} /></label>
                
                {!editBranch && (
                  <>
                    <label className="bm-field"><span>IFSC Code *</span><input name="ifscCode" required value={form.ifscCode} onChange={handleFormChange} placeholder="e.g. NOVA0001234" /></label>
                    <label className="bm-field">
                      <span>Branch Type *</span>
                      <select name="branchType" value={form.branchType} onChange={handleFormChange}>
                        <option value="STANDARD">STANDARD</option>
                        <option value="HEAD_OFFICE">HEAD OFFICE</option>
                        <option value="REGIONAL_OFFICE">REGIONAL OFFICE</option>
                        <option value="SPECIALIZED">SPECIALIZED</option>
                      </select>
                    </label>
                  </>
                )}

                <label className="bm-field bm-span-2"><span>Address *</span><input name="address" required value={form.address} onChange={handleFormChange} /></label>
                <label className="bm-field"><span>City *</span><input name="city" required value={form.city} onChange={handleFormChange} /></label>
                <label className="bm-field"><span>District *</span><input name="district" required value={form.district} onChange={handleFormChange} /></label>
                <label className="bm-field"><span>State *</span><input name="state" required value={form.state} onChange={handleFormChange} /></label>
                <label className="bm-field"><span>PIN Code *</span><input name="pinCode" required value={form.pinCode} onChange={handleFormChange} /></label>
                <label className="bm-field"><span>Country *</span><input name="country" required value={form.country} onChange={handleFormChange} /></label>
                <label className="bm-field"><span>Phone</span><input name="phone" value={form.phone} onChange={handleFormChange} /></label>
                <label className="bm-field"><span>Email</span><input name="email" type="email" value={form.email} onChange={handleFormChange} /></label>
                
                <label className="bm-field"><span>Opening Date</span><input name="openingDate" type="date" value={form.openingDate} onChange={handleFormChange} /></label>
                <label className="bm-field"><span>Time Zone</span><input name="timeZone" value={form.timeZone} onChange={handleFormChange} /></label>
                <label className="bm-field"><span>Opening Time</span><input name="openingTime" type="time" value={form.openingTime} onChange={handleFormChange} /></label>
                <label className="bm-field"><span>Closing Time</span><input name="closingTime" type="time" value={form.closingTime} onChange={handleFormChange} /></label>
              </div>
              <div className="bm-form-actions">
                <button type="button" className="bm-secondary" onClick={() => { setCreateOpen(false); setEditBranch(null); }}>Cancel</button>
                <button type="submit" className="bm-primary" disabled={submitting}>{submitting ? 'Saving...' : 'Save Branch'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Sub-component for History
function HistoryModal({ branch, onClose }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminService.getBranchStatusHistory(branch.branchCode)
      .then(res => setHistory(res))
      .catch(err => alert(err.message))
      .finally(() => setLoading(false));
  }, [branch.branchCode]);

  return (
    <div className="bm-modal-backdrop" onClick={onClose}>
      <div className="bm-modal" onClick={e => e.stopPropagation()}>
        <header className="bm-modal-head">
          <div><h2>Status History</h2><p>{branch.branchName} ({branch.branchCode})</p></div>
          <button className="ad-icon-btn" onClick={onClose}>✕</button>
        </header>
        {loading ? <p>Loading history...</p> : history.length === 0 ? <p>No history found.</p> : (
          <div className="ad-table-wrap">
            <table className="ad-table">
              <thead>
                <tr><th>Date</th><th>Previous</th><th>New</th><th>Reason</th><th>Changed By</th></tr>
              </thead>
              <tbody>
                {history.map(h => (
                  <tr key={h.id}>
                    <td>{formatDate(h.changedAt)}</td>
                    <td><span className={`ad-status ad-status-${statusTone(h.previousStatus)}`}>{h.previousStatus}</span></td>
                    <td><span className={`ad-status ad-status-${statusTone(h.newStatus)}`}>{h.newStatus}</span></td>
                    <td>{h.reason}</td>
                    <td className="bm-mono">{h.changedBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}