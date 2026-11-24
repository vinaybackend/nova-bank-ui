import { useCallback, useEffect, useMemo, useState } from 'react';
import adminService from '../../../../services/adminService';
import './ReportsAnalyticsPage.css';

// Safe fallback for normalizeList in case it's missing from adminService
const normalizeList = (res) => {
  if (adminService.normalizeList) return adminService.normalizeList(res);
  if (Array.isArray(res)) return res;
  if (res && Array.isArray(res.content)) return res.content; // Spring Boot Page
  if (res && Array.isArray(res.data)) return res.data;
  return [];
};

const formatMoney = (v) => {
  if (v == null || v === '') return '₹0';
  const n = Number(v);
  return Number.isNaN(n)
    ? String(v)
    : new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
      }).format(n);
};

export default function ReportsAnalyticsPage() {
  const [data, setData] = useState({
    accounts: [],
    transactions: [],
    branches: [],
    kyc: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  /* ---------- Load Data ---------- */
  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    
    try {
      // 1. Check if methods exist to prevent immediate crashes
      if (!adminService.getAllAccounts) {
        throw new Error("adminService.getAllAccounts is not defined.");
      }

      // 2. Safe wrapper for API calls
      const safeCall = async (fn, ...args) => {
        if (!fn) return null;
        try {
          return await fn(...args);
        } catch (err) {
          console.warn(`API call failed:`, err.message || err);
          return null;
        }
      };

      // 3. Fetch all data independently
      const accRes = await safeCall(adminService.getAllAccounts, { page: 0, size: 100 });
      const txRes = await safeCall(adminService.getAllTransactions, { page: 0, size: 100 });
      const brRes = await safeCall(adminService.getAllBranches);
      const kycRes = await safeCall(adminService.getAllKyc);

      // 4. Update state safely
      setData({
        accounts: accRes ? normalizeList(accRes) : [],
        transactions: txRes ? normalizeList(txRes) : [],
        branches: brRes ? normalizeList(brRes) : [],
        kyc: kycRes ? normalizeList(kycRes) : [],
      });
      
    } catch (err) {
      console.error("Failed to load analytics data:", err);
      setError(err.message || 'Failed to load analytics data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /* ---------- Calculate Analytics ---------- */
  const analytics = useMemo(() => {
    const { accounts, transactions, branches, kyc } = data;

    // 1. Financials
    const totalDeposits = accounts.reduce((sum, acc) => sum + (Number(acc.balance) || 0), 0);
    const totalTxVolume = transactions.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
    
    // Transaction Status Breakdown
    const txSuccess = transactions.filter(t => String(t.transactionStatus).toUpperCase() === 'SUCCESS').length;
    const txFailed = transactions.filter(t => String(t.transactionStatus).toUpperCase() === 'FAILED').length;
    const txPending = transactions.filter(t => String(t.transactionStatus).toUpperCase() === 'PENDING').length;
    const txTotal = transactions.length || 1; // prevent division by zero

    // Transaction Types
    const txTransfers = transactions.filter(t => String(t.transactionType).toUpperCase() === 'TRANSFER').length;
    const txDeposits = transactions.filter(t => String(t.transactionType).toUpperCase() === 'DEPOSIT').length;
    const txWithdrawals = transactions.filter(t => String(t.transactionType).toUpperCase() === 'WITHDRAWAL').length;

    // 2. KYC
    const kycApproved = kyc.filter(k => String(k.verificationStatus).toUpperCase() === 'APPROVED').length;
    const kycRejected = kyc.filter(k => String(k.verificationStatus).toUpperCase() === 'REJECTED').length;
    const kycPending = kyc.filter(k => ['PENDING', 'UNDER_REVIEW'].includes(String(k.verificationStatus).toUpperCase())).length;
    const kycTotal = kyc.length || 1;

    // 3. Branch Performance (Sort by total balance)
    const branchBalances = {};
    accounts.forEach(acc => {
      const bId = acc.branchId || 'Unknown';
      branchBalances[bId] = (branchBalances[bId] || 0) + (Number(acc.balance) || 0);
    });

    // Fallback if branches data is missing
    const branchesList = branches.length > 0 ? branches : [{ branchName: 'Main Branch', branchCode: 'MAIN', branchId: 'MAIN' }];

    const topBranches = branchesList.map(b => ({
      name: b.branchName || b.name || 'Unknown Branch',
      code: b.branchCode || b.code || 'N/A',
      balance: branchBalances[b.branchId] || 0,
    })).sort((a, b) => b.balance - a.balance).slice(0, 5);

    const maxBranchBalance = topBranches[0]?.balance || 1; // for percentage bars

    return {
      totalDeposits,
      totalTxVolume,
      txSuccess, txFailed, txPending, txTotal,
      txTransfers, txDeposits, txWithdrawals,
      kycApproved, kycRejected, kycPending, kycTotal,
      topBranches, maxBranchBalance
    };
  }, [data]);

  if (loading) return <div className="ad-panel ad-empty">Loading analytics dashboard…</div>;
  if (error) return <div className="ad-alert">{error} <button onClick={loadData} style={{ marginLeft: '10px' }}>Retry</button></div>;

  return (
    <div className="reports-page">
      <div className="reports-head">
        <div>
          <h1>Reports & Analytics</h1>
          <p>Bank-wide financial overview and operational metrics.</p>
        </div>
        <button className="rp-btn-secondary" onClick={loadData}>↻ Refresh Data</button>
      </div>

      {/* KPI Cards */}
      <section className="rp-kpis">
        <div className="rp-kpi">
          <span>Total Bank Deposits (AUM)</span>
          <b>{formatMoney(analytics.totalDeposits)}</b>
        </div>
        <div className="rp-kpi">
          <span>Total Transaction Volume</span>
          <b>{formatMoney(analytics.totalTxVolume)}</b>
        </div>
        <div className="rp-kpi">
          <span>Active Branches</span>
          <b>{data.branches.length}</b>
        </div>
        <div className="rp-kpi">
          <span>Total Customers</span>
          <b>{data.accounts.length} <small>(approx)</small></b>
        </div>
      </section>

      <div className="rp-grid">
        
        {/* Left Column */}
        <div className="rp-col">
          {/* Transaction Status Chart */}
          <div className="ad-panel">
            <div className="ad-panel-head">
              <div><h2>Transaction Success Rate</h2><p>Based on recent transactions</p></div>
            </div>
            <div className="rp-chart-bars">
              <div className="rp-bar-row">
                <div className="rp-bar-label"><span>Success</span><b>{analytics.txSuccess}</b></div>
                <div className="rp-bar-track"><div className="rp-bar-fill success" style={{ width: `${(analytics.txSuccess / analytics.txTotal) * 100}%` }} /></div>
              </div>
              <div className="rp-bar-row">
                <div className="rp-bar-label"><span>Pending</span><b>{analytics.txPending}</b></div>
                <div className="rp-bar-track"><div className="rp-bar-fill warning" style={{ width: `${(analytics.txPending / analytics.txTotal) * 100}%` }} /></div>
              </div>
              <div className="rp-bar-row">
                <div className="rp-bar-label"><span>Failed</span><b>{analytics.txFailed}</b></div>
                <div className="rp-bar-track"><div className="rp-bar-fill danger" style={{ width: `${(analytics.txFailed / analytics.txTotal) * 100}%` }} /></div>
              </div>
            </div>
          </div>

          {/* KYC Chart */}
          <div className="ad-panel">
            <div className="ad-panel-head">
              <div><h2>KYC Compliance</h2><p>Identity verification metrics</p></div>
            </div>
            <div className="rp-chart-bars">
              <div className="rp-bar-row">
                <div className="rp-bar-label"><span>Approved</span><b>{analytics.kycApproved}</b></div>
                <div className="rp-bar-track"><div className="rp-bar-fill success" style={{ width: `${(analytics.kycApproved / analytics.kycTotal) * 100}%` }} /></div>
              </div>
              <div className="rp-bar-row">
                <div className="rp-bar-label"><span>Pending / Review</span><b>{analytics.kycPending}</b></div>
                <div className="rp-bar-track"><div className="rp-bar-fill warning" style={{ width: `${(analytics.kycPending / analytics.kycTotal) * 100}%` }} /></div>
              </div>
              <div className="rp-bar-row">
                <div className="rp-bar-label"><span>Rejected</span><b>{analytics.kycRejected}</b></div>
                <div className="rp-bar-track"><div className="rp-bar-fill danger" style={{ width: `${(analytics.kycRejected / analytics.kycTotal) * 100}%` }} /></div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="rp-col">
          {/* Transaction Types */}
          <div className="ad-panel">
            <div className="ad-panel-head">
              <div><h2>Transaction Types</h2><p>Volume of transaction categories</p></div>
            </div>
            <div className="rp-type-grid">
              <div className="rp-type-card">
                <span>Transfers</span>
                <b>{analytics.txTransfers}</b>
              </div>
              <div className="rp-type-card">
                <span>Deposits</span>
                <b>{analytics.txDeposits}</b>
              </div>
              <div className="rp-type-card">
                <span>Withdrawals</span>
                <b>{analytics.txWithdrawals}</b>
              </div>
            </div>
          </div>

          {/* Top Branches */}
          <div className="ad-panel">
            <div className="ad-panel-head">
              <div><h2>Top Performing Branches</h2><p>Ranked by total account balances</p></div>
            </div>
            <div className="rp-branch-list">
              {analytics.topBranches.length === 0 ? (
                <div className="ad-empty">No branch data available.</div>
              ) : (
                analytics.topBranches.map((b, i) => (
                  <div key={i} className="rp-branch-item">
                    <div className="rp-branch-info">
                      <b>{b.name}</b>
                      <span>{b.code}</span>
                    </div>
                    <div className="rp-branch-amount">
                      {formatMoney(b.balance)}
                    </div>
                    <div className="rp-branch-bar-wrap">
                      <div className="rp-branch-bar" style={{ width: `${(b.balance / analytics.maxBranchBalance) * 100}%` }} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}