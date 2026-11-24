import { useState } from 'react';

export default function BranchSettingsPage({ branch, identity }) {
  const [notifications, setNotifications] = useState(true);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Manager Profile Panel */}
      <div className="bm-panel">
        <div className="bm-panel-head">
          <div>
            <h2>Manager Profile</h2>
            <p>Your personal account details</p>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <span style={{ fontSize: '11px', color: '#8792a5', fontWeight: '700', textTransform: 'uppercase' }}>Full Name</span>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#1c2740', marginTop: '4px' }}>{identity.name || '—'}</div>
          </div>
          <div>
            <span style={{ fontSize: '11px', color: '#8792a5', fontWeight: '700', textTransform: 'uppercase' }}>Email Address</span>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#1c2740', marginTop: '4px' }}>{identity.email || '—'}</div>
          </div>
          <div>
            <span style={{ fontSize: '11px', color: '#8792a5', fontWeight: '700', textTransform: 'uppercase' }}>Role</span>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#1c2740', marginTop: '4px' }}>Branch Manager</div>
          </div>
        </div>
      </div>

      {/* Branch Details Panel */}
      <div className="bm-panel">
        <div className="bm-panel-head">
          <div>
            <h2>Assigned Branch Details</h2>
            <p>Operational information for your branch</p>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <span style={{ fontSize: '11px', color: '#8792a5', fontWeight: '700', textTransform: 'uppercase' }}>Branch Name</span>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#1c2740', marginTop: '4px' }}>{branch?.branchName || '—'}</div>
          </div>
          <div>
            <span style={{ fontSize: '11px', color: '#8792a5', fontWeight: '700', textTransform: 'uppercase' }}>Branch Code / IFSC</span>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#1c2740', marginTop: '4px' }}>
              {branch?.branchCode || '—'} / {branch?.ifsc || '—'}
            </div>
          </div>
          <div>
            <span style={{ fontSize: '11px', color: '#8792a5', fontWeight: '700', textTransform: 'uppercase' }}>Location</span>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#1c2740', marginTop: '4px' }}>
              {branch?.city || '—'}, {branch?.state || '—'}
            </div>
          </div>
          <div>
            <span style={{ fontSize: '11px', color: '#8792a5', fontWeight: '700', textTransform: 'uppercase' }}>Status</span>
            <div style={{ marginTop: '4px' }}>
              <span className={`bm-status bm-status-${branch?.status === 'ACTIVE' ? 'ok' : 'neutral'}`}>
                {branch?.status || 'ACTIVE'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Preferences Panel */}
      <div className="bm-panel">
        <div className="bm-panel-head">
          <div>
            <h2>Preferences</h2>
            <p>System settings for your dashboard</p>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #eef2f8' }}>
          <div>
            <b style={{ fontSize: '13px', color: '#1c2740' }}>Email Notifications</b>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#8792a5' }}>Receive daily summaries of branch activity</p>
          </div>
          <button 
            type="button"
            onClick={() => setNotifications(!notifications)}
            style={{
              padding: '6px 12px', border: '0', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer',
              background: notifications ? '#e7f8ef' : '#eef2f8',
              color: notifications ? '#127c50' : '#6b7789'
            }}
          >
            {notifications ? 'Enabled' : 'Disabled'}
          </button>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0' }}>
          <div>
            <b style={{ fontSize: '13px', color: '#1c2740' }}>Two-Factor Authentication</b>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#8792a5' }}>Secure your account with 2FA</p>
          </div>
          <span className="bm-status bm-status-ok">Active</span>
        </div>
      </div>

    </div>
  );
}