import { useEffect, useMemo, useState } from 'react'
import {
  assignLoanApplication,
  assessLoanCredit,
  createLoanProduct,
  decideLoanApplication,
  disburseLoan,
  getApplicationLoanAccount,
  getAssignedLoanApplications,
  getLoanApplications,
  getLoanApplicationReviewDetails,
  getLoanProducts,
  previewLoanDocument,
  recommendLoanApplication,
  deleteLoanDocument,
  requestAdditionalLoanDocuments,
  prepareLoanDisbursement,
  verifyLoanDocument,
  getStaffLoanPortfolio,
  getStaffLoanSchedule,
  getStaffLoanPayments,
} from '../../../../../services/loanApi'
import './BankLoanManagerPage.css'

function DocumentPreview({ file, onClose }) {
  const url = useMemo(() => (file ? URL.createObjectURL(file) : ''), [file])

  useEffect(() => {
    if (!url) return undefined
    return () => URL.revokeObjectURL(url)
  }, [url])

  if (!file) return null
  return (
    <div className="blm-preview-backdrop" role="presentation" onClick={onClose}>
      <section className="blm-preview-modal" role="dialog" aria-modal="true" aria-label="Loan document preview" onClick={(event) => event.stopPropagation()}>
        <div className="blm-preview-heading"><b>Document preview</b><button className="blm-button blm-button-light" onClick={onClose}>Close</button></div>
        {file.type.startsWith('image/') ? <img src={url} alt="Customer loan document" /> : <iframe title="Customer loan document" src={url} />}
      </section>
    </div>
  )
}

const money = (value) =>
  value == null
    ? '—'
    : new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 2,
      }).format(Number(value))

const statusLabel = (value) => ({
  SUBMITTED: 'Submitted',
  DETAILS_SUBMITTED: 'Submitted',
  DOCUMENTS_VERIFIED: 'Under review',
  CREDIT_PASSED: 'Under review',
  CREDIT_FAILED: 'Credit assessment failed',
  RECOMMENDED: 'Pending manager approval',
  RETURNED_FOR_REVIEW: 'Returned for review',
  ADDITIONAL_DOCUMENTS_REQUIRED: 'Documents required',
  REJECTED: 'Rejected',
  OFFERED: 'Offer sent',
  OFFER_REJECTED: 'Offer declined',
  OFFER_ACCEPTED: 'Agreement pending',
  AGREEMENT_ACCEPTED: 'Disbursement pending',
  DISBURSEMENT_AUTHORIZED: 'Disbursement processing',
  DISBURSEMENT_PENDING: 'Transfer ready',
  DISBURSED: 'Disbursed',
  CLOSED: 'Closed',
}[value] || String(value || '').replace(/_/g, ' '))
const profileValue = (value) => {
  if (value == null || value === '') return '—'
  if (typeof value === 'object') return new Date(value).toLocaleDateString('en-IN')
  return String(value)
}

const daysWaiting = (createdAt) => {
  const submittedAt = createdAt ? new Date(createdAt).getTime() : NaN
  return Number.isFinite(submittedAt)
    ? Math.max(0, Math.floor((Date.now() - submittedAt) / 86_400_000))
    : null
}

const reviewableStatuses = [
  'SUBMITTED',
  'DETAILS_SUBMITTED',
  'ADDITIONAL_DOCUMENTS_REQUIRED',
  'RETURNED_FOR_REVIEW',
]
const actionableStatuses = [
  ...reviewableStatuses,
  'DOCUMENTS_VERIFIED',
  'CREDIT_PASSED',
  'AGREEMENT_ACCEPTED',
  'DISBURSEMENT_AUTHORIZED',
  'DISBURSEMENT_PENDING',
]

function ProfileCard({ title, subtitle, icon, fields }) {
  const visibleFields = fields.filter(([, value]) => value != null && value !== '')
  if (!visibleFields.length) return null
  return (
    <section className="lo-profile-card">
      <header>
        <span className="lo-profile-icon" aria-hidden="true">{icon}</span>
        <div><h3>{title}</h3><p>{subtitle}</p></div>
      </header>
      <div className="lo-profile-grid">
        {visibleFields.map(([label, value]) => (
          <div className="lo-profile-field" key={label}>
            <span>{label}</span>
            <b>{profileValue(value)}</b>
          </div>
        ))}
      </div>
    </section>
  )
}

export default function BankLoanManagerPage({
  onBack,
  standalone = false,
  canManageProducts = false,
  canProcessApplications = false,
  isBranchManager = false,
  currentUser,
  onSignOut,
}) {
  const [tab, setTab] = useState('applications')
  const [workspaceView, setWorkspaceView] = useState('dashboard')
  const [applicationFilter, setApplicationFilter] = useState('ALL')
  const [applicationSort, setApplicationSort] = useState('OLDEST')
  const [search, setSearch] = useState('')
  const [applications, setApplications] = useState([])
  const [products, setProducts] = useState([])
  const [selected, setSelected] = useState(null)
  const [documents, setDocuments] = useState([])
  const [customerProfile, setCustomerProfile] = useState(null)
  const [history, setHistory] = useState([])
  const [loanAccount, setLoanAccount] = useState(null)
  const [beneficiaryConfirmed, setBeneficiaryConfirmed] = useState(false)
  const [previewFile, setPreviewFile] = useState(null)
  const [recommendation, setRecommendation] = useState({
    recommendation: 'APPROVE',
    remarks: '',
    amount: '',
    annualInterestRate: '',
    tenureMonths: '',
  })
  const [managerDecision, setManagerDecision] = useState({
    decision: 'APPROVE',
    reason: '',
    amount: '',
    annualInterestRate: '',
    tenureMonths: '',
  })
  const [officerId, setOfficerId] = useState('')
  const [requestedDocuments, setRequestedDocuments] = useState('')
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    minimumAmount: '50000',
    maximumAmount: '1000000',
    annualInterestRate: '12',
    minimumTenureMonths: '12',
    maximumTenureMonths: '60',
    maximumFoirPercent: '50',
    minimumCreditScore: '650',
  })
  const [creditScore, setCreditScore] = useState('700')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [portfolio, setPortfolio] = useState([])
  const [portfolioSearch, setPortfolioSearch] = useState('')
  const [selectedLoan, setSelectedLoan] = useState(null)
  const [loanSchedule, setLoanSchedule] = useState([])
  const [loanPayments, setLoanPayments] = useState([])

  const loadApplications = async () => {
    const data = isBranchManager ? await getLoanApplications() : await getAssignedLoanApplications()
    setApplications(Array.isArray(data) ? data : [])
  }

  const loadProducts = async () => {
    const data = await getLoanProducts()
    setProducts(Array.isArray(data) ? data : [])
  }

  const loadPortfolio = async () => {
    const data = await getStaffLoanPortfolio()
    setPortfolio(Array.isArray(data) ? data : [])
  }

  const refresh = async () => {
    setError('')
    const tasks = [loadApplications(), loadPortfolio()]
    if (canManageProducts) tasks.push(loadProducts())
    await Promise.all(tasks)
  }

  useEffect(() => {
    let active = true
    const requests = [
      isBranchManager ? getLoanApplications() : getAssignedLoanApplications(),
      getStaffLoanPortfolio(),
    ]
    if (canManageProducts) requests.push(getLoanProducts())
    Promise.all(requests)
      .then(([applicationData, portfolioData, productData]) => {
        if (!active) return
        setApplications(Array.isArray(applicationData) ? applicationData : [])
        setPortfolio(Array.isArray(portfolioData) ? portfolioData : [])
        if (canManageProducts) setProducts(Array.isArray(productData) ? productData : [])
      })
      .catch((loadError) => {
        if (active) setError(loadError.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    const timer = window.setInterval(() => {
      loadPortfolio().catch((loadError) => setError(loadError.message))
    }, 30000)
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [canManageProducts, isBranchManager])

  const openApplication = async (application) => {
    setBusy('details')
    setError('')
    setSelected(application)
    setCustomerProfile(null)
    setHistory([])
    setDocuments([])
    setLoanAccount(null)
    setBeneficiaryConfirmed(false)
    try {
      const [details, account] = await Promise.all([
        getLoanApplicationReviewDetails(application.id),
        getApplicationLoanAccount(application.id),
      ])
      setSelected(details.application)
      setCustomerProfile(details.customer)
      setDocuments(Array.isArray(details.documents) ? details.documents : [])
      setHistory(Array.isArray(details.history) ? details.history : [])
      setLoanAccount(account)
      const product = products.find((item) => item.id === details.application.productId)
      setRecommendation({
        recommendation: 'APPROVE',
        remarks: '',
        amount: String(details.application.requestedAmount ?? ''),
        annualInterestRate: String(product?.annualInterestRate ?? ''),
        tenureMonths: String(details.application.tenureMonths ?? ''),
      })
      setManagerDecision({
        decision: details.application.recommendation === 'REJECT' ? 'REJECT' : 'APPROVE',
        reason: '',
        amount: String(details.application.recommendedAmount ?? details.application.requestedAmount ?? ''),
        annualInterestRate: String(details.application.recommendedInterestRate ?? product?.annualInterestRate ?? ''),
        tenureMonths: String(details.application.recommendedTenureMonths ?? details.application.tenureMonths ?? ''),
      })
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy('')
    }
  }

  const refreshSelected = async () => {
    if (!selected) return
    const [details, applicationData] = await Promise.all([
      getLoanApplicationReviewDetails(selected.id),
      isBranchManager ? getLoanApplications() : getAssignedLoanApplications(),
    ])
    const account = await getApplicationLoanAccount(selected.id)
    setSelected(details.application)
    setCustomerProfile(details.customer)
    setDocuments(Array.isArray(details.documents) ? details.documents : [])
    setHistory(Array.isArray(details.history) ? details.history : [])
    setApplications(Array.isArray(applicationData) ? applicationData : [])
    setLoanAccount(account)
    setBeneficiaryConfirmed(false)
  }

  const runAction = async (key, action, successMessage) => {
    if (!selected) return
    setBusy(key)
    setError('')
    setNotice('')
    try {
      await action()
      await refreshSelected()
      setNotice(successMessage)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy('')
    }
  }

  const reviewDocument = async (documentId, verified) => {
    await runAction(
      `document-${documentId}`,
      () => verifyLoanDocument(documentId, verified),
      verified ? 'Document marked as verified.' : 'Document verification rejected.'
    )
  }

  const removeRejectedDocument = (documentId) =>
    runAction(`remove-document-${documentId}`, () => deleteLoanDocument(documentId),
      'Rejected document removed. The customer can upload a corrected file.')

  const runCreditAssessment = () =>
    runAction(
      'assessment',
      () => assessLoanCredit(selected.id, Number(creditScore)),
      'Credit assessment completed.'
    )

  const submitRecommendation = () =>
    runAction('recommendation', () => recommendLoanApplication(selected.id, {
      recommendation: recommendation.recommendation,
      remarks: recommendation.remarks,
      ...(recommendation.recommendation === 'APPROVE' ? {
        amount: Number(recommendation.amount),
        annualInterestRate: Number(recommendation.annualInterestRate),
        tenureMonths: Number(recommendation.tenureMonths),
      } : {}),
    }), recommendation.recommendation === 'APPROVE'
      ? 'Approval recommendation sent to the branch manager.'
      : 'Rejection recommendation sent to the branch manager for final decision.')

  const submitManagerDecision = () =>
    runAction('manager-decision', () => decideLoanApplication(selected.id, {
      decision: managerDecision.decision,
      reason: managerDecision.reason,
      ...(managerDecision.decision === 'APPROVE' ? {
        amount: managerDecision.amount ? Number(managerDecision.amount) : null,
        annualInterestRate: managerDecision.annualInterestRate ? Number(managerDecision.annualInterestRate) : null,
        tenureMonths: managerDecision.tenureMonths ? Number(managerDecision.tenureMonths) : null,
      } : {}),
    }), 'Branch manager decision saved.')

  const assignApplication = () =>
    runAction('assignment', () => assignLoanApplication(selected.id, officerId), 'Application assigned.')

  const requestDocuments = () =>
    runAction('additional-documents', () => requestAdditionalLoanDocuments(selected.id, requestedDocuments),
      'Additional document request sent to the customer.')


  const prepareDisbursement = async () => {
    if (!selected) return
    setBusy('disbursement')
    setError('')
    setNotice('')
    try {
      await prepareLoanDisbursement(selected.id)
      await refreshSelected()
      setNotice('Agreement and beneficiary account verified. The loan account and repayment schedule are ready for transfer.')
    } catch (requestError) {
      setError(requestError.message)
      try {
        await refreshSelected()
      } catch {
        // Keep the original disbursement error visible.
      }
    } finally {
      setBusy('')
    }
  }

  const completeDisbursement = async () => {
    if (!selected || !beneficiaryConfirmed) return
    setBusy('disbursement')
    setError('')
    setNotice('')
    try {
      await disburseLoan(selected.id)
      await refreshSelected()
      setNotice('Transfer confirmed. The loan account is now active.')
    } catch (requestError) {
      setError(requestError.message)
      try {
        await refreshSelected()
      } catch {
        // Keep the original disbursement error visible.
      }
    } finally {
      setBusy('')
    }
  }

  const downloadDocument = async (document) => {
    setBusy(`download-${document.id}`)
    setError('')
    try {
      setPreviewFile(await previewLoanDocument(document.id))
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy('')
    }
  }

  const createProduct = async (event) => {
    event.preventDefault()
    setBusy('product')
    setError('')
    setNotice('')
    try {
      await createLoanProduct({
        ...productForm,
        minimumAmount: Number(productForm.minimumAmount),
        maximumAmount: Number(productForm.maximumAmount),
        annualInterestRate: Number(productForm.annualInterestRate),
        minimumTenureMonths: Number(productForm.minimumTenureMonths),
        maximumTenureMonths: Number(productForm.maximumTenureMonths),
        maximumFoirPercent: Number(productForm.maximumFoirPercent),
        minimumCreditScore: Number(productForm.minimumCreditScore),
      })
      setProductForm((current) => ({ ...current, name: '', description: '' }))
      await loadProducts()
      setNotice('Loan product created. Customers can now view it.')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy('')
    }
  }

  const visibleApplications = applications.filter((application) => {
    const query = search.trim().toLowerCase()
    if (query && ![
      application.customerName,
      application.customerId,
      application.customerEmail,
      application.customerPhone,
      application.id,
      application.status,
      application.purpose,
    ].some((value) => String(value || '').toLowerCase().includes(query))) return false
    if (applicationFilter === 'PENDING_APPROVALS') return application.status === 'RECOMMENDED'
    if (applicationFilter === 'PENDING_REVIEW') return actionableStatuses.includes(application.status)
    if (applicationFilter === 'DOCUMENTS_PENDING') return reviewableStatuses.includes(application.status)
    if (applicationFilter === 'CREDIT_PENDING') return application.status === 'DOCUMENTS_VERIFIED'
    if (applicationFilter === 'RECOMMENDED') return application.status === 'RECOMMENDED'
    if (applicationFilter === 'DISBURSEMENT') return ['AGREEMENT_ACCEPTED', 'DISBURSEMENT_AUTHORIZED', 'DISBURSEMENT_PENDING'].includes(application.status)
    return true
  }).sort((left, right) => {
    if (applicationSort === 'NEWEST') {
      return new Date(right.createdAt || 0) - new Date(left.createdAt || 0)
    }
    if (applicationSort === 'AMOUNT') {
      return Number(right.requestedAmount || 0) - Number(left.requestedAmount || 0)
    }
    return new Date(left.createdAt || 0) - new Date(right.createdAt || 0)
  })

  const dashboardMetrics = useMemo(() => {
    const count = (statuses) => applications.filter((application) => statuses.includes(application.status)).length
    if (!isBranchManager) {
      const oldest = applications
        .filter((application) => actionableStatuses.includes(application.status))
        .map((application) => daysWaiting(application.createdAt))
        .filter((days) => days != null)
      return [
        ['Assigned applications', applications.length, 'ALL'],
        ['Submitted applications', count(['SUBMITTED', 'DETAILS_SUBMITTED']), 'DOCUMENTS_PENDING'],
        ['Pending review', count(actionableStatuses), 'PENDING_REVIEW'],
        ['Documents pending', count(reviewableStatuses), 'DOCUMENTS_PENDING'],
        ['Credit assessment pending', count(['DOCUMENTS_VERIFIED']), 'CREDIT_PENDING'],
        ['Recommended for approval', applications.filter((application) => application.status === 'RECOMMENDED' && application.recommendation === 'APPROVE').length, 'RECOMMENDED'],
        ['Recommended for rejection', applications.filter((application) => application.status === 'RECOMMENDED' && application.recommendation === 'REJECT').length, 'RECOMMENDED'],
        ['Disbursement queue', count(['AGREEMENT_ACCEPTED', 'DISBURSEMENT_AUTHORIZED', 'DISBURSEMENT_PENDING']), 'DISBURSEMENT'],
        ['Oldest open case', oldest.length ? `${Math.max(...oldest)} days` : '—', 'PENDING_REVIEW'],
      ]
    }

    const approvedStatuses = ['OFFERED', 'OFFER_ACCEPTED', 'AGREEMENT_ACCEPTED', 'DISBURSEMENT_PENDING', 'DISBURSED', 'CLOSED']
    const sanctionedAmount = applications
      .filter((application) => approvedStatuses.includes(application.status))
      .reduce((total, application) => total + Number(application.recommendedAmount ?? application.requestedAmount ?? 0), 0)
    return [
      ['Total applications', applications.length, 'ALL'],
      ['Pending approvals', count(['RECOMMENDED']), 'PENDING_APPROVALS'],
      ['Approved loans', count(approvedStatuses), 'ALL'],
      ['Rejected', count(['REJECTED', 'OFFER_REJECTED']), 'ALL'],
      ['Returned for review', count(['RETURNED_FOR_REVIEW']), 'PENDING_REVIEW'],
      ['Disbursement pending', count(['AGREEMENT_ACCEPTED', 'DISBURSEMENT_PENDING']), 'DISBURSEMENT'],
      ['Disbursed', count(['DISBURSED', 'CLOSED']), 'ALL'],
      ['Sanctioned amount', money(sanctionedAmount), 'ALL'],
    ]
  }, [applications, isBranchManager])

  const staffName = currentUser?.name || currentUser?.fullName || currentUser?.email || 'Loan Officer'
  const initials = String(staffName).split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'LO'
  const canReviewApplications = canProcessApplications || isBranchManager

  if (loading) return <div className="blm-state">Loading loan workspace…</div>

  return (
    <div className={`blm-page ${isBranchManager ? 'blm-manager' : ''} ${standalone ? `blm-standalone lo-shell ${selected ? 'lo-has-selection' : ''}` : ''}`}>
      {standalone && (
        <aside className="lo-sidebar">
          <div className="lo-brand">
            <span className="lo-brand-mark">N</span>
            <span><b>NOVA BANK</b><small>Your Trust. Our Priority.</small></span>
          </div>
          <div className="lo-staff">
            <span className="lo-avatar">{initials}</span>
            <div><b>{staffName}</b><small>Loan Officer</small><span><i />Online</span></div>
          </div>
          <div className="lo-nav-label">Workspace</div>
          <nav className="lo-nav" aria-label="Loan officer workspace">
            <button className={tab === 'applications' && workspaceView === 'dashboard' && !selected ? 'active' : ''} onClick={() => { setTab('applications'); setWorkspaceView('dashboard'); setApplicationFilter('ALL'); setSelected(null) }}><span>▦</span>Dashboard</button>
            <button className={tab === 'applications' && workspaceView === 'assigned' && !selected ? 'active' : ''} onClick={() => { setTab('applications'); setWorkspaceView('assigned'); setApplicationFilter('PENDING_REVIEW'); setSelected(null) }}><span>▤</span>Assigned Applications</button>
            {canManageProducts && <button className={tab === 'products' ? 'active' : ''} onClick={() => { setTab('products'); setSelected(null) }}><span>＋</span>Loan Products</button>}
          </nav>
          <div className="lo-sidebar-bottom">
            <button onClick={onSignOut}><span>⏻</span>Sign out</button>
            <small><i />Signed in securely</small>
          </div>
        </aside>
      )}

      <div className={standalone ? 'lo-main' : ''}>
      {standalone && (
        <header className="lo-topbar">
          <div><b>{selected ? 'Application details' : tab === 'products' ? 'Loan products' : 'Loan Officer Dashboard'}</b><span>{selected ? `Reviewing ${selected.id}` : 'Application processing & customer verification'}</span></div>
          <div className="lo-topbar-actions"><button className="blm-button blm-button-light" onClick={() => refresh().catch((requestError) => setError(requestError.message))}>Refresh</button><div className="lo-account"><span>{initials}</span><b>{staffName}</b></div></div>
        </header>
      )}
      <div className={standalone ? 'lo-content' : ''}>
      <header className="blm-hero">
        <div>
          <span className="blm-eyebrow">LOAN OPERATIONS</span>
          <h2>{tab === 'products' ? 'Loan products' : isBranchManager ? 'Branch loan approvals' : 'Loan officer workspace'}</h2>
          <p>{isBranchManager ? 'Review recommendations, make authorized decisions, and monitor branch loan processing.' : 'Verify applicant details and documents, assess credit, and recommend a decision.'}</p>
        </div>
        <div className="blm-hero-actions">
          {onBack && <button className="blm-button blm-button-light" onClick={onBack}>Back to dashboard</button>}
          <button className="blm-button blm-button-light" onClick={() => refresh().catch((e) => setError(e.message))}>Refresh</button>
        </div>
      </header>

      {error && <div className="blm-alert blm-alert-error" role="alert">{error}</div>}
      {notice && <div className="blm-alert blm-alert-success" role="status">{notice}</div>}

      <section className="blm-stat-grid" aria-label={isBranchManager ? 'Branch loan statistics' : 'Assigned loan statistics'}>
        {dashboardMetrics.map(([label, value, filter]) => (
          <button
            type="button"
            className={`blm-stat-card ${applicationFilter === filter && tab === 'applications' ? 'active' : ''}`}
            key={label}
            onClick={() => {
              setTab('applications')
              setApplicationFilter(filter)
              setWorkspaceView('assigned')
              setSelected(null)
            }}
          >
            <span>{label}</span><b>{value}</b><small>Open queue →</small>
          </button>
        ))}
      </section>

      <nav className="blm-tabs" aria-label="Loan workspace">
        <button className={tab === 'applications' ? 'active' : ''} onClick={() => setTab('applications')}>
          Applications <span>{applications.length}</span>
        </button>
        {canManageProducts && (
          <button className={tab === 'products' ? 'active' : ''} onClick={() => setTab('products')}>
            Products
          </button>
        )}
      </nav>

      {tab === 'applications' && (
        <div className={`blm-workspace ${selected ? 'blm-has-selection' : ''} ${standalone ? 'lo-workspace' : ''}`}>
          <section className="blm-panel blm-queue-panel">
            <div className="blm-panel-heading">
              <div className="blm-queue-title"><span className="blm-eyebrow">WORK QUEUE · {visibleApplications.length} CASES</span><h3>{applicationFilter === 'PENDING_APPROVALS' ? 'Pending approvals' : applicationFilter === 'DOCUMENTS_PENDING' ? 'Document verification' : applicationFilter === 'CREDIT_PENDING' ? 'Ready for credit assessment' : applicationFilter === 'RECOMMENDED' ? 'Manager recommendations' : applicationFilter === 'DISBURSEMENT' ? 'Disbursement queue' : applicationFilter === 'PENDING_REVIEW' ? 'Cases needing action' : standalone ? 'Assigned applications' : 'Loan applications'}</h3><p>{standalone ? 'Prioritized by oldest case first. Open an application to complete verification and review.' : 'Select an application to review customer and loan information.'}</p></div>
              <input className="lo-search" aria-label="Search applications" placeholder="Search customer or application" value={search} onChange={(event) => setSearch(event.target.value)} />
              <select aria-label="Filter loan applications" value={applicationFilter} onChange={(event) => setApplicationFilter(event.target.value)}>
                <option value="ALL">All applications</option>
                <option value="PENDING_REVIEW">Pending review</option>
                <option value="DOCUMENTS_PENDING">Documents pending</option>
                <option value="CREDIT_PENDING">Credit assessment</option>
                <option value="RECOMMENDED">Recommendations</option>
                <option value="DISBURSEMENT">Disbursement queue</option>
                {isBranchManager && <option value="PENDING_APPROVALS">Pending approvals</option>}
              </select>
              <select aria-label="Sort applications" value={applicationSort} onChange={(event) => setApplicationSort(event.target.value)}>
                <option value="OLDEST">Oldest first</option>
                <option value="NEWEST">Newest first</option>
                <option value="AMOUNT">Highest amount</option>
              </select>
            </div>
            {visibleApplications.length === 0 ? (
              <div className="blm-state">
                <span>{search ? 'No applications match your search.' : applicationFilter === 'ALL' ? 'No applications are available.' : 'There are no applications in this queue right now.'}</span>
                {(search || applicationFilter !== 'ALL') && (
                  <button
                    className="blm-button blm-button-light"
                    onClick={() => { setSearch(''); setApplicationFilter('ALL') }}
                  >
                    Show all applications
                  </button>
                )}
              </div>
            ) : (
              <div className="blm-application-list">
                {visibleApplications.map((application) => (
                  <button className={`blm-application-row ${selected?.id === application.id ? 'selected' : ''}`} key={application.id} onClick={() => openApplication(application)}>
                    <span className="blm-row-main">
                      <b>{application.customerName || application.customerId}</b>
                      <small>{money(application.requestedAmount)} · {application.tenureMonths} months · {application.purpose || 'Purpose not specified'}</small>
                      <small>{application.customerPhone || application.customerEmail || application.customerId}</small>
                    </span>
                    <span className="blm-row-secondary">
                      <b className={`blm-queue-status blm-queue-status-${String(application.status).toLowerCase()}`}>{statusLabel(application.status)}</b>
                      <small>{application.id}</small>
                      <small className={daysWaiting(application.createdAt) >= 3 && actionableStatuses.includes(application.status) ? 'blm-case-aged' : ''}>
                        {daysWaiting(application.createdAt) == null ? 'Date unavailable' : daysWaiting(application.createdAt) === 0 ? 'Received today' : `Waiting ${daysWaiting(application.createdAt)}d`}
                        {daysWaiting(application.createdAt) >= 3 && actionableStatuses.includes(application.status) ? ' · Review due' : ''}
                      </small>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="blm-panel blm-detail-panel">
            {!selected ? <div className="blm-state">Select an application to see the review steps.</div> : busy === 'details' ? <div className="blm-state">Loading application details…</div> : (
              <>
                <div className="blm-panel-heading blm-detail-heading">
                  <button className="blm-button blm-button-light" onClick={() => setSelected(null)}>← Back to applications</button>
                  <div><span className="blm-eyebrow">APPLICATION · {selected.productId ? `PRODUCT #${selected.productId}` : ''}</span><h3>{selected.customerName || customerProfile?.name || selected.customerId}</h3><p>Customer ID: <b>{selected.customerId || '—'}</b> · Application: {selected.id}</p></div>
                  <span className={`lo-status lo-status-${String(selected.status).toLowerCase()}`}>{statusLabel(selected.status)}</span>
                </div>
                <div className="lo-customer-strip">
                  <div><span>👤</span><section><small>CUSTOMER NAME</small><b>{customerProfile?.name || selected.customerName || '—'}</b></section></div>
                  <div><span>✉</span><section><small>EMAIL ADDRESS</small><b>{customerProfile?.email || selected.customerEmail || '—'}</b></section></div>
                  <div><span>▦</span><section><small>MOBILE NUMBER</small><b>{customerProfile?.mobileNumber || selected.customerPhone || '—'}</b></section></div>
                  <div><span>◈</span><section><small>KYC STATUS</small><b>{selected.kycStatus || '—'}</b></section></div>
                </div>
                <div className="blm-facts">
                  <div><span>Application ID</span><b>{selected.id}</b></div>
                  <div><span>Customer ID</span><b>{selected.customerId || '—'}</b></div>
                  <div><span>Email</span><b>{selected.customerEmail || customerProfile?.email || '—'}</b></div>
                  <div><span>Phone</span><b>{selected.customerPhone || customerProfile?.mobileNumber || '—'}</b></div>
                  <div><span>KYC status</span><b>{selected.kycStatus || '—'}</b></div>
                  <div><span>Requested amount</span><b>{money(selected.requestedAmount)}</b></div>
                  <div><span>Loan purpose</span><b>{selected.purpose || '—'}</b></div>
                  <div><span>Tenure</span><b>{selected.tenureMonths} months</b></div>
                  <div><span>Employment</span><b>{selected.employmentType || 'Not submitted'}</b></div>
                  <div><span>Monthly income</span><b>{money(selected.monthlyIncome)}</b></div>
                  <div><span>Existing EMI</span><b>{money(selected.existingMonthlyEmi)}</b></div>
                  <div><span>Employer / business</span><b>{selected.employerName || selected.businessName || '—'}</b></div>
                  {selected.designation && <div><span>Designation</span><b>{selected.designation}</b></div>}
                  {selected.workExperienceYears != null && <div><span>Work experience</span><b>{selected.workExperienceYears} years</b></div>}
                  {selected.businessType && <div><span>Business type</span><b>{selected.businessType}</b></div>}
                  {selected.businessVintageYears != null && <div><span>Business vintage</span><b>{selected.businessVintageYears} years</b></div>}
                  {selected.businessAddress && <div><span>Business address</span><b>{selected.businessAddress}</b></div>}
                  {selected.businessRegistrationNumber && <div><span>Registration number</span><b>{selected.businessRegistrationNumber}</b></div>}
                  {selected.annualTurnover != null && <div><span>Annual turnover</span><b>{money(selected.annualTurnover)}</b></div>}
                  <div><span>Credit score</span><b>{selected.creditScore || 'Not assessed'}</b></div>
                  {selected.assessedFoirPercent != null && <div><span>FOIR</span><b>{selected.assessedFoirPercent}%</b></div>}
                  {selected.recommendation && <div><span>Officer recommendation</span><b>{selected.recommendation}</b></div>}
                  {selected.recommendationRemarks && <div><span>Officer remarks</span><b>{selected.recommendationRemarks}</b></div>}
                  {selected.recommendedAmount != null && <div><span>Proposed amount</span><b>{money(selected.recommendedAmount)}</b></div>}
                  {selected.recommendedInterestRate != null && <div><span>Proposed rate</span><b>{selected.recommendedInterestRate}%</b></div>}
                  {selected.recommendedTenureMonths != null && <div><span>Proposed tenure</span><b>{selected.recommendedTenureMonths} months</b></div>}
                  {selected.managerDecisionReason && <div><span>Manager decision reason</span><b>{selected.managerDecisionReason}</b></div>}
                </div>

                <section className="blm-subsection lo-profile-section">
                  <h4>Customer profile</h4>
                  {customerProfile ? <div className="lo-profile-layout">
                    <div className="lo-profile-main">
                      <ProfileCard title="Personal Information" subtitle="Basic demographic details" icon="▤" fields={[
                        ['Full name', customerProfile.name], ['Title', customerProfile.title], ['Date of birth', customerProfile.dateOfBirth],
                        ['Gender', customerProfile.gender], ['Marital status', customerProfile.maritalStatus],
                        ['Nationality', customerProfile.nationality], ['Language', customerProfile.language],
                      ]} />
                      <ProfileCard title="Contact Information" subtitle="Registered contact and addresses" icon="✉" fields={[
                        ['Email address', customerProfile.email], ['Mobile number', customerProfile.mobileNumber],
                        ['Alternate mobile', customerProfile.alternateMobileNumber], ['Permanent address', customerProfile.permanentAddress],
                        ['Permanent city', customerProfile.permanentCity], ['Permanent state', customerProfile.permanentState],
                        ['Permanent country', customerProfile.permanentCountry], ['Permanent PIN code', customerProfile.permanentPinCode],
                        ['Communication address', customerProfile.communicationAddress], ['Communication city', customerProfile.communicationCity],
                        ['Communication state', customerProfile.communicationState], ['Communication country', customerProfile.communicationCountry],
                        ['Communication PIN code', customerProfile.communicationPinCode],
                      ]} />
                      <ProfileCard title="Branch Information" subtitle="Customer home branch" icon="▣" fields={[
                        ['Branch name', customerProfile.branchName], ['Branch code', customerProfile.branchCode], ['IFSC code', customerProfile.ifscCode],
                      ]} />
                    </div>
                    <div className="lo-profile-side">
                      <ProfileCard title="Financial Details" subtitle="Income and employment" icon="▣" fields={[
                        ['Occupation', customerProfile.occupation], ['Annual income', customerProfile.annualIncome == null ? null : money(customerProfile.annualIncome)],
                        ['Source of income', customerProfile.sourceOfIncome], ['Opening balance', customerProfile.openingBalance == null ? null : money(customerProfile.openingBalance)],
                        ['Customer status', customerProfile.status], ['Created', customerProfile.createdAt],
                      ]} />
                      <ProfileCard title="Loan Application" subtitle="Requested credit and assessment" icon="₹" fields={[
                        ['Product ID', selected.productId], ['Requested amount', money(selected.requestedAmount)],
                        ['Loan purpose', selected.purpose],
                        ['Requested tenure', `${selected.tenureMonths} months`], ['Employment type', selected.employmentType],
                        ['Employer / business', selected.employerName || selected.businessName], ['Designation', selected.designation],
                        ['Work experience', selected.workExperienceYears == null ? null : `${selected.workExperienceYears} years`],
                        ['Business type', selected.businessType],
                        ['Business vintage', selected.businessVintageYears == null ? null : `${selected.businessVintageYears} years`],
                        ['Business address', selected.businessAddress], ['Registration number', selected.businessRegistrationNumber],
                        ['Annual turnover', selected.annualTurnover == null ? null : money(selected.annualTurnover)],
                        ['Monthly income', money(selected.monthlyIncome)], ['Existing monthly EMI', money(selected.existingMonthlyEmi)],
                        ['Credit score', selected.creditScore], ['Assessment FOIR', selected.assessedFoirPercent == null ? null : `${selected.assessedFoirPercent}%`],
                        ['Credit result', selected.creditPassed == null ? null : selected.creditPassed ? 'Passed' : 'Failed'],
                        ['Assigned officer', selected.assignedOfficerId], ['Recommendation', selected.recommendation],
                        ['Recommendation remarks', selected.recommendationRemarks], ['Proposed amount', selected.recommendedAmount == null ? null : money(selected.recommendedAmount)],
                        ['Proposed rate', selected.recommendedInterestRate == null ? null : `${selected.recommendedInterestRate}%`],
                        ['Proposed tenure', selected.recommendedTenureMonths == null ? null : `${selected.recommendedTenureMonths} months`],
                        ['Additional documents requested', selected.additionalDocumentsRequested],
                        ['Manager decision reason', selected.managerDecisionReason],
                        ['Application submitted', selected.createdAt],
                      ]} />
                    </div>
                  </div> : <p className="blm-muted">Customer profile is not available.</p>}
                </section>

                <section className="blm-subsection">
                  <h4>Document checklist</h4>
                  {(() => {
                    const uploadedTypes = new Set(documents.map((document) =>
                      String(document.documentType || '').toUpperCase().replace(/-/g, '_')))
                    const verifiedTypes = new Set(documents
                      .filter((document) => document.verified)
                      .map((document) => String(document.documentType || '').toUpperCase().replace(/-/g, '_')))
                    const checklist = [
                      ['Aadhaar', 'AADHAAR'],
                      ['PAN', 'PAN'],
                      ['Income proof', 'INCOME_PROOF'],
                    ]
                    const incomeProofUploaded = uploadedTypes.has('SALARY_SLIP')
                      || uploadedTypes.has('BANK_STATEMENT')
                    const incomeProofVerified = verifiedTypes.has('SALARY_SLIP')
                      || verifiedTypes.has('BANK_STATEMENT')
                    return (
                      <div className="blm-document-checklist">
                        {checklist.map(([label, type]) => {
                          const uploaded = type === 'INCOME_PROOF'
                            ? incomeProofUploaded
                            : uploadedTypes.has(type)
                          const verified = type === 'INCOME_PROOF'
                            ? incomeProofVerified
                            : verifiedTypes.has(type)
                          return (
                            <div className={verified ? 'verified' : uploaded ? 'uploaded' : 'missing'} key={type}>
                              <span>{verified ? '✓' : uploaded ? '•' : '!'}</span>
                              <b>{label}</b>
                              <small>{verified ? 'Verified' : uploaded ? 'Review required' : 'Missing'}</small>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })()}
                  <h4 className="blm-supporting-heading">Supporting documents</h4>
                  {documents.length === 0 ? <p className="blm-muted">No documents uploaded yet.</p> : documents.map((document) => (
                    <div className="blm-document-row" key={document.id}>
                      <div><b>{statusLabel(document.documentType)}</b><small>{document.originalFileName || 'Uploaded document'} · {document.verified ? 'Verified' : 'Needs review'}</small></div>
                      <div className="blm-document-actions">
                        <button className="blm-button blm-button-light" disabled={busy === `download-${document.id}`} onClick={() => downloadDocument(document)}>{busy === `download-${document.id}` ? 'Loading…' : 'Preview document'}</button>
                        {canReviewApplications && !document.verified && ['SUBMITTED', 'DETAILS_SUBMITTED', 'ADDITIONAL_DOCUMENTS_REQUIRED', 'RETURNED_FOR_REVIEW'].includes(selected.status) && (
                          <>
                            <button className="blm-button blm-button-primary" disabled={busy === `document-${document.id}`} onClick={() => reviewDocument(document.id, true)}>Verify</button>
                            <button className="blm-button blm-button-danger" disabled={busy === `document-${document.id}`} onClick={() => reviewDocument(document.id, false)}>Reject</button>
                          </>
                        )}
                        {canReviewApplications && !document.verified && ['SUBMITTED', 'DETAILS_SUBMITTED', 'ADDITIONAL_DOCUMENTS_REQUIRED', 'RETURNED_FOR_REVIEW'].includes(selected.status) && (
                          <button className="blm-button blm-button-light" disabled={busy === `remove-document-${document.id}`} onClick={() => removeRejectedDocument(document.id)}>Remove rejected file</button>
                        )}
                      </div>
                    </div>
                  ))}
                </section>

                {canReviewApplications && ['DOCUMENTS_VERIFIED', 'RETURNED_FOR_REVIEW'].includes(selected.status) && (
                  <section className="blm-subsection blm-action-box">
                    <h4>Credit assessment</h4>
                    <p>Enter the credit score returned by the credit check, then run the assessment.</p>
                    <div className="blm-inline-form">
                      <label>Credit score<input type="number" min="300" max="900" value={creditScore} onChange={(e) => setCreditScore(e.target.value)} /></label>
                      <button className="blm-button blm-button-primary" disabled={busy === 'assessment'} onClick={runCreditAssessment}>{busy === 'assessment' ? 'Assessing…' : 'Run assessment'}</button>
                    </div>
                  </section>
                )}

                {canReviewApplications && selected.status === 'CREDIT_PASSED' && (
                  <section className="blm-subsection blm-action-box">
                    <h4>Loan recommendation</h4>
                    <p>Recommend approval or rejection. Final approval is reserved for an authorized branch manager.</p>
                    <div className="blm-decision-grid">
                      <label>Recommendation<select value={recommendation.recommendation} onChange={(event) => setRecommendation({ ...recommendation, recommendation: event.target.value })}><option value="APPROVE">Recommend approval</option><option value="REJECT">Recommend rejection</option></select></label>
                      {recommendation.recommendation === 'APPROVE' && <>
                        <label>Proposed amount (₹)<input type="number" min="1" required value={recommendation.amount} onChange={(event) => setRecommendation({ ...recommendation, amount: event.target.value })} /></label>
                        <label>Annual rate (%)<input type="number" min="0.01" step="0.01" required value={recommendation.annualInterestRate} onChange={(event) => setRecommendation({ ...recommendation, annualInterestRate: event.target.value })} /></label>
                        <label>Tenure (months)<input type="number" min="1" required value={recommendation.tenureMonths} onChange={(event) => setRecommendation({ ...recommendation, tenureMonths: event.target.value })} /></label>
                      </>}
                      <label className="blm-field-wide">Review remarks<textarea rows="2" required value={recommendation.remarks} onChange={(event) => setRecommendation({ ...recommendation, remarks: event.target.value })} /></label>
                    </div>
                    <button className="blm-button blm-button-primary" disabled={busy === 'recommendation'} onClick={submitRecommendation}>{busy === 'recommendation' ? 'Sending…' : 'Send recommendation to manager'}</button>
                  </section>
                )}

                {isBranchManager && selected.status === 'RECOMMENDED' && (
                  <section className="blm-subsection blm-action-box">
                    <h4>Branch manager decision</h4>
                    <p>Review the officer recommendation and record a reason for every decision.</p>
                    <div className="blm-decision-grid">
                      <label>Decision<select value={managerDecision.decision} onChange={(event) => setManagerDecision({ ...managerDecision, decision: event.target.value })}><option value="APPROVE" disabled={selected.recommendation === 'REJECT'}>Approve</option><option value="REJECT">Reject</option><option value="RETURN">Return for review</option></select></label>
                      {managerDecision.decision === 'APPROVE' && <>
                        <label>Approved amount (₹)<input type="number" min="1" value={managerDecision.amount} onChange={(event) => setManagerDecision({ ...managerDecision, amount: event.target.value })} /></label>
                        <label>Annual rate (%)<input type="number" min="0.01" step="0.01" value={managerDecision.annualInterestRate} onChange={(event) => setManagerDecision({ ...managerDecision, annualInterestRate: event.target.value })} /></label>
                        <label>Tenure (months)<input type="number" min="1" value={managerDecision.tenureMonths} onChange={(event) => setManagerDecision({ ...managerDecision, tenureMonths: event.target.value })} /></label>
                      </>}
                      <label className="blm-field-wide">Decision reason<textarea rows="2" required value={managerDecision.reason} onChange={(event) => setManagerDecision({ ...managerDecision, reason: event.target.value })} /></label>
                    </div>
                    <button className="blm-button blm-button-primary" disabled={busy === 'manager-decision'} onClick={submitManagerDecision}>Save manager decision</button>
                  </section>
                )}

                {canReviewApplications && !['OFFERED', 'OFFER_ACCEPTED', 'AGREEMENT_ACCEPTED', 'DISBURSEMENT_AUTHORIZED', 'DISBURSEMENT_PENDING', 'DISBURSED', 'CLOSED', 'REJECTED'].includes(selected.status) && (
                  <section className="blm-subsection blm-action-box">
                    <h4>Application support</h4>
                    {isBranchManager && <div className="blm-inline-form">
                      <label>Assign / reassign officer ID<input value={officerId} onChange={(event) => setOfficerId(event.target.value)} placeholder="Officer user ID" /></label>
                      <button className="blm-button blm-button-light" disabled={!officerId || busy === 'assignment'} onClick={assignApplication}>Assign</button>
                    </div>}
                    {['DETAILS_SUBMITTED', 'DOCUMENTS_VERIFIED', 'RETURNED_FOR_REVIEW'].includes(selected.status) && (
                      <div className="blm-inline-form">
                        <label>Request additional documents<input value={requestedDocuments} onChange={(event) => setRequestedDocuments(event.target.value)} placeholder="List missing documents" /></label>
                        <button className="blm-button blm-button-light" disabled={!requestedDocuments || busy === 'additional-documents'} onClick={requestDocuments}>Request documents</button>
                      </div>
                    )}
                  </section>
                )}

                {selected.status === 'CREDIT_FAILED' && <div className="blm-result blm-result-bad">Credit assessment did not pass. The loan cannot be approved.</div>}
                {selected.status === 'OFFERED' && <div className="blm-result">Offer is available for the customer to accept or reject.</div>}
                {selected.status === 'OFFER_ACCEPTED' && <div className="blm-result">Customer accepted the offer. The agreement and KFS are ready in their dashboard.</div>}

                {canReviewApplications && ['AGREEMENT_ACCEPTED', 'DISBURSEMENT_AUTHORIZED'].includes(selected.status) && (
                  <section className="blm-subsection blm-action-box">
                    <h4>Verify agreement and beneficiary</h4>
                    <p>Confirm the accepted agreement and prepare a pending loan account using the customer's active savings or current account.</p>
                    <button className="blm-button blm-button-primary" disabled={busy === 'disbursement'} onClick={prepareDisbursement}>{busy === 'disbursement' ? 'Verifying…' : 'Verify & prepare disbursement'}</button>
                  </section>
                )}

                {loanAccount && (
                  <section className="blm-subsection">
                    <h4>Loan account and beneficiary</h4>
                    <div className="blm-facts">
                      <div><span>Loan account number</span><b>{loanAccount.id}</b></div>
                      <div><span>Beneficiary bank account</span><b>{loanAccount.bankAccountNumber}</b></div>
                      <div><span>Sanctioned principal</span><b>{money(loanAccount.principal)}</b></div>
                      <div><span>Monthly EMI</span><b>{money(loanAccount.monthlyEmi)}</b></div>
                      <div><span>Account status</span><b>{loanAccount.status || 'PENDING_DISBURSEMENT'}</b></div>
                    </div>
                    {selected.status === 'DISBURSEMENT_PENDING' && (
                      <div className="blm-action-box">
                        <label><input type="checkbox" checked={beneficiaryConfirmed} onChange={(event) => setBeneficiaryConfirmed(event.target.checked)} /> I verified the agreement and beneficiary account above.</label>
                        <button className="blm-button blm-button-primary" disabled={!beneficiaryConfirmed || busy === 'disbursement'} onClick={completeDisbursement}>{busy === 'disbursement' ? 'Transferring…' : 'Initiate fund transfer'}</button>
                      </div>
                    )}
                  </section>
                )}
                {selected.status === 'DISBURSED' && <div className="blm-result blm-result-good">Transfer confirmed. The loan account is active and the repayment schedule is available to the customer.</div>}

                {history.length > 0 && (
                  <section className="blm-subsection">
                    <h4>Application history</h4>
                    <ol className="blm-history">
                      {history.map((entry) => <li key={entry.id}><b>{statusLabel(entry.action)}</b><span>{entry.remarks || entry.currentStatus}</span><small>{entry.createdAt ? new Date(entry.createdAt).toLocaleString('en-IN') : '—'} · {entry.actorId || 'System'}</small></li>)}
                    </ol>
                  </section>
                )}
              </>
            )}
            <DocumentPreview file={previewFile} onClose={() => setPreviewFile(null)} />
          </section>
        </div>
      )}

      {tab === 'products' && canManageProducts && (
        <div className="blm-products-layout">
          <section className="blm-panel">
            <div className="blm-panel-heading"><div><h3>Create a loan product</h3><p>Products become visible to customers after saving.</p></div></div>
            <form className="blm-product-form" onSubmit={createProduct}>
              <label>Product name<input required value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} /></label>
              <label className="blm-field-wide">Description<textarea rows="2" value={productForm.description} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} /></label>
              <label>Minimum amount (₹)<input type="number" min="1" required value={productForm.minimumAmount} onChange={(e) => setProductForm({ ...productForm, minimumAmount: e.target.value })} /></label>
              <label>Maximum amount (₹)<input type="number" min="1" required value={productForm.maximumAmount} onChange={(e) => setProductForm({ ...productForm, maximumAmount: e.target.value })} /></label>
              <label>Annual interest rate (%)<input type="number" min="0.01" max="100" step="0.01" required value={productForm.annualInterestRate} onChange={(e) => setProductForm({ ...productForm, annualInterestRate: e.target.value })} /></label>
              <label>Minimum tenure (months)<input type="number" min="1" max="480" required value={productForm.minimumTenureMonths} onChange={(e) => setProductForm({ ...productForm, minimumTenureMonths: e.target.value })} /></label>
              <label>Maximum tenure (months)<input type="number" min="1" max="480" required value={productForm.maximumTenureMonths} onChange={(e) => setProductForm({ ...productForm, maximumTenureMonths: e.target.value })} /></label>
              <label>Maximum FOIR (%)<input type="number" min="1" max="100" step="0.01" required value={productForm.maximumFoirPercent} onChange={(e) => setProductForm({ ...productForm, maximumFoirPercent: e.target.value })} /></label>
              <label>Minimum credit score<input type="number" min="300" max="900" required value={productForm.minimumCreditScore} onChange={(e) => setProductForm({ ...productForm, minimumCreditScore: e.target.value })} /></label>
              <div className="blm-product-submit"><button className="blm-button blm-button-primary" disabled={busy === 'product'}>{busy === 'product' ? 'Saving…' : 'Create product'}</button></div>
            </form>
          </section>
          <section className="blm-panel">
            <div className="blm-panel-heading"><div><h3>Available products</h3><p>Active offers customers can currently apply for.</p></div></div>
            {products.length === 0 ? <div className="blm-state">No active loan products.</div> : products.map((product) => (
              <article className="blm-product-card" key={product.id}>
                <div><h4>{product.name}</h4><span className="blm-product-rate">{product.annualInterestRate}% p.a.</span></div>
                <p>{product.description || 'No description'}</p>
                <small>{money(product.minimumAmount)}–{money(product.maximumAmount)} · {product.minimumTenureMonths}–{product.maximumTenureMonths} months · FOIR {product.maximumFoirPercent}% · Score {product.minimumCreditScore}+</small>
              </article>
            ))}
          </section>
        </div>
      )}
      </div>
      </div>
    </div>
  )
}
