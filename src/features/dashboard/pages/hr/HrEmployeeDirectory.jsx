import { useState, useEffect } from 'react';
import { getAllEmployees } from '../../../../services/hrService';
import adminService from '../../../../services/adminService';
// 👈 Import the exact same modal used by the Branch Manager
import RegisterEmployeeModal from '../bankManager/RegisterEmployeeModal'; 
import './HrEmployeeDirectory.css';

const statusTone = (s) => {
  const v = String(s || '').toUpperCase();
  if (['ACTIVE', 'VERIFIED', 'PRESENT'].includes(v)) return 'ok';
  if (['ONBOARDING', 'PENDING', 'UNDER_REVIEW'].includes(v)) return 'warn';
  if (['SUSPENDED', 'TERMINATED', 'REJECTED', 'ABSENT'].includes(v)) return 'bad';
  return 'neutral';
};

const isUpcoming = (dateString) => {
  if (!dateString) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const nextMonth = new Date(today);
  nextMonth.setDate(today.getDate() + 30);

  const date = new Date(dateString);
  date.setFullYear(today.getFullYear());
  date.setHours(0, 0, 0, 0);

  if (date < today) date.setFullYear(today.getFullYear() + 1);
  return date >= today && date <= nextMonth;
};

export default function HrEmployeeDirectory() {
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [loading, setLoading] = useState(true);

  // 👈 State to control the shared modal
  const [showAddModal, setShowAddModal] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const empRes = await getAllEmployees({ page: 0, size: 100 });
      setEmployees(empRes?.content || empRes || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const filtered = employees.filter(e => 
    [e.firstName, e.lastName, e.employeeCode, e.email]
      .filter(Boolean).join(' ').toLowerCase().includes(search.toLowerCase())
  );

  const recentJoinees = [...employees].sort((a, b) => new Date(b.dateOfJoining || 0) - new Date(a.dateOfJoining || 0)).slice(0, 4);
  const upcomingBirthdays = employees.filter(e => isUpcoming(e.dateOfBirth)).slice(0, 4);
  const upcomingAnniversaries = employees.filter(e => isUpcoming(e.dateOfJoining)).slice(0, 4);

  return (
    <div className="hr-dir-page">
      
      {/* 1. TOP WIDGETS ROW */}
      <div className="hr-widgets-grid">
        <div className="hr-panel hr-widget-card">
          <div className="hr-panel-head" style={{ marginBottom: '12px' }}>
            <div><h2>Recent Joiners</h2><p>Newest staff members</p></div>
          </div>
          <ul className="hr-widget-list">
            {recentJoinees.length === 0 ? <li className="hr-empty">No data</li> : recentJoinees.map(emp => (
              <li key={emp.id} onClick={() => setSelectedEmp(emp)}>
                <img src={emp.profileImageUrl || `https://ui-avatars.com/api/?name=${emp.firstName}+${emp.lastName}&background=random`} alt="profile" />
                <div><b>{emp.firstName} {emp.lastName}</b><small>Joined: {emp.dateOfJoining}</small></div>
              </li>
            ))}
          </ul>
        </div>

        <div className="hr-panel hr-widget-card">
          <div className="hr-panel-head" style={{ marginBottom: '12px' }}>
            <div><h2>Upcoming Birthdays</h2><p>Next 30 days</p></div>
          </div>
          <ul className="hr-widget-list">
            {upcomingBirthdays.length === 0 ? <li className="hr-empty">No data</li> : upcomingBirthdays.map(emp => (
              <li key={emp.id} onClick={() => setSelectedEmp(emp)}>
                <span className="hr-widget-icon" style={{ background: '#fff5d9', color: '#8a6000' }}>🎂</span>
                <div><b>{emp.firstName} {emp.lastName}</b><small>{new Date(emp.dateOfBirth).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</small></div>
              </li>
            ))}
          </ul>
        </div>

        <div className="hr-panel hr-widget-card">
          <div className="hr-panel-head" style={{ marginBottom: '12px' }}>
            <div><h2>Work Anniversaries</h2><p>Next 30 days</p></div>
          </div>
          <ul className="hr-widget-list">
            {upcomingAnniversaries.length === 0 ? <li className="hr-empty">No data</li> : upcomingAnniversaries.map(emp => {
              const years = new Date().getFullYear() - new Date(emp.dateOfJoining).getFullYear();
              return (
                <li key={emp.id} onClick={() => setSelectedEmp(emp)}>
                  <span className="hr-widget-icon" style={{ background: '#e7f8ef', color: '#127c50' }}>🏆</span>
                  <div><b>{emp.firstName} {emp.lastName}</b><small>{years > 0 ? `${years} Year(s)` : '1st Year'}</small></div>
                </li>
              )
            })}
          </ul>
        </div>
      </div>

      {/* 2. HEADER & SEARCH BAR */}
      <div className="hr-dir-head">
        <div>
          <h2>Employee Directory</h2>
          <p>All staff members across branches</p>
        </div>
        <div className="hr-dir-actions">
          <input 
            type="text" 
            className="hr-search" 
            placeholder="Search by name, ID, email..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {/* 👈 Open the shared modal */}
          <button className="hr-btn-primary" onClick={() => setShowAddModal(true)}>
            + Register Employee
          </button>
        </div>
      </div>

      {/* 3. MAIN TABLE */}
      <div className="hr-panel" style={{ padding: 0 }}>
        <div className="hr-table-wrap">
          <table className="hr-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Code</th>
                <th>Role / Department</th>
                <th>Branch</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" className="hr-empty">Loading employees...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan="6" className="hr-empty">No employees found.</td></tr>
              ) : (
                filtered.map(emp => (
                  <tr key={emp.id} onClick={() => setSelectedEmp(emp)} className="hr-row">
                    <td>
                      <div className="hr-cell-user">
                        <img src={emp.profileImageUrl || `https://ui-avatars.com/api/?name=${emp.firstName}+${emp.lastName}&background=random`} alt="profile" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
                        <b>{emp.firstName} {emp.lastName}</b>
                      </div>
                    </td>
                    <td className="hr-mono">{emp.employeeCode}</td>
                    <td><b>{emp.jobTitle}</b><br/><small style={{ color: '#8792a5' }}>{emp.department}</small></td>
                    <td>{emp.branchName || emp.branchCode}</td>
                    <td><span className={`hr-status ${statusTone(emp.employmentStatus)}`}>{emp.employmentStatus}</span></td>
                    <td><span className="hr-link">View Profile →</span></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAIL DRAWER */}
      {selectedEmp && (
        <div className="hr-drawer-backdrop" onClick={() => setSelectedEmp(null)}>
          <div className="hr-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="hr-drawer-head">
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <img src={selectedEmp.profileImageUrl || `https://ui-avatars.com/api/?name=${selectedEmp.firstName}+${selectedEmp.lastName}&background=random`} alt="profile" style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #e2e8f0' }} />
                <div>
                  <h2>{selectedEmp.firstName} {selectedEmp.middleName} {selectedEmp.lastName}</h2>
                  <p className="hr-mono" style={{ margin: '4px 0 0' }}>{selectedEmp.employeeCode} · {selectedEmp.jobTitle}</p>
                </div>
              </div>
              <button onClick={() => setSelectedEmp(null)} className="hr-close-btn">✕</button>
            </div>

            <div className="hr-drawer-body">
              <section className="hr-section">
                <h3>Personal Details</h3>
                <div className="hr-grid-2">
                  <div className="hr-field"><span>First Name</span><b>{selectedEmp.firstName}</b></div>
                  <div className="hr-field"><span>Middle Name</span><b>{selectedEmp.middleName || '—'}</b></div>
                  <div className="hr-field"><span>Last Name</span><b>{selectedEmp.lastName}</b></div>
                  <div className="hr-field"><span>Date of Birth</span><b>{selectedEmp.dateOfBirth || '—'}</b></div>
                  <div className="hr-field"><span>Gender</span><b>{selectedEmp.gender || '—'}</b></div>
                  <div className="hr-field"><span>Marital Status</span><b>{selectedEmp.maritalStatus || '—'}</b></div>
                </div>
              </section>

              <section className="hr-section">
                <h3>Contact Details</h3>
                <div className="hr-grid-2">
                  <div className="hr-field"><span>Email</span><b>{selectedEmp.email || '—'}</b></div>
                  <div className="hr-field"><span>Mobile</span><b>{selectedEmp.mobileNumber || '—'}</b></div>
                </div>
              </section>

              <section className="hr-section">
                <h3>Employment Details</h3>
                <div className="hr-grid-2">
                  <div className="hr-field"><span>Job Title</span><b>{selectedEmp.jobTitle || '—'}</b></div>
                  <div className="hr-field"><span>Department</span><b>{selectedEmp.department || '—'}</b></div>
                  <div className="hr-field"><span>Grade</span><b>{selectedEmp.grade || '—'}</b></div>
                  <div className="hr-field"><span>Employee Type</span><b>{selectedEmp.employeeType || '—'}</b></div>
                  <div className="hr-field"><span>Branch</span><b>{selectedEmp.branchName} ({selectedEmp.branchCode})</b></div>
                  <div className="hr-field"><span>Joining Date</span><b>{selectedEmp.dateOfJoining || '—'}</b></div>
                  <div className="hr-field" style={{ gridColumn: 'span 2' }}>
                    <span>Status</span>
                    <b className={`hr-status ${statusTone(selectedEmp.employmentStatus)}`}>{selectedEmp.employmentStatus}</b>
                  </div>
                </div>
              </section>

              <section className="hr-section">
                <h3>Bank Account & Payroll</h3>
                {selectedEmp.bankAccount ? (
                  <div className="hr-grid-2">
                    <div className="hr-field"><span>Bank Name</span><b>{selectedEmp.bankAccount.bankName}</b></div>
                    <div className="hr-field"><span>Account Number</span><b>{selectedEmp.bankAccount.accountNumber}</b></div>
                    <div className="hr-field"><span>IFSC Code</span><b>{selectedEmp.bankAccount.ifscCode}</b></div>
                    <div className="hr-field"><span>Account Holder</span><b>{selectedEmp.bankAccount.accountHolderName}</b></div>
                  </div>
                ) : (
                  <p style={{ fontSize: '13px', color: '#8792a5' }}>No bank account details provided.</p>
                )}
              </section>
            </div>
          </div>
        </div>
      )}

      {/* 👈 RENDER SHARED MODAL */}
      {showAddModal && (
        <RegisterEmployeeModal 
          currentBranchId={null} // HR is global, so no specific branch restriction
          onClose={() => setShowAddModal(false)} 
          onSuccess={() => {
            loadData(); // Refresh the HR directory list
            setShowAddModal(false);
          }} 
        />
      )}

    </div>
  );
}