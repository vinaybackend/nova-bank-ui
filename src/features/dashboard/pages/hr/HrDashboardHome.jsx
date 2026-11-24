import { useState, useEffect } from 'react';
import { getAllEmployees } from '../../../../services/hrService';

export default function HrDashboardHome({ onNavigate }) {
  const [stats, setStats] = useState({ total: 0, active: 0, missingDocs: 0, pendingLeaves: 14 });
  const [recentEmployees, setRecentEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const response = await getAllEmployees({ page: 0, size: 1000 });
        const employees = response?.content || response || [];

        let activeCount = 0;
        let missingDocsCount = 0;

        employees.forEach(emp => {
          if (String(emp.employmentStatus).toUpperCase() === 'ACTIVE') activeCount++;
          const hasPendingDocs = emp.documents?.some(d => d.verificationStatus === 'PENDING') || false;
          const noDocs = !emp.documents || emp.documents.length === 0;
          if (hasPendingDocs || noDocs) missingDocsCount++;
        });

        setStats({ total: employees.length, active: activeCount, missingDocs: missingDocsCount, pendingLeaves: 14 });

        const sorted = [...employees].sort((a, b) => new Date(b.dateOfJoining || 0) - new Date(a.dateOfJoining || 0));
        setRecentEmployees(sorted.slice(0, 3));
      } catch (err) {
        console.error("Failed to load dashboard stats", err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, []);

  return (
    <>
      {/* Welcome Row using Admin classes */}
      <div className="ad-welcome">
        <div>
          <h1>Welcome to HR Operations</h1>
          <p>Manage bank staff, track attendance, and oversee compliance.</p>
        </div>
        <div className="ad-welcome-side">
          <div className="ad-chip">
            <span className="ad-chip-icon">👤</span>
            <div>
              <b>HR Manager</b>
              <small>Active Session</small>
            </div>
          </div>
          <div className="ad-chip">
            <span className="ad-chip-icon">📅</span>
            <div>
              <b>{new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }).format(new Date())}</b>
              <small>{new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit' }).format(new Date())}</small>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Grid using Admin classes */}
      <section className="ad-kpis">
        <div className="ad-kpi ad-kpi-blue">
          <span className="ad-kpi-icon">👥</span>
          <div className="ad-kpi-body">
            <span className="ad-kpi-label">Total Employees</span>
            <strong className="ad-kpi-value">{loading ? '—' : stats.total.toLocaleString()}</strong>
          </div>
        </div>
        <div className="ad-kpi ad-kpi-green">
          <span className="ad-kpi-icon">✅</span>
          <div className="ad-kpi-body">
            <span className="ad-kpi-label">Active Employees</span>
            <strong className="ad-kpi-value">{loading ? '—' : stats.active.toLocaleString()}</strong>
          </div>
        </div>
        <div className="ad-kpi ad-kpi-amber">
          <span className="ad-kpi-icon">📝</span>
          <div className="ad-kpi-body">
            <span className="ad-kpi-label">Pending Leaves</span>
            <strong className="ad-kpi-value">{stats.pendingLeaves}</strong>
          </div>
        </div>
        <div className="ad-kpi ad-kpi-red">
          <span className="ad-kpi-icon">⚠️</span>
          <div className="ad-kpi-body">
            <span className="ad-kpi-label">Missing Docs</span>
            <strong className="ad-kpi-value">{loading ? '—' : stats.missingDocs}</strong>
          </div>
        </div>
      </section>

      {/* Main Grid using Admin classes */}
      <section className="ad-grid">
        <div className="ad-panel">
          <div className="ad-panel-head">
            <div>
              <h2>Recent Onboarding</h2>
              <p>Newly joined staff awaiting document verification</p>
            </div>
            <button className="ad-ghost" onClick={() => onNavigate && onNavigate('Directory')}>View all →</button>
          </div>
          <div className="ad-table-wrap">
            <table className="ad-table">
              <thead>
                <tr><th>Employee</th><th>Role</th><th>Branch</th><th>Status</th></tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="4" className="ad-empty">Loading...</td></tr>
                ) : recentEmployees.length === 0 ? (
                  <tr><td colSpan="4" className="ad-empty">No recent onboardings.</td></tr>
                ) : (
                  recentEmployees.map(emp => {
                    const hasDocs = emp.documents && emp.documents.length > 0;
                    const isVerified = hasDocs && emp.documents.every(d => d.verificationStatus === 'VERIFIED');
                    return (
                      <tr key={emp.id}>
                        <td><b>{emp.firstName} {emp.lastName}</b><br/><small className="ad-cell-time">{emp.employeeCode}</small></td>
                        <td>{emp.jobTitle}</td>
                        <td>{emp.branchName || emp.branchCode}</td>
                        <td>
                          {isVerified ? (
                            <span className="ad-status ad-status-ok">Verified</span>
                          ) : (
                            <span className="ad-status ad-status-warn">Doc Pending</span>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions using Admin classes */}
        <div className="ad-panel">
          <div className="ad-panel-head">
            <div>
              <h2>Quick actions</h2>
              <p>Common HR tasks</p>
            </div>
          </div>
          <ul className="ad-actions">
            <li>
              <button className="ad-action" onClick={() => onNavigate && onNavigate('Directory')}>
                <span className="ad-action-icon">📝</span>
                <span className="ad-action-text">
                  <b>Manage Employees</b>
                  <small>Onboard new staff</small>
                </span>
                <span className="ad-action-arrow">›</span>
              </button>
            </li>
            <li>
              <button className="ad-action">
                <span className="ad-action-icon">📅</span>
                <span className="ad-action-text">
                  <b>Approve Leaves</b>
                  <small>14 pending requests</small>
                </span>
                <span className="ad-action-arrow">›</span>
              </button>
            </li>
            <li>
              <button className="ad-action">
                <span className="ad-action-icon">💵</span>
                <span className="ad-action-text">
                  <b>Process Payroll</b>
                  <small>For October 2026</small>
                </span>
                <span className="ad-action-arrow">›</span>
              </button>
            </li>
          </ul>
        </div>
      </section>
    </>
  );
}