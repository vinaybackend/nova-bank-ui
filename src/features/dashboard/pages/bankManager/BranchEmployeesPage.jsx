import { useState, useMemo } from 'react';
import './BranchEmployeesPage.css';
import RegisterEmployeeModal from './RegisterEmployeeModal';
import branchManagerService from '../../../../services/branchManagerService';

const statusTone = (s) => {
  const v = String(s || '').toUpperCase();
  if (['ACTIVE', 'VERIFIED', 'APPROVED'].includes(v)) return 'ok';
  if (['ONBOARDING', 'PENDING', 'UNDER_REVIEW', 'PROBATION'].includes(v)) return 'warn';
  if (['SUSPENDED', 'TERMINATED', 'REJECTED', 'ON_LEAVE', 'RESIGNED'].includes(v)) return 'bad';
  return 'neutral';
};

const formatDate = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatDateTime = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export default function BranchEmployeesPage({ employees, loading, onRefresh, currentBranchId }) {
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  
  const [newStatus, setNewStatus] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusError, setStatusError] = useState('');

  const safeEmployees = Array.isArray(employees) ? employees : [];

  const stats = useMemo(() => {
    return {
      total: safeEmployees.length,
      active: safeEmployees.filter(e => String(e.employmentStatus).toUpperCase() === 'ACTIVE').length,
      onboarding: safeEmployees.filter(e => String(e.employmentStatus).toUpperCase() === 'ONBOARDING').length,
      onLeave: safeEmployees.filter(e => ['ON_LEAVE', 'SUSPENDED', 'TERMINATED'].includes(String(e.employmentStatus).toUpperCase())).length,
    };
  }, [safeEmployees]);
  
  // ✨ Updated: Uses `emp.name` instead of firstName/lastName
  const filteredEmployees = safeEmployees.filter(e => 
    [e.name, e.employeeCode, e.email]
      .filter(Boolean).join(' ').toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenDetails = (emp) => {
    setSelectedEmp(emp);
    setNewStatus(emp.employmentStatus || 'ONBOARDING');
    setStatusError('');
  };

  const handleUpdateStatus = async () => {
    if (!selectedEmp) return;
    setUpdatingStatus(true);
    setStatusError('');
    
    try {
      await branchManagerService.updateEmployeeStatus(selectedEmp.id, newStatus);
      setSelectedEmp(null); 
      if (onRefresh) onRefresh(); 
    } catch (err) {
      setStatusError(err.message || 'Failed to update status.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  return (
    <div className="be-page">
      
      {selectedEmp ? (
        
        /* ================= FULL PAGE DETAILS VIEW ================= */
        <div className="be-details-page">
          
          <div className="be-details-header-top">
            <button className="be-back-btn" onClick={() => setSelectedEmp(null)}>
              ← Back to Employees
            </button>
          </div>

          <div className="be-details-title-area">
            {/* ✨ Updated: Uses `name` directly */}
            <h1>{selectedEmp.name}</h1>
            <p>Employee Code: <b>{selectedEmp.employeeCode}</b></p>
          </div>

          {/* Top Summary Bar */}
          <div className="be-summary-bar">
            <div className="be-summary-item">
              <div className="be-summary-icon">👤</div>
              <div className="be-summary-text">
                <span>Role</span>
                <b>{selectedEmp.jobTitle || 'STAFF'}</b>
              </div>
            </div>
            <div className="be-summary-item">
              <div className="be-summary-icon">✉️</div>
              <div className="be-summary-text">
                <span>Email</span>
                <b>{selectedEmp.email || '—'}</b>
              </div>
            </div>
            <div className="be-summary-item">
              <div className="be-summary-icon">🏢</div>
              <div className="be-summary-text">
                <span>Department</span>
                <b>{selectedEmp.department || '—'}</b>
              </div>
            </div>
            <div className="be-summary-item">
              <div className="be-summary-icon">🛡️</div>
              <div className="be-summary-text">
                <span>Status</span>
                <b>{selectedEmp.employmentStatus || '—'}</b>
              </div>
            </div>
          </div>

          {/* Two Column Layout */}
          <div className="be-details-grid">
            
            {/* Left Column: Profile Info */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Personal Info */}
              <div className="be-details-panel">
                <div className="be-details-panel-header">
                  <div className="be-summary-icon">📋</div>
                  <div>
                    <h3>Personal Details</h3>
                    <p>Basic demographic information</p>
                  </div>
                </div>
                <div className="be-profile-grid">
                  {/* ✨ Updated: Uses `name` instead of firstName/middleName/lastName */}
                  <div className="be-profile-item"><span>Full Name</span><b>{selectedEmp.name || '—'}</b></div>
                  <div className="be-profile-item"><span>Date of Birth</span><b>{formatDate(selectedEmp.dateOfBirth)}</b></div>
                  <div className="be-profile-item"><span>Gender</span><b>{selectedEmp.gender || '—'}</b></div>
                  <div className="be-profile-item"><span>Marital Status</span><b>{selectedEmp.maritalStatus || '—'}</b></div>
                </div>
              </div>

              {/* Contact Details */}
              <div className="be-details-panel">
                <div className="be-details-panel-header">
                  <div className="be-summary-icon">📞</div>
                  <div>
                    <h3>Contact Details</h3>
                    <p>Phone and email</p>
                  </div>
                </div>
                <div className="be-profile-grid">
                  <div className="be-profile-item"><span>Email</span><b>{selectedEmp.email || '—'}</b></div>
                  <div className="be-profile-item"><span>Mobile</span><b>{selectedEmp.mobileNumber || '—'}</b></div>
                </div>
              </div>

              {/* Employment Details */}
              <div className="be-details-panel">
                <div className="be-details-panel-header">
                  <div className="be-summary-icon">💼</div>
                  <div>
                    <h3>Employment Details</h3>
                    <p>Role and branch information</p>
                  </div>
                </div>
                <div className="be-profile-grid">
                  <div className="be-profile-item"><span>Job Title</span><b>{selectedEmp.jobTitle || '—'}</b></div>
                  <div className="be-profile-item"><span>Department</span><b>{selectedEmp.department || '—'}</b></div>
                  <div className="be-profile-item"><span>Grade</span><b>{selectedEmp.grade || '—'}</b></div>
                  <div className="be-profile-item"><span>Employee Type</span><b>{selectedEmp.employeeType || '—'}</b></div>
                  <div className="be-profile-item"><span>Date of Joining</span><b>{formatDate(selectedEmp.dateOfJoining)}</b></div>
                  <div className="be-profile-item"><span>Branch Name</span><b>{selectedEmp.branchName || '—'}</b></div>
                </div>
              </div>

            </div>

            {/* Right Column: Actions, Bank, Docs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Status Update Action */}
              <div className="be-details-panel" style={{ background: '#f8fafc' }}>
                <div className="be-details-panel-header" style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: 16 }}>
                  <div className="be-summary-icon">⚙️</div>
                  <div>
                    <h3>Manage Status</h3>
                    <p>Update employee state</p>
                  </div>
                </div>
                {statusError && <div style={{ color: '#b91c1c', fontSize: '13px', marginBottom: '8px' }}>{statusError}</div>}
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <select 
                    value={newStatus} 
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="be-select"
                  >
                    <option value="ONBOARDING">Onboarding</option>
                    <option value="PROBATION">Probation</option>
                    <option value="ACTIVE">Active</option>
                    <option value="ON_LEAVE">On Leave</option>
                    <option value="NOTICE_PERIOD">Notice Period</option>
                    <option value="SUSPENDED">Suspended</option>
                    <option value="TERMINATED">Terminated</option>
                    <option value="RESIGNED">Resigned</option>
                  </select>
                  <button 
                    onClick={handleUpdateStatus}
                    disabled={updatingStatus || newStatus === selectedEmp.employmentStatus}
                    className="be-btn-primary"
                  >
                    {updatingStatus ? 'Saving...' : 'Update Status'}
                  </button>
                </div>
              </div>

              {/* Bank Details */}
              <div className="be-details-panel">
                <div className="be-details-panel-header">
                  <div className="be-summary-icon">🏦</div>
                  <div>
                    <h3>Bank & Payroll</h3>
                    <p>Salary account details</p>
                  </div>
                </div>
                {selectedEmp.bankAccount ? (
                  <div className="be-profile-grid" style={{ gridTemplateColumns: '1fr' }}>
                    <div className="be-profile-item"><span>Bank Name</span><b>{selectedEmp.bankAccount.bankName || '—'}</b></div>
                    <div className="be-profile-item"><span>Account Number</span><b>{selectedEmp.bankAccount.accountNumber || '—'}</b></div>
                    <div className="be-profile-item"><span>IFSC Code</span><b>{selectedEmp.bankAccount.ifscCode || '—'}</b></div>
                  </div>
                ) : (
                  <p style={{ fontSize: '13px', color: '#8792a5', margin: 0 }}>No bank account details provided.</p>
                )}
              </div>

              {/* Documents */}
              <div className="be-details-panel">
                <div className="be-details-panel-header">
                  <div className="be-summary-icon">📄</div>
                  <div>
                    <h3>Documents</h3>
                    <p>Uploaded files</p>
                  </div>
                </div>
                {selectedEmp.documents && selectedEmp.documents.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {selectedEmp.documents.map((doc, i) => (
                      <div key={i} className="be-profile-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <span>{doc.documentType || 'Document'}</span>
                          <b style={{ display: 'block', marginTop: '2px' }}>{doc.documentNumber || 'No Number'}</b>
                        </div>
                        <span className={`bm-status bm-status-${statusTone(doc.verificationStatus)}`} style={{ fontSize: '10px', padding: '2px 8px' }}>
                          {doc.verificationStatus || 'PENDING'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: '13px', color: '#8792a5', margin: 0 }}>No documents uploaded.</p>
                )}
              </div>

            </div>

          </div>
        </div>

      ) : (

        /* ================= MAIN TABLE VIEW ================= */
        <>
          {/* KPI Cards */}
          <div className="be-kpi-grid">
            <div className="be-kpi-card">
              <div className="be-kpi-icon be-kpi-blue">👥</div>
              <div>
                <div className="be-kpi-label">Total Employees</div>
                <div className="be-kpi-value">{loading ? '—' : stats.total}</div>
              </div>
            </div>
            <div className="be-kpi-card">
              <div className="be-kpi-icon be-kpi-green">✓</div>
              <div>
                <div className="be-kpi-label">Active</div>
                <div className="be-kpi-value">{loading ? '—' : stats.active}</div>
              </div>
            </div>
            <div className="be-kpi-card">
              <div className="be-kpi-icon be-kpi-yellow">⏳</div>
              <div>
                <div className="be-kpi-label">Onboarding</div>
                <div className="be-kpi-value">{loading ? '—' : stats.onboarding}</div>
              </div>
            </div>
            <div className="be-kpi-card">
              <div className="be-kpi-icon be-kpi-red">⚠</div>
              <div>
                <div className="be-kpi-label">On Leave / Suspended</div>
                <div className="be-kpi-value">{loading ? '—' : stats.onLeave}</div>
              </div>
            </div>
          </div>

          {/* Header & Search */}
          <div className="be-panel-head">
            <div>
              <h2>Branch Employees</h2>
              <p>Staff members assigned to your branch</p>
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <input 
                type="text" 
                className="be-search" 
                placeholder="Search by name, ID, email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button 
                onClick={() => setShowAddModal(true)}
                className="be-add-btn"
              >
                + Add Employee
              </button>
            </div>
          </div>

          {/* Main Table */}
          <div className="bm-panel" style={{ padding: 0 }}>
            <div className="bm-table-wrap" style={{ overflowX: 'auto' }}>
              <table className="bm-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>ID</th>
                    <th>Role / Desig</th>
                    <th>Email</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="6" className="bm-empty">Loading employees…</td></tr>
                  ) : filteredEmployees.length === 0 ? (
                    <tr><td colSpan="6" className="bm-empty">No employees found.</td></tr>
                  ) : (
                    filteredEmployees.map((emp, i) => (
                      <tr key={emp.id || i} onClick={() => handleOpenDetails(emp)} className="be-row">
                        <td>
                          <div className="be-cell-user">
                            {/* ✨ Updated: Uses `name` directly for avatars and table */}
                            <img src={emp.profileImageUrl || `https://ui-avatars.com/api/?name=${emp.name || 'Employee'}&background=random`} alt="profile" />
                            <b>{emp.name}</b>
                          </div>
                        </td>
                        <td className="be-mono">{emp.employeeCode || '—'}</td>
                        <td>
                          <b>{emp.jobTitle || 'Staff'}</b><br/>
                          <small style={{ color: '#8792a5' }}>{emp.department || '—'}</small>
                        </td>
                        <td>{emp.email || '—'}</td>
                        <td>
                          <span className={`bm-status bm-status-${statusTone(emp.employmentStatus)}`}>
                            {emp.employmentStatus || 'ACTIVE'}
                          </span>
                        </td>
                        <td><span className="be-link">View →</span></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ADD EMPLOYEE MODAL */}
      {showAddModal && (
        <RegisterEmployeeModal 
          currentBranchId={currentBranchId}
          onClose={() => setShowAddModal(false)} 
          onSuccess={() => {
            if (onRefresh) onRefresh();
          }} 
        />
      )}
    </div>
  );
}