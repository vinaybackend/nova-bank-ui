import React, { useState } from 'react';
import adminService from '../../../../services/adminService';
import './EmployeeDetailsModal.css'; // Reuse modal styling

export default function AssignRoleModal({ employee, roles, onClose, onSuccess }) {
  const [selectedRole, setSelectedRole] = useState(
    employee.roles?.[0] || roles[0] || ''
  );
  const [saving, setSaving] = useState(false);

  const handleAssign = async () => {
    if (!selectedRole) return;
    setSaving(true);
    try {
      await adminService.assignRoleToEmployee(employee.email, selectedRole);
      alert(`Role ${selectedRole} assigned successfully to ${employee.email}!`);
      onSuccess();
      onClose();
    } catch (err) {
      alert(`Failed to assign role: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="edm-backdrop" onClick={onClose}>
      <div className="edm-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
        <header className="edm-header">
          <div>
            <h2>Assign Role</h2>
            <p>{employee.email}</p>
          </div>
          <button className="ad-icon-btn" onClick={onClose}>✕</button>
        </header>
        
        <div className="edm-body">
          <div className="edm-field">
            <label>Select New Role</label>
            <select 
              value={selectedRole} 
              onChange={(e) => setSelectedRole(e.target.value)}
              style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ccc', marginTop: '8px', width: '100%' }}
            >
              <option value="">-- Select Role --</option>
              {roles.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          
          <div className="edm-status-action" style={{ marginTop: '20px', border: 'none', padding: 0, background: 'transparent' }}>
            <button className="edm-btn-primary" onClick={handleAssign} disabled={saving || !selectedRole}>
              {saving ? 'Assigning...' : 'Assign Role'}
            </button>
            <button className="bm-secondary" onClick={onClose} style={{ marginLeft: '10px' }}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}