import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { getRoles } from '../../../../services/authService';
import branchManagerService from '../../../../services/branchManagerService';

export default function RegisterEmployeeModal({ onClose, onSuccess, currentBranchId }) {
  const [formData, setFormData] = useState({
    name: '', // ✨ Changed: Single name field instead of first/middle/last
    dateOfBirth: '', gender: '', maritalStatus: 'SINGLE',
    email: '', mobileNumber: '', 
    jobTitle: '', department: '', grade: '', employeeType: 'PERMANENT',
    branchCode: '', branchName: '', ifscCode: '', 
    roleName: '', 
    bankAccount: { accountNumber: '', ifscCode: '', bankName: '', accountHolderName: '' },
    documents: [{ documentType: 'PAN_CARD', documentNumber: '' }]
  });

  const [branches, setBranches] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [createdCredentials, setCreatedCredentials] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      setError(''); 
      const [branchResult, roleResult] = await Promise.allSettled([
        branchManagerService.getAllBranches(),
        getRoles()
      ]);

      if (!isMounted) return;

      if (branchResult.status === 'fulfilled') {
        const bData = branchResult.value;
        setBranches(Array.isArray(bData) ? bData : (bData?.content || []));
      }

      if (roleResult.status === 'fulfilled') {
        setRoles(roleResult.value || []);
      } else {
        setRoles([{ id: '1', name: 'BRANCH_MANAGER' }, { id: '2', name: 'KYC_OFFICER' }]);
      }

      if (currentBranchId && branchResult.status === 'fulfilled') {
        const bData = branchResult.value;
        const safeBranches = Array.isArray(bData) ? bData : (bData?.content || []);
        const myBranch = safeBranches.find(b => (b.branchCode || b.code) === currentBranchId);
        if (myBranch) {
          setFormData(prev => ({ 
            ...prev, 
            branchCode: myBranch.branchCode || myBranch.code,
            branchName: myBranch.branchName || myBranch.name,
            ifscCode: myBranch.ifscCode || myBranch.ifsc
          }));
        }
      }
    };
    fetchData();
    return () => { isMounted = false; };
  }, [currentBranchId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'branchCode') {
      const selectedBranch = branches.find(b => (b.branchCode || b.code) === value);
      setFormData(prev => ({ 
        ...prev, 
        branchCode: value,
        branchName: selectedBranch ? (selectedBranch.branchName || selectedBranch.name) : '',
        ifscCode: selectedBranch ? (selectedBranch.ifscCode || selectedBranch.ifsc) : ''
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleBankChange = (e) => {
    setFormData(prev => ({
      ...prev,
      bankAccount: { ...prev.bankAccount, [e.target.name]: e.target.value }
    }));
  };

  const handleDocumentChange = (index, e) => {
    const updatedDocs = [...formData.documents];
    updatedDocs[index][e.target.name] = e.target.value;
    setFormData(prev => ({ ...prev, documents: updatedDocs }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const validDocuments = formData.documents.filter(d => d.documentNumber.trim() !== '');
      const today = new Date().toISOString().split('T')[0];

      // ✨ Updated payload to match CreateEmployeeRequest
      const payload = {
        name: formData.name,
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender.toUpperCase(),
        maritalStatus: formData.maritalStatus.toUpperCase(),
        email: formData.email,
        mobileNumber: formData.mobileNumber,
        jobTitle: formData.jobTitle,
        department: formData.department,
        grade: formData.grade,
        employeeType: formData.employeeType, // Already uppercase enum
        branchCode: formData.branchCode,
        branchName: formData.branchName,
        ifscCode: formData.ifscCode,
        roleName: formData.roleName, 
        bankAccount: (formData.bankAccount.accountNumber) ? formData.bankAccount : null,
        documents: validDocuments.length > 0 ? validDocuments : null
      };

      const response = await branchManagerService.registerEmployee(payload);

      // ✨ Handles the `generatedPassword` from EmployeeResponse
      if (response && response.generatedPassword) {
        setCreatedCredentials({
          email: formData.email,
          password: response.generatedPassword
        });
        onSuccess(); 
      } else {
        onSuccess();
        onClose();
      }
    } catch (err) {
      setError(err.message || 'Failed to register employee.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (createdCredentials) {
      navigator.clipboard.writeText(`Email: ${createdCredentials.email}\nPassword: ${createdCredentials.password}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return createPortal(
    <div 
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, backdropFilter: 'blur(3px)' }} 
      onClick={!createdCredentials ? onClose : undefined}
    >
      <div 
        style={{ background: '#fff', width: '100%', maxWidth: '900px', maxHeight: '90vh', borderRadius: '16px', padding: '32px', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }} 
        onClick={e => e.stopPropagation()}
      >
        {!createdCredentials ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px' }}>
              <h2 style={{ margin: 0, fontSize: '20px', color: '#0f172a' }}>Register New Employee</h2>
              <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer', color: '#64748b', fontSize: '16px' }}>✕</button>
            </div>

            {error && <div style={{ marginBottom: '20px', padding: '12px', background: '#fee2e2', color: '#b91c1c', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold' }}>{error}</div>}

            <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              
              {/* ✨ Changed: Single Name Input */}
              <div className="be-field" style={{ gridColumn: 'span 2' }}>
                <span>Full Name *</span>
                <input required name="name" value={formData.name} onChange={handleChange} placeholder="e.g. Vinay Kumar Yadav" style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%' }}/>
              </div>

              <div className="be-field"><span>Date of Birth *</span><input required type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%' }}/></div>
              
              <div className="be-field"><span>Gender *</span>
                <select required name="gender" value={formData.gender} onChange={handleChange} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%' }}>
                  <option value="">Select Gender</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                  <option value="PREFER_NOT_TO_SAY">Prefer Not to Say</option>
                </select>
              </div>

              <div className="be-field"><span>Marital Status</span>
                <select name="maritalStatus" value={formData.maritalStatus} onChange={handleChange} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%' }}>
                  <option value="SINGLE">Single</option>
                  <option value="MARRIED">Married</option>
                  <option value="DIVORCED">Divorced</option>
                  <option value="WIDOWED">Widowed</option>
                </select>
              </div>

              <div className="be-field"><span>Email *</span><input required type="email" name="email" value={formData.email} onChange={handleChange} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%' }}/></div>
              <div className="be-field"><span>Mobile Number *</span><input required name="mobileNumber" value={formData.mobileNumber} onChange={handleChange} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%' }}/></div>

              <div className="be-field"><span>Job Title *</span><input required name="jobTitle" value={formData.jobTitle} onChange={handleChange} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%' }}/></div>
              <div className="be-field"><span>Department *</span><input required name="department" value={formData.department} onChange={handleChange} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%' }}/></div>
              
              <div className="be-field"><span>Employee Type *</span>
                <select required name="employeeType" value={formData.employeeType} onChange={handleChange} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%' }}>
                  <option value="PERMANENT">Permanent</option>
                  <option value="CONTRACTUAL">Contractual</option>
                  <option value="INTERN">Intern</option>
                  <option value="CONSULTANT">Consultant</option>
                </select>
              </div>
              
              <div className="be-field"><span>Grade</span><input name="grade" value={formData.grade} onChange={handleChange} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%' }}/></div>

              <div className="be-field" style={{ gridColumn: 'span 2' }}>
                <span>Assign Branch *</span>
                <select required name="branchCode" value={formData.branchCode} onChange={handleChange} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%' }}>
                  <option value="">Select Branch</option>
                  {branches.map(b => {
                    const bCode = b.branchCode || b.code;
                    const bName = b.branchName || b.name;
                    return (
                      <option key={bCode} value={bCode}>{bName} | {b.city}, {b.state} (IFSC: {b.ifscCode || b.ifsc})</option>
                    );
                  })}
                </select>
              </div>

              <div className="be-field" style={{ gridColumn: 'span 2' }}>
                <span>Assign System Role *</span>
                <select required name="roleName" value={formData.roleName} onChange={handleChange} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%' }}>
                  <option value="">Select Role</option>
                  {roles.map(r => (
                    <option key={r.id || r.name} value={r.name}>{r.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
                <button type="button" onClick={onClose} style={{ padding: '10px 20px', border: '1px solid #cbd5e1', background: 'transparent', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, color: '#475569' }}>Cancel</button>
                <button type="submit" disabled={loading} style={{ padding: '10px 24px', background: '#1769e0', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>
                  {loading ? 'Registering...' : 'Register Employee'}
                </button>
              </div>
            </form>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎉</div>
            <h2 style={{ color: '#0f172a', marginBottom: '8px' }}>Employee Registered Successfully!</h2>
            <p style={{ color: '#64748b', marginBottom: '24px' }}>
              Please provide these login credentials to the employee. They will be prompted to change their password upon first login.
            </p>

            <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '24px', borderRadius: '12px', maxWidth: '400px', margin: '0 auto', textAlign: 'left' }}>
              <div style={{ marginBottom: '16px' }}>
                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Login Email</span>
                <div style={{ fontSize: '16px', color: '#0f172a', fontWeight: '600', marginTop: '4px' }}>{createdCredentials.email}</div>
              </div>
              <div>
                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Temporary Password</span>
                <div style={{ fontSize: '18px', color: '#e11d48', fontWeight: '800', marginTop: '4px', letterSpacing: '1px' }}>{createdCredentials.password}</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '32px' }}>
              <button onClick={copyToClipboard} style={{ padding: '12px 24px', background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>
                {copied ? '✓ Copied!' : '📋 Copy Credentials'}
              </button>
              <button onClick={onClose} style={{ padding: '12px 32px', background: '#1769e0', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body 
  );
}