import { useState } from 'react';
// 👈 Correct path: from features/profile, go up 2 levels to src, then into services
import { changePassword } from '../../services/authService'; 

export default function ChangePasswordModal({ onClose }) {
  const [formData, setFormData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (formData.newPassword !== formData.confirmPassword) {
      return setError("New passwords do not match.");
    }

    if (formData.newPassword.length < 8) {
      return setError("New password must be at least 8 characters.");
    }

    setLoading(true);
    try {
      await changePassword(formData.oldPassword, formData.newPassword);
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Failed to change password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, backdropFilter: 'blur(3px)' }} 
      onClick={onClose}
    >
      <div 
        style={{ background: '#fff', width: '100%', maxWidth: '400px', borderRadius: '16px', padding: '32px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }} 
        onClick={e => e.stopPropagation()}
      >
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ margin: 0, fontSize: '20px', color: '#0f172a' }}>Change Password</h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#64748b' }}>✕</button>
        </div>

        {success ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
            <h3 style={{ color: '#0f172a', marginBottom: '8px' }}>Password Updated</h3>
            <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '24px' }}>Your password has been changed successfully.</p>
            <button onClick={onClose} style={{ width: '100%', padding: '12px', background: '#1769e0', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>Close</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {error && <div style={{ padding: '12px', background: '#fee2e2', color: '#b91c1c', borderRadius: '8px', fontSize: '13px' }}>{error}</div>}

            <label style={{ display: 'grid', gap: '6px', color: '#334155', fontSize: '13px', fontWeight: 700 }}>
              <span>Current Password *</span>
              <input required type="password" name="oldPassword" autoComplete="current-password" placeholder="Enter your current password" value={formData.oldPassword} onChange={handleChange} style={{ padding: '11px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%' }} />
            </label>

            <label style={{ display: 'grid', gap: '6px', color: '#334155', fontSize: '13px', fontWeight: 700 }}>
              <span>New Password *</span>
              <input required type="password" name="newPassword" autoComplete="new-password" placeholder="Enter at least 8 characters" value={formData.newPassword} onChange={handleChange} style={{ padding: '11px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%' }} />
            </label>

            <label style={{ display: 'grid', gap: '6px', color: '#334155', fontSize: '13px', fontWeight: 700 }}>
              <span>Confirm New Password *</span>
              <input required type="password" name="confirmPassword" autoComplete="new-password" placeholder="Re-enter the new password" value={formData.confirmPassword} onChange={handleChange} style={{ padding: '11px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%' }} />
            </label>

            <button type="submit" disabled={loading} style={{ marginTop: '16px', padding: '12px', background: '#1769e0', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}