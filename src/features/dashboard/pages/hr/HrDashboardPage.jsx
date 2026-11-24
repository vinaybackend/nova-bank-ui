import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { clearAuthSession } from '../../../../services/apiClient';
import HrDashboardHome from './HrDashboardHome';
import HrEmployeeDirectory from './HrEmployeeDirectory'; // 👈 Fixed Import
import ChangePasswordModal from '../../../profile/ChangePasswordModal';
import '../admin/AdminDashboard.css'; 

const NAV_ITEMS = [
  { label: 'HR Dashboard', icon: '▦', id: 'Dashboard' },
  { label: 'Employee Directory', icon: '👥', id: 'Directory' },
  { label: 'Onboarding', icon: '📝', id: 'Onboarding' },
  { label: 'Attendance & Leave', icon: '📅', id: 'Attendance' },
  { label: 'Payroll', icon: '💵', id: 'Payroll' },
  { label: 'Documents', icon: '📁', id: 'Documents' },
];

export default function HrDashboardPage({ onSignOut }) {
  const navigate = useNavigate();
  const [activePage, setActivePage] = useState('Dashboard');
  
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    clearAuthSession();
    if (typeof onSignOut === 'function') onSignOut();
    else navigate('/login', { replace: true });
  };

  return (
    <div className="ad-shell">
      <aside className="ad-sidebar">
        <a className="ad-brand" href="#dashboard" onClick={(e) => { e.preventDefault(); setActivePage('Dashboard'); }}>
          <span className="ad-brand-mark">N</span>
          <span className="ad-brand-text">
            <strong>NOVA BANK</strong>
            <small>Human Resources</small>
          </span>
        </a>

        <div className="ad-user">
          <span className="ad-avatar">HR</span>
          <div className="ad-user-info">
            <b>HR Manager</b>
            <small>Head Office</small>
            <span className="ad-online"><i />Online</span>
          </div>
        </div>

        <div className="ad-nav-label">HR Workspace</div>
        <nav className="ad-nav">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              className={activePage === item.id ? 'active' : ''}
              onClick={() => setActivePage(item.id)}
            >
              <span className="ad-nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="ad-sidebar-bottom">
          <button className="ad-logout" onClick={handleLogout}>
            <span className="ad-nav-icon">⏻</span>
            <span>Logout</span>
          </button>
          <div className="ad-secure">
            <span className="ad-secure-dot" />
            Signed in securely
          </div>
        </div>
      </aside>

      <div className="ad-main">
        <header className="ad-topbar">
          <div className="ad-topbar-left">
            <div className="ad-topbar-title">
              <strong>Human Resources Management</strong>
              <span>Employee lifecycle, payroll, and compliance</span>
            </div>
          </div>
          <div className="ad-topbar-right">
            <button className="ad-icon-btn" aria-label="Notifications">
              🔔
              <span className="ad-badge">4</span>
            </button>
            
            <div style={{ position: 'relative' }} ref={profileMenuRef}>
              <button 
                className="ad-profile" 
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                style={{ cursor: 'pointer' }}
              >
                <span className="ad-avatar-sm">HR</span>
                <span className="ad-profile-name">HR Manager</span>
                <span className="ad-chevron"></span>
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

        <div className="ad-content">
          {!['Dashboard', 'Directory'].includes(activePage) && (
            <div className="ad-panel" style={{ padding: '40px', textAlign: 'center', color: '#7c879a' }}>
              <h2>{activePage} Module</h2>
              <p>This enterprise HR module is under construction.</p>
            </div>
          )}

          {activePage === 'Dashboard' && <HrDashboardHome onNavigate={(page) => setActivePage(page)} />}
          
          {/* 👈 Fixed component name here */}
          {activePage === 'Directory' && <HrEmployeeDirectory />}
        </div>
      </div>

      {showPasswordModal && (
        <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />
      )}
    </div>
  );
}