// src/pages/admin/EmployeeDetailsModal.jsx
import React, { useEffect, useState } from 'react';
import adminService from '../../../../services/adminService';
import './EmployeeDetailsModal.css';

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

export default function EmployeeDetailsModal({ employeeCode, onClose, onStatusUpdate }) {
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Status Update State
  const [newStatus, setNewStatus] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const loadDetails = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await adminService.getEmployeeDetails(employeeCode);
        setEmployee(data);
        setNewStatus(data.employmentStatus || 'ACTIVE');
      } catch (err) {
        setError(err.message || 'Failed to load employee details.');
      } finally {
        setLoading(false);
      }
    };
    loadDetails();
  }, [employeeCode]);

  const handleStatusUpdate = async () => {
    if (!newStatus || newStatus === employee.employmentStatus) return;
    
    setUpdating(true);
    try {
      await adminService.updateEmployeeStatus(employee.id, newStatus);
      
      // Update local state
      setEmployee(prev => ({ ...prev, employmentStatus: newStatus }));
      
      // Notify parent to refresh list if needed
      if (onStatusUpdate) onStatusUpdate();
      
      alert('Employee status updated successfully!');
    } catch (err) {
      alert(`Failed to update status: ${err.message}`);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="edm-backdrop" onClick={onClose}>
      <div className="edm-modal" onClick={e => e.stopPropagation()}>
        <header className="edm-header">
          <div>
            {/* ✨ Changed to employee?.name */}
            <h2>{loading ? 'Loading...' : employee?.name}</h2>
            {!loading && employee && <p>{employee.employeeCode} • {employee.jobTitle}</p>}
          </div>
          <button className="ad-icon-btn" onClick={onClose}>✕</button>
        </header>

        <div className="edm-body">
          {loading ? (
            <p style={{ textAlign: 'center', color: '#6b7280', padding: '40px 0' }}>Fetching employee details...</p>
          ) : error ? (
            <p style={{ textAlign: 'center', color: '#ef4444', padding: '40px 0' }}>{error}</p>
          ) : employee && (
            <>
              {/* Personal Information */}
              <div>
                <div className="edm-section-title">Personal Information</div>
                <div className="edm-grid">
                  <div className="edm-field"><label>Email</label><span>{employee.email || '—'}</span></div>
                  <div className="edm-field"><label>Mobile</label><span>{employee.mobileNumber || '—'}</span></div>
                  <div className="edm-field"><label>Date of Birth</label><span>{formatDate(employee.dateOfBirth)}</span></div>
                  <div className="edm-field"><label>Gender</label><span>{employee.gender || '—'}</span></div>
                  <div className="edm-field"><label>Marital Status</label><span>{employee.maritalStatus || '—'}</span></div>
                </div>
              </div>

              {/* Employment Details */}
              <div>
                <div className="edm-section-title">Employment Details</div>
                <div className="edm-grid">
                  <div className="edm-field"><label>Department</label><span>{employee.department || '—'}</span></div>
                  <div className="edm-field"><label>Grade</label><span>{employee.grade || '—'}</span></div>
                  <div className="edm-field"><label>Type</label><span>{employee.employeeType || '—'}</span></div>
                  <div className="edm-field"><label>Date of Joining</label><span>{formatDate(employee.dateOfJoining)}</span></div>
                  <div className="edm-field span-2"><label>Branch</label><span>{employee.branchName} ({employee.branchCode})</span></div>
                </div>
              </div>

              {/* Bank Account */}
              {employee.bankAccount && (
                <div>
                  <div className="edm-section-title">Bank Account Details</div>
                  <div className="edm-grid">
                    <div className="edm-field"><label>Account Number</label><span>{employee.bankAccount.accountNumber || '—'}</span></div>
                    <div className="edm-field"><label>IFSC Code</label><span>{employee.bankAccount.ifscCode || '—'}</span></div>
                    <div className="edm-field"><label>Bank Name</label><span>{employee.bankAccount.bankName || '—'}</span></div>
                    <div className="edm-field"><label>Holder Name</label><span>{employee.bankAccount.accountHolderName || '—'}</span></div>
                  </div>
                </div>
              )}

              {/* Documents */}
              {employee.documents && employee.documents.length > 0 && (
                <div>
                  <div className="edm-section-title">Uploaded Documents</div>
                  <div className="ad-table-wrap">
                    <table className="ad-table">
                      <thead>
                        <tr>
                          <th>Document Type</th>
                          <th>Document Number</th>
                          <th>Verification Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {employee.documents.map((doc, idx) => (
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

              {/* Status Management */}
              <div>
                <div className="edm-section-title">Update Employment Status</div>
                <div className="edm-status-action">
                  <div className="edm-field">
                    <label>Current Status</label>
                    <span style={{ fontWeight: 'bold', color: employee.employmentStatus === 'ACTIVE' ? '#059669' : '#d97706', background: 'transparent', border: 'none', padding: '8px 0' }}>
                      {employee.employmentStatus}
                    </span>
                  </div>
                  <div className="edm-field">
                    <label>New Status</label>
                    <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="ONBOARDING">ONBOARDING</option>
                      <option value="SUSPENDED">SUSPENDED</option>
                      <option value="TERMINATED">TERMINATED</option>
                    </select>
                  </div>
                  <button 
                    className="edm-btn-primary" 
                    onClick={handleStatusUpdate}
                    disabled={updating || newStatus === employee.employmentStatus}
                  >
                    {updating ? 'Updating...' : 'Update Status'}
                  </button>
                </div>
              </div>

              {/* Audit Info */}
              <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '10px', textAlign: 'right' }}>
                Created: {formatDateTime(employee.createdAt)} • Updated: {formatDateTime(employee.updatedAt)}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}