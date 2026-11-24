export default function BranchReportsPage({ accounts, transactions, customers }) {
  const totalBalance = accounts.reduce((sum, acc) => sum + (Number(acc.balance) || 0), 0);
  
  const today = new Date().toDateString();
  const todayTxCount = transactions.filter(t => new Date(t.createdAt).toDateString() === today).length;

  const txSuccess = transactions.filter(t => String(t.transactionStatus).toUpperCase() === 'SUCCESS').length;
  const txFailed = transactions.filter(t => String(t.transactionStatus).toUpperCase() === 'FAILED').length;
  const txTotal = transactions.length || 1; // prevent div by 0

  const formatMoney = (v) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v || 0);

  return (
    <div className="bm-panel">
      <div className="bm-panel-head">
        <div>
          <h2>Branch Reports & Analytics</h2>
          <p>Performance metrics for your branch</p>
        </div>
      </div>

      {/* Mini KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ padding: '16px', background: '#f9fbfe', borderRadius: '10px', border: '1px solid #eef2f8' }}>
          <span style={{ fontSize: '11.5px', color: '#8792a5', fontWeight: '700', textTransform: 'uppercase' }}>Total Branch Deposits</span>
          <div style={{ fontSize: '22px', fontWeight: '800', color: '#1c2740', marginTop: '8px' }}>{formatMoney(totalBalance)}</div>
        </div>
        <div style={{ padding: '16px', background: '#f9fbfe', borderRadius: '10px', border: '1px solid #eef2f8' }}>
          <span style={{ fontSize: '11.5px', color: '#8792a5', fontWeight: '700', textTransform: 'uppercase' }}>Total Customers</span>
          <div style={{ fontSize: '22px', fontWeight: '800', color: '#1c2740', marginTop: '8px' }}>{customers.length}</div>
        </div>
        <div style={{ padding: '16px', background: '#f9fbfe', borderRadius: '10px', border: '1px solid #eef2f8' }}>
          <span style={{ fontSize: '11.5px', color: '#8792a5', fontWeight: '700', textTransform: 'uppercase' }}>Today's Transactions</span>
          <div style={{ fontSize: '22px', fontWeight: '800', color: '#1c2740', marginTop: '8px' }}>{todayTxCount}</div>
        </div>
      </div>

      {/* Transaction Success Rate Bars */}
      <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#1c2740', marginBottom: '16px' }}>Transaction Success Rate</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '600', marginBottom: '6px' }}>
            <span>Success</span>
            <span>{txSuccess}</span>
          </div>
          <div style={{ height: '8px', background: '#eef2f8', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(txSuccess / txTotal) * 100}%`, background: '#158456', borderRadius: '4px' }} />
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '600', marginBottom: '6px' }}>
            <span>Failed</span>
            <span>{txFailed}</span>
          </div>
          <div style={{ height: '8px', background: '#eef2f8', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(txFailed / txTotal) * 100}%`, background: '#c53849', borderRadius: '4px' }} />
          </div>
        </div>

      </div>
    </div>
  );
}