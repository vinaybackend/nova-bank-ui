import React, { useCallback, useEffect, useState } from 'react';
import adminService from '../../../../services/adminService';
import AssignRoleModal from './AssignRoleModal';
import './BranchManagementPage.css'; // Assuming you keep this for base styles

const { normalizeList } = adminService;

const statusTone = (s) => {
  const v = String(s || '').toUpperCase();
  if (['ACTIVE', 'APPROVED'].includes(v)) return 'ok';
  if (['PENDING', 'ONBOARDING'].includes(v)) return 'warn';
  if (['TERMINATED', 'SUSPENDED', 'REJECTED'].includes(v)) return 'bad';
  return 'neutral';
};

const formatDate = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  return isNaN(d.getTime()) ? String(v) : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatDateTime = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  return isNaN(d.getTime()) ? String(v) : d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export default function EmployeeManagementPage() {
  const [activeTab, setActiveTab] = useState('DIRECTORY');

  const [employees, setEmployees] = useState([]);
  const [roles, setRoles] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Controls the custom password modal
  const [generatedPasswordData, setGeneratedPasswordData] = useState(null);

  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [assignRoleModalEmp, setAssignRoleModalEmp] = useState(null);
  
  // ✨ Replaced selectedEmployeeCode with full object state for the detail view
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  
  // ✨ Status update state for the detail view
  const [newStatus, setNewStatus] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');

  const [form, setForm] = useState({
    name: '', 
    dateOfBirth: '', 
    gender: 'MALE', 
    maritalStatus: 'SINGLE',
    email: '', 
    mobileNumber: '', 
    jobTitle: '', 
    department: '', 
    grade: '', 
    employeeType: 'PERMANENT',
    dateOfJoining: '', 
    branchCode: '', 
    branchName: '', 
    ifscCode: '', 
    roleName: 'TELLER',
    bankAccount: { accountNumber: '', ifscCode: '', bankName: '', accountHolderName: '' },
    documents: [{ documentType: 'PAN_CARD', documentNumber: '' }]
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [empRes, roleRes, branchRes] = await Promise.allSettled([
        adminService.getEmployeeDirectory({ size: 100 }),
        adminService.getRoles(),
        adminService.getBranches({ size: 100 }),
      ]);

      if (empRes.status === 'fulfilled') {
        setEmployees(normalizeList(empRes.value));
      } else {
        console.error('Employee fetch failed:', empRes.reason);
        setError(`Failed to load employees: ${empRes.reason?.message || 'Unknown error'}`);
      }

      if (roleRes.status === 'fulfilled') {
        const roleList = normalizeList(roleRes.value).map(r => r.name);
        setRoles(roleList);
        if (roleList.length > 0) {
          setForm(prev => {
            if (!roleList.includes(prev.roleName)) {
              return { ...prev, roleName: roleList[0] };
            }
            return prev;
          });
        }
      }

      if (branchRes.status === 'fulfilled') setBranches(normalizeList(branchRes.value));
    } catch (err) {
      setError('Failed to load data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ✨ Function to open full page details and fetch fresh data
  const handleOpenDetails = async (employeeCode) => {
    setDetailLoading(true);
    setDetailError('');
    setSelectedEmployee({ employeeCode }); // placeholder to trigger view
    
    try {
      const data = await adminService.getEmployeeDetails(employeeCode);
      setSelectedEmployee(data);
      setNewStatus(data.employmentStatus || 'ACTIVE');
    } catch (err) {
      setDetailError(err.message || 'Failed to load employee details.');
    } finally {
      setDetailLoading(false);
    }
  };

  // ✨ Status update handler for the detail view
  const handleStatusUpdate = async () => {
    if (!newStatus || newStatus === selectedEmployee.employmentStatus) return;
    setUpdatingStatus(true);
    try {
      await adminService.updateEmployeeStatus(selectedEmployee.id, newStatus);
      setSelectedEmployee(prev => ({ ...prev, employmentStatus: newStatus }));
      setSuccessMsg('Employee status updated successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
      loadData(); // Refresh the list
    } catch (err) {
      setDetailError(err.message || 'Failed to update status.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleBankChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, bankAccount: { ...prev.bankAccount, [name]: value } }));
  };

  const handleDocumentChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => {
      const newDocs = [...prev.documents];
      newDocs[0] = { ...newDocs[0], [name]: value };
      return { ...prev, documents: newDocs };
    });
  };

  const handleBranchSelect = (e) => {
    const selectedCode = e.target.value;
    const selectedBranch = branches.find(b => b.branchCode === selectedCode);

    setForm(prev => ({
      ...prev,
      branchCode: selectedCode,
      branchName: selectedBranch ? selectedBranch.branchName : '',
      ifscCode: selectedBranch ? selectedBranch.ifscCode : ''
    }));
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccessMsg('');
    try {
      const response = await adminService.registerEmployee(form);
      const generatedPassword = response?.generatedPassword;
      const employeeName = form.name;

      if (generatedPassword) {
        setGeneratedPasswordData({
          name: employeeName,
          email: form.email,
          password: generatedPassword
        });
      } else {
        setSuccessMsg('Employee registered successfully!');
        setTimeout(() => setSuccessMsg(''), 3000);
      }

      setIsRegisterModalOpen(false);
      loadData();
    } catch (err) {
      setError(`Registration failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddRole = async (e) => {
    e.preventDefault();
    if (!newRoleName) return;
    setSubmitting(true);
    setError('');
    setSuccessMsg('');

    try {
      await adminService.addRole(newRoleName);
      setSuccessMsg(`Role "${newRoleName}" added successfully!`);
      setTimeout(() => setSuccessMsg(''), 3000);
      setNewRoleName('');
      loadData();
    } catch (err) {
      setError(`Failed to add role: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bm-page">
      
      {/* ✨ CONDITIONAL RENDERING: Show Details Page OR Main View */}
      {selectedEmployee ? (
        
        /* ================= FULL PAGE DETAILS VIEW ================= */
        <div className="em-page" style={{ animation: 'fadeIn 0.2s ease' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <button 
              onClick={() => setSelectedEmployee(null)}
              style={{ background: '#ffffff', border: '1px solid #dde4ee', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', color: '#475569', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              ← Back to Employees
            </button>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
               <span className={`ad-status ad-status-${statusTone(selectedEmployee.employmentStatus)}`} style={{ padding: '6px 12px', fontSize: '12px' }}>
                  {selectedEmployee.employmentStatus || 'ONBOARDING'}
               </span>
            </div>
          </div>

          <div className="em-head" style={{ marginBottom: '16px' }}>
            <div>
              <h1 style={{ fontSize: '24px', textTransform: 'capitalize' }}>{selectedEmployee.name || 'Loading...'}</h1>
              <p>{selectedEmployee.employeeCode} • {selectedEmployee.jobTitle}</p>
            </div>
          </div>

          {detailLoading ? (
            <p style={{ textAlign: 'center', color: '#6b7280', padding: '40px 0' }}>Fetching employee details...</p>
          ) : detailError ? (
            <p style={{ textAlign: 'center', color: '#ef4444', padding: '40px 0' }}>{detailError}</p>
          ) : (
            /* Two Column Layout */
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', alignItems: 'start' }}>
              
              {/* Left Column: Profile Info */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* Personal Info */}
                <div style={{ background: '#fff', border: '1px solid #e1e7f0', borderRadius: '12px', padding: '24px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '16px', borderBottom: '1px solid #eef2f8', paddingBottom: '12px' }}>Personal Information</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div><span style={{ display: 'block', fontSize: '10px', color: '#8792a5', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Full Name</span><b style={{ fontSize: '13px', color: '#1c2740' }}>{selectedEmployee.name || '—'}</b></div>
                    <div><span style={{ display: 'block', fontSize: '10px', color: '#8792a5', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Email</span><b style={{ fontSize: '13px', color: '#1c2740' }}>{selectedEmployee.email || '—'}</b></div>
                    <div><span style={{ display: 'block', fontSize: '10px', color: '#8792a5', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Mobile</span><b style={{ fontSize: '13px', color: '#1c2740' }}>{selectedEmployee.mobileNumber || '—'}</b></div>
                    <div><span style={{ display: 'block', fontSize: '10px', color: '#8792a5', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Date of Birth</span><b style={{ fontSize: '13px', color: '#1c2740' }}>{formatDate(selectedEmployee.dateOfBirth)}</b></div>
                    <div><span style={{ display: 'block', fontSize: '10px', color: '#8792a5', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Gender</span><b style={{ fontSize: '13px', color: '#1c2740' }}>{selectedEmployee.gender || '—'}</b></div>
                    <div><span style={{ display: 'block', fontSize: '10px', color: '#8792a5', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Marital Status</span><b style={{ fontSize: '13px', color: '#1c2740' }}>{selectedEmployee.maritalStatus || '—'}</b></div>
                  </div>
                </div>

                {/* Employment Details */}
                <div style={{ background: '#fff', border: '1px solid #e1e7f0', borderRadius: '12px', padding: '24px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '16px', borderBottom: '1px solid #eef2f8', paddingBottom: '12px' }}>Employment Details</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div><span style={{ display: 'block', fontSize: '10px', color: '#8792a5', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Department</span><b style={{ fontSize: '13px', color: '#1c2740' }}>{selectedEmployee.department || '—'}</b></div>
                    <div><span style={{ display: 'block', fontSize: '10px', color: '#8792a5', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Grade</span><b style={{ fontSize: '13px', color: '#1c2740' }}>{selectedEmployee.grade || '—'}</b></div>
                    <div><span style={{ display: 'block', fontSize: '10px', color: '#8792a5', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Type</span><b style={{ fontSize: '13px', color: '#1c2740' }}>{selectedEmployee.employeeType || '—'}</b></div>
                    <div><span style={{ display: 'block', fontSize: '10px', color: '#8792a5', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Date of Joining</span><b style={{ fontSize: '13px', color: '#1c2740' }}>{formatDate(selectedEmployee.dateOfJoining)}</b></div>
                    <div style={{ gridColumn: 'span 2' }}><span style={{ display: 'block', fontSize: '10px', color: '#8792a5', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Branch</span><b style={{ fontSize: '13px', color: '#1c2740' }}>{selectedEmployee.branchName} ({selectedEmployee.branchCode})</b></div>
                  </div>
                </div>

                {/* Documents */}
                {selectedEmployee.documents && selectedEmployee.documents.length > 0 && (
                  <div style={{ background: '#fff', border: '1px solid #e1e7f0', borderRadius: '12px', padding: '24px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '16px', borderBottom: '1px solid #eef2f8', paddingBottom: '12px' }}>Uploaded Documents</h3>
                    <div className="ad-table-wrap">
                      <table className="ad-table">
                        <thead>
                          <tr>
                            <th>Document Type</th>
                            <th>Document Number</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedEmployee.documents.map((doc, idx) => (
                            <tr key={idx}>
                              <td>{doc.documentType || '—'}</td>
                              <td>{doc.documentNumber || '—'}</td>
                              <td>
                                <span className={`ad-status ad-status-${String(doc.verificationStatus).toUpperCase() === 'VERIFIED' ? 'ok' : 'warn'}`}>
                                  {doc.verificationStatus || 'PENDING'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Status & Bank Info */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* Status Management */}
                <div style={{ background: '#f8fafc', border: '1px solid #e1e7f0', borderRadius: '12px', padding: '24px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '16px', borderBottom: '1px solid #eef2f8', paddingBottom: '12px' }}>Manage Status</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '6px' }}>Current Status</label>
                      <span className={`ad-status ad-status-${statusTone(selectedEmployee.employmentStatus)}`} style={{ background: 'transparent', padding: 0 }}>
                        {selectedEmployee.employmentStatus}
                      </span>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '6px' }}>New Status</label>
                      <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="ONBOARDING">ONBOARDING</option>
                        <option value="SUSPENDED">SUSPENDED</option>
                        <option value="TERMINATED">TERMINATED</option>
                      </select>
                    </div>
                    <button 
                      onClick={handleStatusUpdate}
                      disabled={updatingStatus || newStatus === selectedEmployee.employmentStatus}
                      style={{ marginTop: '8px', padding: '10px', background: '#1769e0', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: (updatingStatus || newStatus === selectedEmployee.employmentStatus) ? 'not-allowed' : 'pointer', opacity: (updatingStatus || newStatus === selectedEmployee.employmentStatus) ? 0.6 : 1 }}
                    >
                      {updatingStatus ? 'Updating...' : 'Update Status'}
                    </button>
                  </div>
                </div>

                {/* Bank Account */}
                {selectedEmployee.bankAccount && (
                  <div style={{ background: '#fff', border: '1px solid #e1e7f0', borderRadius: '12px', padding: '24px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '16px', borderBottom: '1px solid #eef2f8', paddingBottom: '12px' }}>Bank Account</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div><span style={{ display: 'block', fontSize: '10px', color: '#8792a5', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Account Number</span><b style={{ fontSize: '13px', color: '#1c2740' }}>{selectedEmployee.bankAccount.accountNumber || '—'}</b></div>
                      <div><span style={{ display: 'block', fontSize: '10px', color: '#8792a5', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>IFSC Code</span><b style={{ fontSize: '13px', color: '#1c2740' }}>{selectedEmployee.bankAccount.ifscCode || '—'}</b></div>
                      <div><span style={{ display: 'block', fontSize: '10px', color: '#8792a5', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Bank Name</span><b style={{ fontSize: '13px', color: '#1c2740' }}>{selectedEmployee.bankAccount.bankName || '—'}</b></div>
                      <div><span style={{ display: 'block', fontSize: '10px', color: '#8792a5', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Holder Name</span><b style={{ fontSize: '13px', color: '#1c2740' }}>{selectedEmployee.bankAccount.accountHolderName || '—'}</b></div>
                    </div>
                  </div>
                )}

                {/* Audit Info */}
                <div style={{ fontSize: '11px', color: '#9ca3af', textAlign: 'right' }}>
                  Created: {formatDateTime(selectedEmployee.createdAt)}<br/>
                  Updated: {formatDateTime(selectedEmployee.updatedAt)}
                </div>
              </div>
            </div>
          )}
        </div>

      ) : (

        /* ================= MAIN TABLE VIEW ================= */
        <>
          <div className="bm-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1>Employee Management</h1>
              <p>Register staff, assign roles, and manage bank access.</p>
            </div>
            {activeTab === 'DIRECTORY' && (
              <button className="bm-primary" onClick={() => setIsRegisterModalOpen(true)}>
                + Register Employee
              </button>
            )}
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', borderBottom: '1px solid #e5e7eb' }}>
            <button
              onClick={() => { setActiveTab('DIRECTORY'); setError(''); setSuccessMsg(''); }}
              style={{ background: 'none', border: 'none', padding: '10px 0', fontWeight: activeTab === 'DIRECTORY' ? 'bold' : 'normal', color: activeTab === 'DIRECTORY' ? '#2563eb' : '#6b7280', borderBottom: activeTab === 'DIRECTORY' ? '2px solid #2563eb' : 'none', cursor: 'pointer', fontSize: '15px' }}
            >
              Employee Directory
            </button>
            <button
              onClick={() => { setActiveTab('ROLES'); setError(''); setSuccessMsg(''); }}
              style={{ background: 'none', border: 'none', padding: '10px 0', fontWeight: activeTab === 'ROLES' ? 'bold' : 'normal', color: activeTab === 'ROLES' ? '#2563eb' : '#6b7280', borderBottom: activeTab === 'ROLES' ? '2px solid #2563eb' : 'none', cursor: 'pointer', fontSize: '15px' }}
            >
              Roles & Permissions
            </button>
          </div>

          {/* Banners */}
          {error && (
            <div className="ad-alert" style={{ marginBottom: '20px', background: '#fef2f2', color: '#b91c1c', border: '1px solid #f87171' }}>
              {error}
              <button onClick={() => setError('')} style={{ marginLeft: '10px', background: 'transparent', border: 'none', color: '#b91c1c', fontWeight: 'bold', cursor: 'pointer' }}>✕</button>
            </div>
          )}

          {successMsg && (
            <div className="ad-alert" style={{ marginBottom: '20px', background: '#f0fdf4', color: '#15803d', border: '1px solid #4ade80' }}>
              {successMsg}
              <button onClick={() => setSuccessMsg('')} style={{ marginLeft: '10px', background: 'transparent', border: 'none', color: '#15803d', fontWeight: 'bold', cursor: 'pointer' }}>✕</button>
            </div>
          )}

          {activeTab === 'DIRECTORY' && (
            <section className="ad-panel">
              <div className="ad-table-wrap">
                <table className="ad-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Phone</th>
                      <th>Job / Dept</th>
                      <th>Branch</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan="6" className="ad-empty">Loading employees...</td></tr>
                    ) : employees.length === 0 ? (
                      <tr><td colSpan="6" className="ad-empty">No employees found.</td></tr>
                    ) : (
                      employees.map((emp, i) => (
                        <tr key={emp.id || emp.employeeCode || i}>
                          <td>
                            <div
                              style={{ fontWeight: '600', color: '#2563eb', cursor: 'pointer' }}
                              onClick={() => handleOpenDetails(emp.employeeCode)}
                            >
                              {emp.name}
                            </div>
                            <div style={{ fontSize: '12px', color: '#6b7280' }}>
                              {emp.employeeCode || '—'} · {emp.email}
                            </div>
                          </td>
                          <td>{emp.mobileNumber || '—'}</td>
                          <td>
                            <div style={{ fontWeight: '500' }}>{emp.jobTitle || '—'}</div>
                            <div style={{ fontSize: '12px', color: '#6b7280' }}>{emp.department || '—'}</div>
                          </td>
                          <td>
                            {emp.branchName ? (
                              <>
                                <div>{emp.branchName}</div>
                                <div style={{ fontSize: '12px', color: '#6b7280' }}>{emp.branchCode}</div>
                              </>
                            ) : '—'}
                          </td>
                          <td>
                            <span className={`ad-status ad-status-${statusTone(emp.employmentStatus)}`}>
                              {emp.employmentStatus || 'ONBOARDING'}
                            </span>
                          </td>
                          <td>
                            <button
                              className="bm-link"
                              onClick={() => setAssignRoleModalEmp(emp)}
                            >
                              Assign Role
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {activeTab === 'ROLES' && (
            <section className="ad-panel">
              <div className="ad-panel-head">
                <div><h2>System Roles</h2><p>Manage the roles available for employees.</p></div>
              </div>

              <form onSubmit={handleAddRole} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                <input
                  type="text"
                  placeholder="Enter new role name (e.g. AUDITOR)"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value.toUpperCase().replace(/\s+/g, '_'))}
                  style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc', flex: 1, maxWidth: '300px' }}
                  required
                />
                <button type="submit" className="bm-primary" disabled={submitting || !newRoleName}>
                  {submitting ? 'Adding...' : '+ Add Role'}
                </button>
              </form>

              <div className="ad-table-wrap">
                <table className="ad-table">
                  <thead>
                    <tr><th>Role Name</th></tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td className="ad-empty">Loading roles...</td></tr>
                    ) : roles.length === 0 ? (
                      <tr><td className="ad-empty">No roles found.</td></tr>
                    ) : (
                      roles.map((r, i) => (
                        <tr key={i}>
                          <td style={{ fontWeight: '500', color: '#1f2937' }}>{r}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}

      {/* REGISTER MODAL */}
      {isRegisterModalOpen && (
        <div className="bm-modal-backdrop" onClick={() => setIsRegisterModalOpen(false)}>
          <div className="bm-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px', width: '90%' }}>
            <header className="bm-modal-head">
              <div><h2>Register Employee</h2><p>Create a new staff account.</p></div>
              <button className="ad-icon-btn" onClick={() => setIsRegisterModalOpen(false)}>✕</button>
            </header>

            <form onSubmit={handleRegister} className="bm-form" style={{ maxHeight: '75vh', overflowY: 'auto', padding: '20px' }}>

              <h3 style={{ fontSize: '1rem', margin: '0 0 10px 0', color: '#3b82f6' }}>Personal Information</h3>
              <div className="bm-grid">
                <label className="bm-field"><span>Full Name *</span><input name="name" required value={form.name} onChange={handleInputChange} placeholder="As on ID document" /></label>
                <label className="bm-field"><span>Date of Birth *</span><input type="date" name="dateOfBirth" required value={form.dateOfBirth} onChange={handleInputChange} /></label>
                <label className="bm-field">
                  <span>Gender *</span>
                  <select name="gender" value={form.gender} onChange={handleInputChange} required>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </label>
                <label className="bm-field">
                  <span>Marital Status</span>
                  <select name="maritalStatus" value={form.maritalStatus} onChange={handleInputChange}>
                    <option value="SINGLE">Single</option>
                    <option value="MARRIED">Married</option>
                    <option value="DIVORCED">Divorced</option>
                    <option value="WIDOWED">Widowed</option>
                  </select>
                </label>
                <label className="bm-field"><span>Email *</span><input type="email" name="email" required value={form.email} onChange={handleInputChange} /></label>
                <label className="bm-field"><span>Mobile Number *</span><input name="mobileNumber" required value={form.mobileNumber} onChange={handleInputChange} /></label>
              </div>

              <h3 style={{ fontSize: '1rem', margin: '20px 0 10px 0', color: '#3b82f6' }}>Employment Details</h3>
              <div className="bm-grid">
                <label className="bm-field"><span>Job Title *</span><input name="jobTitle" required value={form.jobTitle} onChange={handleInputChange} /></label>
                <label className="bm-field"><span>Department *</span><input name="department" required value={form.department} onChange={handleInputChange} /></label>
                <label className="bm-field">
                  <span>Employee Type *</span>
                  <select name="employeeType" value={form.employeeType} onChange={handleInputChange} required>
                    <option value="PERMANENT">Permanent</option>
                    <option value="CONTRACTUAL">Contractual</option>
                    <option value="INTERN">Intern</option>
                    <option value="CONSULTANT">Consultant</option>
                  </select>
                </label>
                <label className="bm-field">
                  <span>System Role *</span>
                  <select name="roleName" value={form.roleName} onChange={handleInputChange} required>
                    {roles.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </label>
                <label className="bm-field"><span>Date of Joining</span><input type="date" name="dateOfJoining" value={form.dateOfJoining} onChange={handleInputChange} /></label>
                <label className="bm-field"><span>Grade (Optional)</span><input name="grade" value={form.grade} onChange={handleInputChange} /></label>
              </div>

              <h3 style={{ fontSize: '1rem', margin: '20px 0 10px 0', color: '#3b82f6' }}>Branch Assignment</h3>
              <div className="bm-grid">
                <label className="bm-field">
                  <span>Select Branch *</span>
                  <select value={form.branchCode} onChange={handleBranchSelect} required>
                    <option value="">-- Select a Branch --</option>
                    {branches.map(b => (
                      <option key={b.branchCode} value={b.branchCode}>{b.branchName} ({b.branchCode})</option>
                    ))}
                  </select>
                </label>
                <label className="bm-field">
                  <span>Branch Name</span>
                  <input name="branchName" value={form.branchName} readOnly style={{ background: '#f3f4f6' }} placeholder="Auto-filled" />
                </label>
                <label className="bm-field">
                  <span>IFSC Code</span>
                  <input name="ifscCode" value={form.ifscCode} readOnly style={{ background: '#f3f4f6' }} placeholder="Auto-filled" />
                </label>
              </div>

              <h3 style={{ fontSize: '1rem', margin: '20px 0 10px 0', color: '#3b82f6' }}>Bank Account (Optional)</h3>
              <div className="bm-grid">
                <label className="bm-field"><span>Account Number</span><input name="accountNumber" value={form.bankAccount.accountNumber} onChange={handleBankChange} /></label>
                <label className="bm-field"><span>Bank Name</span><input name="bankName" value={form.bankAccount.bankName} onChange={handleBankChange} /></label>
              </div>

              <h3 style={{ fontSize: '1rem', margin: '20px 0 10px 0', color: '#3b82f6' }}>Identity Document</h3>
              <div className="bm-grid">
                <label className="bm-field">
                  <span>Document Type</span>
                  <select name="documentType" value={form.documents[0].documentType} onChange={handleDocumentChange}>
                    <option value="PAN_CARD">PAN Card</option>
                    <option value="AADHAAR_CARD">Aadhaar</option>
                  </select>
                </label>
                <label className="bm-field"><span>Document Number</span><input name="documentNumber" value={form.documents[0].documentNumber} onChange={handleDocumentChange} /></label>
              </div>

              <div className="bm-form-actions" style={{ marginTop: '30px', paddingTop: '20px', borderTop: '1px solid #e5e7eb' }}>
                <button type="button" className="bm-secondary" onClick={() => setIsRegisterModalOpen(false)}>Cancel</button>
                <button type="submit" className="bm-primary" disabled={submitting}>
                  {submitting ? 'Registering...' : 'Register Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GENERATED PASSWORD MODAL */}
      {generatedPasswordData && (
        <div className="bm-modal-backdrop" onClick={() => setGeneratedPasswordData(null)}>
          <div className="bm-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px', textAlign: 'center' }}>
            <header className="bm-modal-head" style={{ borderBottom: 'none', paddingBottom: 0 }}>
              <div style={{ width: '100%', textAlign: 'center' }}>
                <div style={{ fontSize: '40px', marginBottom: '10px' }}>✅</div>
                <h2>Employee Registered!</h2>
                <p>The account was created successfully.</p>
              </div>
            </header>

            <div style={{ padding: '0 30px 30px 30px' }}>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '20px', marginBottom: '20px' }}>
                <p style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#475569' }}>
                  <strong>Name:</strong> {generatedPasswordData.name}
                </p>
                <p style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#475569' }}>
                  <strong>Email:</strong> {generatedPasswordData.email}
                </p>
                <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px dashed #cbd5e1' }}>
                  <p style={{ margin: '0 0 5px 0', fontSize: '13px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Temporary Password</p>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#2563eb', letterSpacing: '2px', background: '#eff6ff', padding: '10px', borderRadius: '6px' }}>
                    {generatedPasswordData.password}
                  </div>
                </div>
              </div>

              <p style={{ fontSize: '13px', color: '#ef4444', marginBottom: '20px' }}>
                ⚠️ Please copy this password now. It will not be shown again.
              </p>

              <button
                className="bm-primary"
                style={{ width: '100%', padding: '12px' }}
                onClick={() => setGeneratedPasswordData(null)}
              >
                I have saved the password
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ASSIGN ROLE MODAL */}
      {assignRoleModalEmp && (
        <AssignRoleModal
          employee={assignRoleModalEmp}
          roles={roles}
          onClose={() => setAssignRoleModalEmp(null)}
          onSuccess={() => {
            setSuccessMsg(`Role assigned successfully to ${assignRoleModalEmp.email}!`);
            setTimeout(() => setSuccessMsg(''), 3000);
            loadData();
          }}
        />
      )}

    </div>
  );
}