import { useEffect, useMemo, useState } from 'react'
import Brand from '../../../../shared/components/Brand'
import Icon from '../../../../shared/components/Icon'
import OnboardingDashboard from '../../components/OnboardingDashboard'
import './CustomerDashboardPage.css'
import {
  getCustomerOverview,
  submitBankingAction,
  updateCustomerProfile,
} from '../../../../services/bankingService'
import { signOut } from '../../../../services/authService'
import { apiRequest } from '../../../../services/apiClient'
import ActionDialog from '../../../shared/ActionDialog'
import ChangePasswordModal from '../../../profile/ChangePasswordModal'
import CustomerLoanPage from './loan/CustomerLoanPage'
import { getLoanSchedule, getMyLoanAccounts } from '../../../../services/loanApi'

const accountNavItems = [
  ['Dashboard', 'grid'],
  ['Accounts', 'bank'],
  ['Transactions', 'swap'],
  ['Transfer', 'send'],
  ['Loans', 'bank'],
  ['KYC Status', 'shield'],
  ['Profile', 'user'],
  ['Support', 'help'],
]

const onboardingNavItems = [
  ['Dashboard', 'grid'],
  ['Open Account', 'bank'],
  ['Loans', 'bank'],
  ['Profile', 'user'],
  ['Support', 'help'],
]

const formatMoney = (amount, currency = 'INR') =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount)

const formatDate = (v) => {
  if (!v) return '—'
  const d = new Date(v)
  return Number.isNaN(d.getTime())
    ? String(v)
    : d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
}

const formatTime = (v) => {
  if (!v) return '—'
  const d = new Date(v)
  return Number.isNaN(d.getTime())
    ? String(v)
    : d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}

const statusTone = (status) => {
  const s = String(status || '').toUpperCase()
  if (['SUCCESS', 'COMPLETED', 'APPROVED', 'ACTIVE'].includes(s)) return 'ok'
  if (['PENDING', 'IN_PROGRESS', 'UNDER_REVIEW', 'PROCESSING'].includes(s))
    return 'warn'
  if (['FAILED', 'REJECTED', 'CLOSED', 'DECLINED'].includes(s)) return 'bad'
  return 'neutral'
}

/* ---------- Secure Image Fetcher ---------- */
function SecureImage({ customerId, fallback }) {
  const [imgSrc, setImgSrc] = useState(null)

  useEffect(() => {
    if (!customerId) return
    let active = true
    let objectUrl = null

    apiRequest(`/customer-service/api/v1/customers/${customerId}/image`, {
      responseType: 'blob',
    })
      .then((blob) => {
        if (active) {
          objectUrl = URL.createObjectURL(blob)
          setImgSrc(objectUrl)
        }
      })
      .catch((err) => {
        console.warn('Could not load profile image', err)
      })

    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [customerId])

  if (!imgSrc) return fallback
  return <img src={imgSrc} alt="Profile" />
}

/* ---------- Pagination Component ---------- */
function Pagination({ page, totalPages, pageSize, onPageChange, onPageSizeChange }) {
  if (totalPages <= 0) return null
  return (
    <div className="pagination-bar">
      <div className="pagination-info">
        Rows per page:
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="pagination-select"
        >
          {[5, 10, 20, 50].map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </div>

      <div className="pagination-controls">
        <button
          className="bm-ghost pagination-btn"
          onClick={() => onPageChange(1)}
          disabled={page === 1}
          aria-label="First page"
        >
          «
        </button>
        <button
          className="bm-ghost pagination-btn"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
          aria-label="Previous page"
        >
          ‹ Prev
        </button>

        <span className="pagination-page-info">
          Page <b>{page}</b> of <b>{totalPages}</b>
        </span>

        <button
          className="bm-ghost pagination-btn"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          aria-label="Next page"
        >
          Next ›
        </button>
        <button
          className="bm-ghost pagination-btn"
          onClick={() => onPageChange(totalPages)}
          disabled={page === totalPages}
          aria-label="Last page"
        >
          »
        </button>
      </div>
    </div>
  )
}

/* ---------- Transfer Money Modal ---------- */
function TransferModal({ onClose, onSuccess, accounts }) {
  const activeAccounts = accounts.filter(
    (a) => String(a.accountStatus || a.status || '').toUpperCase() === 'ACTIVE'
  )

  const [fromAccount, setFromAccount] = useState(
    activeAccounts[0]?.accountNumber || ''
  )
  const [toAccount, setToAccount] = useState('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!fromAccount) return setError('Please select a source account.')
    if (!toAccount || !toAccount.trim())
      return setError('Please enter a destination account number.')
    if (fromAccount === toAccount.trim())
      return setError('Cannot transfer to the same account.')
    if (!amount || Number(amount) <= 0)
      return setError('Please enter a valid amount.')

    const source = activeAccounts.find((a) => a.accountNumber === fromAccount)
    if (source && Number(amount) > Number(source.balance)) {
      return setError('Insufficient balance.')
    }

    setLoading(true)
    setError('')
    try {
      await submitBankingAction(
        'transfer',
        {
          fromAccountNumber: fromAccount,
          toAccountNumber: toAccount.trim(),
          amount: Number(amount),
          description: description.trim() || null,
        },
        null,
        null,
        accounts
      )
      setSuccessMsg('Transfer successful!')
      setTimeout(() => {
        onSuccess()
        onClose()
      }, 1500)
    } catch (err) {
      setError(err.message || 'Could not process transfer.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="kyc-modal-backdrop" onClick={onClose}>
      <div
        className="kyc-modal transfer-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="kyc-modal-head">
          <h2>Transfer Money</h2>
          <button className="icon-button" onClick={onClose}>
            <Icon name="close" size={16} />
          </button>
        </div>

        {successMsg ? (
          <div className="transfer-success">
            <Icon name="check" size={40} className="transfer-success-icon" />
            <h3>Success</h3>
            <p>{successMsg}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="kyc-form">
            <p className="kyc-modal-desc">
              Send money to another Nova Bank account.
            </p>

            {error && <div className="form-error">{error}</div>}

            <label className="kyc-field">
              <span>From Account</span>
              <select
                value={fromAccount}
                onChange={(e) => setFromAccount(e.target.value)}
                required
              >
                {activeAccounts.length === 0 && (
                  <option value="">No active accounts</option>
                )}
                {activeAccounts.map((acc) => (
                  <option key={acc.accountNumber} value={acc.accountNumber}>
                    {acc.accountType || acc.name || 'Account'} (••••
                    {acc.accountNumber.slice(-4)}) -{' '}
                    {formatMoney(acc.balance, acc.currency || 'INR')}
                  </option>
                ))}
              </select>
            </label>

            <label className="kyc-field">
              <span>To Account Number</span>
              <input
                type="text"
                placeholder="Enter destination account number"
                value={toAccount}
                onChange={(e) => setToAccount(e.target.value)}
                required
              />
            </label>

            <label className="kyc-field">
              <span>Amount (INR)</span>
              <input
                type="number"
                min="1"
                step="0.01"
                placeholder="e.g. 5000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </label>

            <label className="kyc-field">
              <span>Description (optional)</span>
              <input
                type="text"
                placeholder="e.g. Rent payment"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>

            <div className="kyc-form-actions">
              <button
                type="button"
                className="button button-secondary"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="button button-primary"
                disabled={loading}
              >
                {loading ? 'Transferring…' : 'Confirm Transfer'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

/* ---------- Transaction Detail Panel ---------- */
function TransactionDetailPanel({ transaction, onClose }) {
  if (!transaction) return null

  return (
    <div className="kyc-modal-backdrop tx-detail-backdrop" onClick={onClose}>
      <div
        className="kyc-modal tx-detail-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="tx-detail-header">
          <div>
            <h2>Transaction Details</h2>
            <p>ID: {transaction.reference || transaction.id}</p>
          </div>
          <button onClick={onClose} className="tx-close-btn">
            <Icon name="close" size={16} color="#64748b" />
          </button>
        </div>
        <div className="tx-detail-body">
          <div className="tx-amount-section">
            <div
              className={`tx-amount ${
                ['CREDIT', 'DEPOSIT'].includes(
                  String(transaction.transactionType || '').toUpperCase()
                )
                  ? 'positive'
                  : 'negative'
              }`}
            >
              {['CREDIT', 'DEPOSIT'].includes(
                String(transaction.transactionType || '').toUpperCase()
              )
                ? '+'
                : '−'}{' '}
              {formatMoney(
                Math.abs(transaction.amount),
                transaction.currency || 'INR'
              )}
            </div>
            <span
              className={`bm-status bm-status-${statusTone(
                transaction.status
              )} tx-status-badge`}
            >
              {transaction.status}
            </span>
          </div>

          <div className="tx-grid">
            <DetailBlock
              label="Transaction Type"
              value={transaction.transactionType || 'Transaction'}
            />
            <DetailBlock
              label="Date & Time"
              value={`${formatDate(transaction.createdAt)} · ${formatTime(
                transaction.createdAt
              )}`}
            />
            <DetailBlock label="Currency" value={transaction.currency || 'INR'} />

            <div className="tx-divider" />

            <DetailBlock
              label="Reference ID"
              value={transaction.reference || '—'}
            />
            <DetailBlock
              label="Description"
              value={transaction.description || '—'}
            />
            <DetailBlock
              label="Performed By"
              value={transaction.performedBy || '—'}
            />

            <div className="tx-divider" />

            {transaction.fromAccountNumber && (
              <DetailBlock
                label="From Account"
                value={transaction.fromAccountNumber}
              />
            )}
            {transaction.toAccountNumber && (
              <DetailBlock
                label="To Account"
                value={transaction.toAccountNumber}
              />
            )}
            {!transaction.fromAccountNumber && !transaction.toAccountNumber && (
              <DetailBlock
                label="Account Number"
                value={transaction.accountNumber || '—'}
              />
            )}
          </div>
        </div>
        <div className="tx-detail-footer">
          <button
            type="button"
            className="button button-secondary tx-detail-close-btn"
            onClick={onClose}
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  )
}

function DetailBlock({ label, value }) {
  return (
    <div className="tx-detail-block">
      <span className="tx-detail-block-label">{label}</span>
      <span className="tx-detail-block-value">{value}</span>
    </div>
  )
}

/* ---------- FULL PAGE Edit Profile Component ---------- */
function ProfileEditPage({ customer, onCancel, onSuccess }) {
  const [form, setForm] = useState({
    mobileNumber: customer.mobileNumber || '',
    alternateMobileNumber: customer.alternateMobileNumber || '',

    permanentAddress: customer.permanentAddress || '',
    permanentCity: customer.permanentCity || '',
    permanentState: customer.permanentState || '',
    permanentCountry: customer.permanentCountry || 'India',
    permanentPinCode: customer.permanentPinCode || '',

    communicationAddress: customer.communicationAddress || '',
    communicationCity: customer.communicationCity || '',
    communicationState: customer.communicationState || '',
    communicationCountry: customer.communicationCountry || 'India',
    communicationPinCode: customer.communicationPinCode || '',

    occupation: customer.occupation || '',
    annualIncome: customer.annualIncome || '',
    sourceOfIncome: customer.sourceOfIncome || 'SALARY',
    language: customer.language || '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await updateCustomerProfile(customer.customerId || customer.id, form)
      onSuccess()
    } catch (err) {
      setError(err.message || 'Could not update profile.')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleCopyAddress = () => {
    setForm((prev) => ({
      ...prev,
      communicationAddress: prev.permanentAddress,
      communicationCity: prev.permanentCity,
      communicationState: prev.permanentState,
      communicationCountry: prev.permanentCountry,
      communicationPinCode: prev.permanentPinCode,
    }))
  }

  return (
    <section className="bm-panel">
      <div
        className="bm-panel-head"
        style={{
          borderBottom: '1px solid #eef2f8',
          paddingBottom: '16px',
          marginBottom: '24px',
        }}
      >
        <div>
          <button
            type="button"
            onClick={onCancel}
            style={{
              background: 'none',
              border: 'none',
              color: '#1769e0',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              padding: 0,
              marginBottom: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            ← Back to Profile
          </button>
          <h2 style={{ fontSize: '20px' }}>Edit Profile</h2>
          <p>Update your contact details, addresses, and employment information.</p>
        </div>
      </div>

      {error && (
        <div className="form-error" style={{ marginBottom: '24px' }}>
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="kyc-form"
        style={{ maxWidth: '800px' }}
      >
        <h3 className="profile-section-title">Contact Details</h3>
        <div className="apply-grid-3 profile-form-grid">
          <label className="kyc-field">
            <span>Mobile Number *</span>
            <input
              type="tel"
              name="mobileNumber"
              value={form.mobileNumber}
              onChange={handleChange}
              maxLength="10"
              pattern="^[0-9]{10}$"
              title="10 digit mobile number"
              required
            />
          </label>
          <label className="kyc-field">
            <span>Alternate Mobile</span>
            <input
              type="tel"
              name="alternateMobileNumber"
              value={form.alternateMobileNumber}
              onChange={handleChange}
              maxLength="10"
              pattern="^[0-9]{10}$"
              title="10 digit mobile number"
            />
          </label>
        </div>

        <h3 className="profile-section-title profile-section-title-spaced">
          Permanent Address
        </h3>
        <div className="apply-grid-3 profile-form-grid">
          <label className="kyc-field profile-field-grid">
            <span>Address *</span>
            <input
              name="permanentAddress"
              value={form.permanentAddress}
              onChange={handleChange}
              required
            />
          </label>
          <label className="kyc-field">
            <span>City *</span>
            <input
              name="permanentCity"
              value={form.permanentCity}
              onChange={handleChange}
              required
            />
          </label>
          <label className="kyc-field">
            <span>State *</span>
            <input
              name="permanentState"
              value={form.permanentState}
              onChange={handleChange}
              required
            />
          </label>
          <label className="kyc-field">
            <span>Country *</span>
            <input
              name="permanentCountry"
              value={form.permanentCountry}
              onChange={handleChange}
              required
            />
          </label>
          <label className="kyc-field">
            <span>PIN Code *</span>
            <input
              name="permanentPinCode"
              value={form.permanentPinCode}
              onChange={handleChange}
              pattern="^[0-9]{4,10}$"
              title="4 to 10 digits"
              required
            />
          </label>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '24px',
            marginBottom: '8px',
          }}
        >
          <h3 className="profile-section-title" style={{ margin: 0 }}>
            Communication Address
          </h3>
          <button
            type="button"
            onClick={handleCopyAddress}
            className="bm-ghost bm-ghost-primary"
            style={{ fontSize: '12px', padding: '6px 12px' }}
          >
            Copy from Permanent
          </button>
        </div>
        <div className="apply-grid-3 profile-form-grid">
          <label className="kyc-field profile-field-grid">
            <span>Address</span>
            <input
              name="communicationAddress"
              value={form.communicationAddress}
              onChange={handleChange}
            />
          </label>
          <label className="kyc-field">
            <span>City</span>
            <input
              name="communicationCity"
              value={form.communicationCity}
              onChange={handleChange}
            />
          </label>
          <label className="kyc-field">
            <span>State</span>
            <input
              name="communicationState"
              value={form.communicationState}
              onChange={handleChange}
            />
          </label>
          <label className="kyc-field">
            <span>Country</span>
            <input
              name="communicationCountry"
              value={form.communicationCountry}
              onChange={handleChange}
            />
          </label>
          <label className="kyc-field">
            <span>PIN Code</span>
            <input
              name="communicationPinCode"
              value={form.communicationPinCode}
              onChange={handleChange}
              pattern="^[0-9]{4,10}$"
              title="4 to 10 digits"
            />
          </label>
        </div>

        <h3 className="profile-section-title profile-section-title-spaced">
          Employment Details
        </h3>
        <div className="apply-grid-3 profile-form-grid">
          <label className="kyc-field">
            <span>Occupation</span>
            <input
              name="occupation"
              value={form.occupation}
              onChange={handleChange}
            />
          </label>
          <label className="kyc-field">
            <span>Annual Income</span>
            <input
              type="number"
              name="annualIncome"
              value={form.annualIncome}
              onChange={handleChange}
              min="0"
            />
          </label>
          <label className="kyc-field">
            <span>Source of Income *</span>
            <select
              name="sourceOfIncome"
              value={form.sourceOfIncome}
              onChange={handleChange}
              required
            >
              <option value="SALARY">Salary</option>
              <option value="BUSINESS">Business</option>
              <option value="INVESTMENTS">Investments</option>
              <option value="OTHER">Other</option>
            </select>
          </label>
          <label className="kyc-field">
            <span>Language</span>
            <input
              name="language"
              value={form.language}
              onChange={handleChange}
            />
          </label>
        </div>

        <div className="kyc-form-actions" style={{ marginTop: '32px' }}>
          <button
            type="button"
            className="button button-secondary"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="button button-primary"
            disabled={loading}
          >
            {loading ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </form>
    </section>
  )
}

/* ---------- Main Dashboard Page ---------- */
export default function CustomerDashboardPage({ customer, onSignOut }) {
  const [overview, setOverview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshingApplication, setRefreshingApplication] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [activePage, setActivePage] = useState('Dashboard')
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [selectedAccountId] = useState('')
  const [query] = useState('')
  const [transactionStatus] = useState('ALL')
  const [transactionFrom] = useState('')
  const [transactionTo] = useState('')
  const [balanceVisible, setBalanceVisible] = useState(true)
  const [modal, setModal] = useState('')
  const [noticeOpen, setNoticeOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [signOutError, setSignOutError] = useState('')
  const [showPasswordModal, setShowPasswordModal] = useState(false)

  const [showTransferModal, setShowTransferModal] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState(null)

  const [loanAccounts, setLoanAccounts] = useState([])
  const [pendingEmis, setPendingEmis] = useState([])

  // ---- Pagination state (Transactions page) ----
  const [transactionPage, setTransactionPage] = useState(1)
  const [transactionPageSize, setTransactionPageSize] = useState(10)

  const hasAccounts = Boolean(overview?.accounts?.length)
  const application = overview?.application || null
  const applicationId = application?.id
  const applicationStatus = application?.status
  const accountCount = overview?.accounts?.length || 0
  const primaryAccount = overview?.accounts?.[0]
  const selectedAccount =
    overview?.accounts?.find((account) => account.accountId === selectedAccountId) ||
    primaryAccount

  const customerName = overview?.customer?.name || customer.name || 'Customer'

  const actualCustomerId =
    overview?.customer?.customerId || customer.customerId || customer.id

  const navItems = hasAccounts ? accountNavItems : onboardingNavItems
  const displayedPage =
    hasAccounts && activePage === 'Open Account' ? 'Dashboard' : activePage

  useEffect(() => {
    let active = true
    getCustomerOverview(customer)
      .then((data) => {
        if (active) setOverview(data)
      })
      .catch((loadError) => {
        if (active) setError(loadError.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [customer])

  useEffect(() => {
    if (!applicationId || accountCount || applicationStatus === 'REJECTED')
      return undefined
    let active = true
    const intervalId = window.setInterval(() => {
      getCustomerOverview(customer)
        .then((data) => {
          if (active) {
            setOverview(data)
            setError('')
          }
        })
        .catch((loadError) => {
          if (active) setError(loadError.message)
        })
    }, 10000)
    return () => {
      active = false
      window.clearInterval(intervalId)
    }
  }, [customer, applicationId, applicationStatus, accountCount])

  useEffect(() => {
    if (
      !hasAccounts ||
      !['Dashboard', 'Accounts', 'Transactions'].includes(displayedPage)
    )
      return undefined
    let active = true
    const intervalId = window.setInterval(() => {
      getCustomerOverview(customer)
        .then((data) => {
          if (active) {
            setOverview(data)
            setError('')
          }
        })
        .catch((loadError) => {
          if (active) setError(loadError.message)
        })
    }, 30000)
    return () => {
      active = false
      window.clearInterval(intervalId)
    }
  }, [customer, displayedPage, hasAccounts])

  const filteredTransactions = useMemo(() => {
    const term = query.trim().toLowerCase()
    return (overview?.transactions || []).filter((transaction) => {
      const transactionDate = transaction.createdAt
        ? String(transaction.createdAt).slice(0, 10)
        : ''
      return (
        `${transaction.name} ${transaction.detail} ${transaction.status} ${
          transaction.transactionType || ''
        }`
          .toLowerCase()
          .includes(term) &&
        (transactionStatus === 'ALL' ||
          transaction.status === transactionStatus) &&
        (!transactionFrom ||
          (transactionDate && transactionDate >= transactionFrom)) &&
        (!transactionTo || (transactionDate && transactionDate <= transactionTo))
      )
    })
  }, [overview, query, transactionStatus, transactionFrom, transactionTo])

  /* ---------- Pagination derived values ---------- */
  const totalTransactionPages = Math.max(
    1,
    Math.ceil(filteredTransactions.length / transactionPageSize)
  )

  useEffect(() => {
    setTransactionPage(1)
  }, [query, transactionStatus, transactionFrom, transactionTo, transactionPageSize])

  useEffect(() => {
    if (transactionPage > totalTransactionPages) {
      setTransactionPage(totalTransactionPages)
    }
  }, [transactionPage, totalTransactionPages])

  const paginatedTransactions = useMemo(() => {
    const start = (transactionPage - 1) * transactionPageSize
    return filteredTransactions.slice(start, start + transactionPageSize)
  }, [filteredTransactions, transactionPage, transactionPageSize])

  const handleNavigate = (page) => {
    setIsEditingProfile(false)
    setActivePage(page)

    if (page === 'Open Account') {
      if (application)
        document
          .getElementById('application-status')
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      else setModal('account-application')
      return
    }

    if (page === 'Transfer') {
      setShowTransferModal(true)
      return
    }

    if (['Payments', 'Support'].includes(page)) {
      setModal({ Payments: 'payment', Support: 'support' }[page])
      return
    }

    if (page === 'Profile') {
      setProfileOpen(false)
      return
    }

    if (
      ['Dashboard', 'Accounts', 'Transactions', 'Loans', 'KYC Status'].includes(
        page
      )
    ) {
      setProfileOpen(false)
      setNoticeOpen(false)
    }
  }

  const closeTransferModal = () => {
    setShowTransferModal(false)
    if (activePage === 'Transfer') setActivePage('Dashboard')
  }

  async function refreshApplication() {
    setRefreshingApplication(true)
    setError('')
    try {
      setOverview(await getCustomerOverview(customer))
    } catch (refreshError) {
      setError(refreshError.message)
    } finally {
      setRefreshingApplication(false)
    }
  }

  async function refreshTransactions() {
    setRefreshing(true)
    setError('')
    try {
      setOverview(await getCustomerOverview(customer))
    } catch (refreshError) {
      setError(refreshError.message)
    } finally {
      setRefreshing(false)
    }
  }

  async function handleSignOut() {
    setSignOutError('')
    try {
      await signOut()
      onSignOut()
    } catch (signOutFailure) {
      setSignOutError(signOutFailure.message)
    }
  }

  const firstName = customerName.split(' ')[0] || 'Customer'
  const currency = overview?.currency || 'INR'
  const customerStatus = String(
    overview?.customer?.status || 'PROFILE NOT SUBMITTED'
  ).toUpperCase()
  const kycApproved = ['ACCOUNT_OPENED', 'KYC_APPROVED', 'APPROVED'].includes(
    String(application?.status || '').toUpperCase()
  )

  useEffect(() => {
    let active = true

    const loadLoans = async () => {
      try {
        const accounts = await getMyLoanAccounts()
        const accountList = Array.isArray(accounts) ? accounts : []
        if (!active) return
        setLoanAccounts(
          accountList.filter(
            (account) => !account.closed && account.status === 'ACTIVE'
          )
        )

        const schedules = await Promise.all(
          accountList
            .filter((account) => !account.closed && account.status === 'ACTIVE')
            .map(async (account) => {
              const rows = await getLoanSchedule(account.id)
              return (Array.isArray(rows) ? rows : [])
                .filter((row) => row.status !== 'PAID')
                .map((row) => ({
                  ...row,
                  accountId: account.id,
                  monthlyEmi: account.monthlyEmi,
                }))
            })
        )
        if (!active) return
        setPendingEmis(
          schedules
            .flat()
            .sort(
              (left, right) =>
                new Date(left.dueDate || 0) - new Date(right.dueDate || 0)
            )
        )
      } catch {
        if (active) {
          setLoanAccounts([])
          setPendingEmis([])
        }
      }
    }

    loadLoans()
    const intervalId = window.setInterval(loadLoans, 30000)
    return () => {
      active = false
      window.clearInterval(intervalId)
    }
  }, [])

  return (
    <>
      <div className="dashboard-app">
        <aside className="sidebar">
          <a
            href="#dashboard"
            className="sidebar-brand"
            onClick={(e) => {
              e.preventDefault()
              handleNavigate('Dashboard')
            }}
          >
            <Brand />
          </a>
          <div className="sidebar-customer">
            <span className="avatar">
              <SecureImage
                customerId={actualCustomerId}
                fallback={<Icon name="user" size={17} />}
              />
            </span>
            <span>
              <b>{customerName}</b>
              <small>{customer.customerNumber || customer.id}</small>
            </span>
          </div>
          <div className="sidebar-label">YOUR BANKING</div>
          <nav className="side-nav" aria-label="Account navigation">
            {navItems.map(([label, icon]) => (
              <button
                key={label}
                className={displayedPage === label ? 'active' : ''}
                onClick={() => handleNavigate(label)}
              >
                <Icon name={icon} size={17} />
                <span>{label}</span>
              </button>
            ))}
          </nav>
          <div className="sidebar-bottom">
            <button onClick={handleSignOut}>
              <Icon name="logout" size={17} />
              <span>Log out</span>
            </button>
            <div className="secure-note">
              <span className="secure-dot" />
              Signed in securely
            </div>
          </div>
        </aside>

        <div className="dashboard-main">
          <header className="dashboard-topbar">
            <div className="topbar-title">
              <strong>Customer Dashboard</strong>
              <span>Manage your accounts and services</span>
            </div>
            <div className="topbar-actions">
              <div className="popover-wrap">
                <button
                  className="icon-button notification-button"
                  aria-label="Notifications"
                  onClick={() => {
                    setNoticeOpen(!noticeOpen)
                    setProfileOpen(false)
                  }}
                >
                  <Icon name="bell" size={19} />
                  <span className="bm-badge">{pendingEmis.length}</span>
                </button>
                {noticeOpen && (
                  <div className="popover notification-popover">
                    <b>
                      {pendingEmis.length
                        ? `${pendingEmis.length} EMI payment${
                            pendingEmis.length === 1 ? '' : 's'
                          } pending`
                        : 'You’re all caught up'}
                    </b>
                    <p>
                      {pendingEmis.length
                        ? 'View the Loans section for due dates and payment options.'
                        : 'We’ll let you know when there’s something new.'}
                    </p>
                  </div>
                )}
              </div>
              <div className="popover-wrap">
                <button
                  className="profile-trigger"
                  aria-expanded={profileOpen}
                  onClick={() => {
                    setProfileOpen(!profileOpen)
                    setNoticeOpen(false)
                  }}
                >
                  <span className="avatar">
                    <SecureImage
                      customerId={actualCustomerId}
                      fallback={<Icon name="user" size={17} />}
                    />
                  </span>
                  <span>{customerName}</span>
                  <span className="chevron">
                    <Icon name="arrowDown" size={14} />
                  </span>
                </button>
                {profileOpen && (
                  <div className="popover profile-popover">
                    <button
                      className="profile-popover-item"
                      onClick={() => {
                        setProfileOpen(false)
                        handleNavigate('Profile')
                      }}
                    >
                      👤 View Profile
                    </button>
                    <button
                      className="profile-popover-item"
                      onClick={() => {
                        setProfileOpen(false)
                        setShowPasswordModal(true)
                      }}
                    >
                      🔒 Change Password
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          <div className="dashboard-content">
            <div className="welcome-row">
              <div>
                <div className="welcome-title">
                  Welcome back, {firstName}!
                </div>
                <p>Manage your accounts and monitor your financial activity.</p>
              </div>
              <div className="welcome-meta">
                <div className="bm-date-chip">
                  <span>📅</span>
                  <div>
                    <b>
                      {new Intl.DateTimeFormat('en-IN', {
                        weekday: 'short',
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      }).format(new Date())}
                    </b>
                    <small>
                      {new Intl.DateTimeFormat('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      }).format(new Date())}
                    </small>
                  </div>
                </div>
              </div>
            </div>

            {signOutError && <div className="dashboard-error">{signOutError}</div>}
            {loading && (
              <div className="dashboard-state">Loading your dashboard…</div>
            )}
            {error && (
              <div className="dashboard-error">
                {error}{' '}
                <button onClick={() => window.location.reload()}>
                  Try again
                </button>
              </div>
            )}

            {overview && !loading && !hasAccounts && displayedPage !== 'Loans' && (
              <OnboardingDashboard
                customer={customer}
                application={application}
                onRefreshApplication={refreshApplication}
                refreshingApplication={refreshingApplication}
                onOpenAccount={() => setModal('account-application')}
              />
            )}

            {overview && !loading && hasAccounts && displayedPage === 'Dashboard' && (
              <div className="customer-home">
                <section className="customer-home-hero">
                  <div className="customer-balance-card">
                    <div className="customer-balance-heading">
                      <div>
                        <span>
                          {primaryAccount?.accountType || 'Nova Bank account'}
                        </span>
                        <small>
                          Account ••••{' '}
                          {primaryAccount?.accountNumber?.slice(-4) || '—'}
                        </small>
                      </div>
                      <span
                        className={`status-pill ${
                          primaryAccount?.accountStatus === 'ACTIVE'
                            ? ''
                            : 'status-pill-inactive'
                        }`}
                      >
                        {primaryAccount?.accountStatus || '—'}
                      </span>
                    </div>
                    <div className="customer-balance-label">
                      Account balance
                    </div>
                    <strong>
                      {balanceVisible
                        ? formatMoney(overview.totalBalance, currency)
                        : '••••••••'}
                    </strong>
                    <div className="customer-balance-footer">
                      <span>
                        Total across {accountCount} account
                        {accountCount === 1 ? '' : 's'} · {customerStatus}
                      </span>
                      <button
                        type="button"
                        aria-label={
                          balanceVisible ? 'Hide balance' : 'Show balance'
                        }
                        onClick={() => setBalanceVisible(!balanceVisible)}
                      >
                        <Icon name="eye" size={16} />
                      </button>
                    </div>
                  </div>

                  <button
                    className="customer-debit-card"
                    onClick={() => handleNavigate('Dashboard')}
                    aria-label="View debit card details"
                    type="button"
                  >
                    <span className="customer-debit-card-top">
                      <Brand />
                      <span className="customer-card-chip" aria-hidden="true">
                        <i />
                      </span>
                    </span>
                    <span className="customer-card-number">
                      {primaryAccount?.debitCard?.debitCardReference
                        ? primaryAccount.debitCard.debitCardReference
                        : '•••• •••• •••• ••••'}
                    </span>
                    <span className="customer-card-bottom">
                      <span>
                        <small>CARDHOLDER</small>
                        <b>{customerName || '—'}</b>
                      </span>
                      <span className="customer-card-network">
                        {primaryAccount?.debitCard?.cardType || 'VIRTUAL'}
                      </span>
                    </span>
                    <span className="customer-card-caption">
                      {primaryAccount?.debitCard?.expiryDate
                        ? `VALID THRU ${new Date(
                            `${primaryAccount.debitCard.expiryDate}T00:00:00`
                          ).toLocaleDateString('en-IN', {
                            month: '2-digit',
                            year: '2-digit',
                          })}`
                        : 'VIRTUAL CARD PREVIEW'}
                    </span>
                  </button>
                </section>

                <section className="bm-panel customer-panel-spaced">
                  <div className="bm-panel-head">
                    <div>
                      <h2>Recent transactions</h2>
                      <p>Your latest account activity</p>
                    </div>
                    <div className="panel-action-group">
                      <button
                        className="bm-ghost bm-ghost-primary"
                        onClick={() => setShowTransferModal(true)}
                      >
                        Transfer Money
                      </button>
                      <button
                        className="bm-ghost"
                        onClick={() => handleNavigate('Transactions')}
                      >
                        View all →
                      </button>
                    </div>
                  </div>

                  <div className="bm-table-wrap">
                    <table className="bm-table">
                      <thead>
                        <tr>
                          <th className="col-date">Date</th>
                          <th className="col-desc">Description</th>
                          <th className="col-type">Type</th>
                          <th className="col-amount">Amount</th>
                          <th className="col-status">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {overview.transactions.length === 0 ? (
                          <tr>
                            <td colSpan="5" className="bm-empty">
                              No transactions yet. Your account activity will
                              appear here.
                            </td>
                          </tr>
                        ) : (
                          overview.transactions.slice(0, 5).map((transaction) => (
                            <tr
                              key={transaction.id}
                              onClick={() =>
                                setSelectedTransaction(transaction)
                              }
                              className="transaction-row"
                            >
                              <td className="bm-cell-time">
                                {formatDate(transaction.createdAt)} ·{' '}
                                {formatTime(transaction.createdAt)}
                              </td>
                              <td>
                                <b>{transaction.name}</b>
                              </td>
                              <td>
                                {transaction.transactionType || 'Transaction'}
                              </td>
                              <td
                                className={
                                  ['CREDIT', 'DEPOSIT'].includes(
                                    String(
                                      transaction.transactionType || ''
                                    ).toUpperCase()
                                  )
                                    ? 'amount-credit'
                                    : 'amount-debit'
                                }
                              >
                                {['CREDIT', 'DEPOSIT'].includes(
                                  String(
                                    transaction.transactionType || ''
                                  ).toUpperCase()
                                )
                                  ? '+'
                                  : '−'}{' '}
                                {formatMoney(
                                  Math.abs(transaction.amount),
                                  transaction.currency || currency
                                )}
                              </td>
                              <td>
                                <span
                                  className={`bm-status bm-status-${statusTone(
                                    transaction.status
                                  )}`}
                                >
                                  {transaction.status}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>

                {loanAccounts.length > 0 && (
                  <section className="bm-panel customer-panel-spaced">
                    <div className="bm-panel-head">
                      <div>
                        <h2>Active loans</h2>
                        <p>Outstanding loans and upcoming EMI payments</p>
                      </div>
                      <button
                        className="bm-ghost bm-ghost-primary"
                        onClick={() => handleNavigate('Loans')}
                      >
                        Manage loans →
                      </button>
                    </div>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns:
                          'repeat(auto-fit, minmax(220px, 1fr))',
                        gap: '12px',
                      }}
                    >
                      {loanAccounts.map((account) => {
                        const nextEmi = pendingEmis.find(
                          (row) => row.accountId === account.id
                        )
                        return (
                          <article
                            key={account.id}
                            className="admin-field-box"
                            style={{ padding: '16px', borderRadius: '10px' }}
                          >
                            <span className="admin-field-label">
                              {account.id}
                            </span>
                            <strong
                              style={{
                                display: 'block',
                                margin: '8px 0 4px',
                                color: '#0f172a',
                              }}
                            >
                              {formatMoney(account.outstandingPrincipal)}
                            </strong>
                            <span
                              style={{ fontSize: '12px', color: '#64748b' }}
                            >
                              Outstanding principal
                            </span>
                            {nextEmi && (
                              <div
                                style={{
                                  marginTop: '12px',
                                  paddingTop: '12px',
                                  borderTop: '1px solid #e2e8f0',
                                }}
                              >
                                <span className="admin-field-label">
                                  Next EMI
                                </span>
                                <b
                                  style={{
                                    display: 'block',
                                    marginTop: '4px',
                                  }}
                                >
                                  {formatMoney(nextEmi.amountDue)} ·{' '}
                                  {formatDate(nextEmi.dueDate)}
                                </b>
                              </div>
                            )}
                          </article>
                        )
                      })}
                    </div>
                  </section>
                )}
              </div>
            )}

            {/* ACCOUNTS PAGE */}
            {overview && !loading && hasAccounts && displayedPage === 'Accounts' && (
              <div className="customer-home">
                <section className="bm-panel">
                  <div className="bm-panel-head" style={{ marginBottom: 0 }}>
                    <div>
                      <h2>My accounts</h2>
                      <p>
                        View your account balance, status and account
                        information.
                      </p>
                    </div>
                    <span className="bm-badge account-count-badge">
                      {accountCount} account{accountCount === 1 ? '' : 's'}
                    </span>
                  </div>
                </section>

                {selectedAccount && (
                  <div className="profile-grid-layout">
                    <div className="profile-grid-left">
                      <section className="bm-panel">
                        <div className="admin-card-head">
                          <span className="admin-card-icon">🏦</span>
                          <div>
                            <h3>Account Information</h3>
                            <p>Primary account details and status</p>
                          </div>
                          <span
                            className={`bm-status bm-status-${statusTone(
                              selectedAccount.accountStatus
                            )}`}
                            style={{ marginLeft: 'auto' }}
                          >
                            {selectedAccount.accountStatus}
                          </span>
                        </div>

                        <div
                          className="account-balance-box"
                          style={{ marginBottom: '20px', marginTop: 0 }}
                        >
                          <div>
                            <span className="account-balance-label">
                              AVAILABLE BALANCE
                            </span>
                            <strong className="account-balance-value">
                              {balanceVisible
                                ? formatMoney(
                                    selectedAccount.balance,
                                    selectedAccount.currency || currency
                                  )
                                : '••••••••'}
                            </strong>
                          </div>
                          <button
                            className="account-balance-toggle"
                            onClick={() => setBalanceVisible(!balanceVisible)}
                          >
                            <Icon name="eye" size={14} />{' '}
                            {balanceVisible ? 'Hide' : 'Show'}
                          </button>
                        </div>

                        <div className="admin-grid-2">
                          <div className="admin-field-box">
                            <span className="admin-field-label">
                              ACCOUNT HOLDER
                            </span>
                            <span className="admin-field-value">
                              {customerName}
                            </span>
                          </div>
                          <div className="admin-field-box">
                            <span className="admin-field-label">
                              ACCOUNT NUMBER
                            </span>
                            <span className="admin-field-value">
                              {selectedAccount.accountNumber || '—'}
                            </span>
                          </div>
                          <div className="admin-field-box">
                            <span className="admin-field-label">
                              ACCOUNT TYPE
                            </span>
                            <span className="admin-field-value">
                              {String(
                                selectedAccount.accountType || 'SAVINGS'
                              )
                                .replace(/_/g, ' ')
                                .toUpperCase()}
                            </span>
                          </div>
                          <div className="admin-field-box">
                            <span className="admin-field-label">EMAIL</span>
                            <span className="admin-field-value">
                              {selectedAccount.email || '—'}
                            </span>
                          </div>
                          <div className="admin-field-box">
                            <span className="admin-field-label">BRANCH</span>
                            <span className="admin-field-value">
                              {selectedAccount.branchName || '—'}
                            </span>
                          </div>
                          <div className="admin-field-box">
                            <span className="admin-field-label">IFSC CODE</span>
                            <span className="admin-field-value">
                              {selectedAccount.ifsc || '—'}
                            </span>
                          </div>
                          <div className="admin-field-box admin-field-full">
                            <span className="admin-field-label">
                              ACCOUNT OPENED ON
                            </span>
                            <span className="admin-field-value">
                              {selectedAccount.createdAt
                                ? new Date(
                                    selectedAccount.createdAt
                                  ).toLocaleDateString('en-IN', {
                                    day: '2-digit',
                                    month: 'long',
                                    year: 'numeric',
                                  })
                                : '—'}
                            </span>
                          </div>
                        </div>
                      </section>
                    </div>

                    <div className="profile-grid-right">
                      {selectedAccount.debitCard ? (
                        <section className="bm-panel">
                          <div className="admin-card-head">
                            <span
                              className="admin-card-icon"
                              style={{ background: '#fce7f3', color: '#db2777' }}
                            >
                              💳
                            </span>
                            <div>
                              <h3>Debit Card</h3>
                              <p>Linked to this account</p>
                            </div>
                          </div>

                          <div
                            style={{
                              background:
                                'linear-gradient(135deg, #1e293b, #0f172a)',
                              borderRadius: '10px',
                              padding: '20px',
                              color: '#fff',
                              marginBottom: '16px',
                              position: 'relative',
                              overflow: 'hidden',
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '24px',
                              }}
                            >
                              <span
                                style={{ fontSize: '18px', fontWeight: 800 }}
                              >
                                NOVA
                              </span>
                              <Icon
                                name="wifi"
                                size={20}
                                style={{
                                  transform: 'rotate(90deg)',
                                  opacity: 0.5,
                                }}
                              />
                            </div>
                            <div
                              style={{
                                fontSize: '18px',
                                letterSpacing: '2px',
                                marginBottom: '16px',
                              }}
                            >
                              •••• •••• ••••{' '}
                              {selectedAccount.debitCard.lastFourDigits ||
                                '••••'}
                            </div>
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'flex-end',
                              }}
                            >
                              <div>
                                <div
                                  style={{
                                    fontSize: '9px',
                                    color: '#94a3b8',
                                    textTransform: 'uppercase',
                                  }}
                                >
                                  Cardholder
                                </div>
                                <div
                                  style={{ fontSize: '12px', fontWeight: 600 }}
                                >
                                  {customerName}
                                </div>
                              </div>
                              <div>
                                <div
                                  style={{
                                    fontSize: '9px',
                                    color: '#94a3b8',
                                    textTransform: 'uppercase',
                                  }}
                                >
                                  Expires
                                </div>
                                <div
                                  style={{ fontSize: '12px', fontWeight: 600 }}
                                >
                                  {selectedAccount.debitCard.expiryDate
                                    ? new Date(
                                        selectedAccount.debitCard.expiryDate
                                      ).toLocaleDateString('en-IN', {
                                        month: '2-digit',
                                        year: '2-digit',
                                      })
                                    : 'MM/YY'}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="admin-grid-1">
                            <div className="admin-field-box">
                              <span className="admin-field-label">
                                CARD REFERENCE
                              </span>
                              <span className="admin-field-value">
                                {selectedAccount.debitCard
                                  .debitCardReference || '—'}
                              </span>
                            </div>
                            <div className="admin-field-box">
                              <span className="admin-field-label">
                                CARD TYPE
                              </span>
                              <span className="admin-field-value">
                                {selectedAccount.debitCard.cardType ||
                                  'VIRTUAL'}
                              </span>
                            </div>
                            <div className="admin-field-box">
                              <span className="admin-field-label">
                                CARD STATUS
                              </span>
                              <span className="admin-field-value">
                                <span
                                  className={`bm-status bm-status-${statusTone(
                                    selectedAccount.debitCard.cardStatus
                                  )}`}
                                >
                                  {selectedAccount.debitCard.cardStatus ||
                                    'ACTIVE'}
                                </span>
                              </span>
                            </div>
                          </div>
                        </section>
                      ) : (
                        <section
                          className="bm-panel"
                          style={{ padding: '40px 20px', textAlign: 'center' }}
                        >
                          <Icon
                            name="creditCard"
                            size={32}
                            style={{
                              color: '#cbd5e1',
                              margin: '0 auto 12px',
                            }}
                          />
                          <h3
                            style={{
                              fontSize: '14px',
                              color: '#64748b',
                              margin: 0,
                            }}
                          >
                            No Debit Card
                          </h3>
                          <p
                            style={{
                              fontSize: '12px',
                              color: '#94a3b8',
                              marginTop: '4px',
                            }}
                          >
                            A debit card is not linked to this account.
                          </p>
                        </section>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TRANSACTIONS PAGE — with pagination */}
            {overview && !loading && hasAccounts && displayedPage === 'Transactions' && (
              <section className="bm-panel">
                <div className="bm-panel-head">
                  <div>
                    <h2>Transactions</h2>
                    <p>
                      {filteredTransactions.length > 0
                        ? `Showing ${
                            (transactionPage - 1) * transactionPageSize + 1
                          }–${Math.min(
                            transactionPage * transactionPageSize,
                            filteredTransactions.length
                          )} of ${filteredTransactions.length} transactions`
                        : 'Your latest 50 transactions'}
                    </p>
                  </div>
                  <button
                    className="bm-ghost"
                    onClick={refreshTransactions}
                    disabled={refreshing}
                  >
                    {refreshing ? 'Refreshing…' : 'Refresh'}
                  </button>
                </div>
                <div className="bm-table-wrap transactions-table-wrap">
                  <table className="bm-table">
                    <thead>
                      <tr>
                        <th className="col-date">Date</th>
                        <th className="col-desc">Description</th>
                        <th className="col-type">Type</th>
                        <th className="col-amount">Amount</th>
                        <th className="col-status">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTransactions.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="bm-empty">
                            No transactions found.
                          </td>
                        </tr>
                      ) : (
                        paginatedTransactions.map((transaction) => (
                          <tr
                            key={transaction.id}
                            onClick={() => setSelectedTransaction(transaction)}
                            className="transaction-row"
                          >
                            <td className="bm-cell-time">
                              {formatDate(transaction.createdAt)} ·{' '}
                              {formatTime(transaction.createdAt)}
                            </td>
                            <td>
                              <b>{transaction.name}</b>
                            </td>
                            <td>
                              {transaction.transactionType || 'Transaction'}
                            </td>
                            <td
                              className={
                                ['CREDIT', 'DEPOSIT'].includes(
                                  String(
                                    transaction.transactionType || ''
                                  ).toUpperCase()
                                )
                                  ? 'amount-credit'
                                  : 'amount-debit'
                              }
                            >
                              {['CREDIT', 'DEPOSIT'].includes(
                                String(
                                  transaction.transactionType || ''
                                ).toUpperCase()
                              )
                                ? '+'
                                : '−'}{' '}
                              {formatMoney(
                                Math.abs(transaction.amount),
                                transaction.currency || currency
                              )}
                            </td>
                            <td>
                              <span
                                className={`bm-status bm-status-${statusTone(
                                  transaction.status
                                )}`}
                              >
                                {transaction.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {filteredTransactions.length > 0 && (
                  <Pagination
                    page={transactionPage}
                    totalPages={totalTransactionPages}
                    pageSize={transactionPageSize}
                    onPageChange={setTransactionPage}
                    onPageSizeChange={setTransactionPageSize}
                  />
                )}
              </section>
            )}

            {/* LOANS PAGE */}
            {overview && !loading && displayedPage === 'Loans' && (
              <CustomerLoanPage customer={overview?.customer || customer} />
            )}

            {/* KYC STATUS PAGE */}
            {overview && !loading && hasAccounts && displayedPage === 'KYC Status' && (
              <section className="bm-panel">
                <div className="bm-panel-head">
                  <div>
                    <h2>KYC status</h2>
                    <p>Your identity verification and account eligibility</p>
                  </div>
                  <span
                    className={`bm-status bm-status-${
                      kycApproved ? 'ok' : 'warn'
                    }`}
                  >
                    {application?.status || 'PENDING'}
                  </span>
                </div>
                <div className="kyc-info-box">
                  <div className="kyc-info-content">
                    <span
                      className={`kyc-info-icon ${
                        kycApproved ? 'kyc-info-icon-ok' : 'kyc-info-icon-warn'
                      }`}
                    >
                      <Icon name={kycApproved ? 'check' : 'shield'} size={20} />
                    </span>
                    <div>
                      <b className="kyc-info-title">
                        {kycApproved
                          ? 'Your KYC is approved'
                          : application?.status ||
                            'Verification status unavailable'}
                      </b>
                      <p className="kyc-info-desc">
                        {kycApproved
                          ? 'Your identity check is complete.'
                          : 'Contact support if you need help with your verification.'}
                      </p>
                    </div>
                  </div>
                </div>
                {application && (
                  <dl className="bm-table detail-list">
                    <div className="detail-row">
                      <dt>Application reference</dt>
                      <dd>{application.id}</dd>
                    </div>
                    <div className="detail-row">
                      <dt>Submitted</dt>
                      <dd>
                        {application.submittedAt
                          ? new Date(
                              application.submittedAt
                            ).toLocaleDateString('en-IN')
                          : '—'}
                      </dd>
                    </div>
                    <div className="detail-row detail-row-last">
                      <dt>Current stage</dt>
                      <dd>{application.currentStage || application.status}</dd>
                    </div>
                  </dl>
                )}
              </section>
            )}

            {/* PROFILE PAGE */}
            {overview && !loading && displayedPage === 'Profile' && (
              isEditingProfile ? (
                <ProfileEditPage
                  customer={overview?.customer || customer}
                  onCancel={() => setIsEditingProfile(false)}
                  onSuccess={() => {
                    setIsEditingProfile(false)
                    getCustomerOverview(customer)
                      .then((data) => setOverview(data))
                      .catch((err) => setError(err.message))
                  }}
                />
              ) : (
                <div className="customer-home">
                  <section className="bm-panel">
                    <div className="bm-panel-head" style={{ marginBottom: 0 }}>
                      <div>
                        <h2>Profile</h2>
                        <p>Your registered customer information</p>
                      </div>
                      <div className="panel-action-group">
                        <button
                          className="bm-ghost bm-ghost-primary"
                          onClick={() => setIsEditingProfile(true)}
                        >
                          Edit Profile
                        </button>
                        <span
                          className={`bm-status bm-status-${
                            customerStatus === 'ACTIVE' ? 'ok' : 'neutral'
                          }`}
                        >
                          {customerStatus}
                        </span>
                      </div>
                    </div>
                  </section>

                  <div className="profile-grid-layout">
                    <div className="profile-grid-left">
                      <section className="bm-panel">
                        <div className="admin-card-head">
                          <span className="admin-card-icon">📋</span>
                          <div>
                            <h3>Personal Information</h3>
                            <p>Basic demographic details</p>
                          </div>
                        </div>
                        <div className="admin-grid-2">
                          <div className="admin-field-box">
                            <span className="admin-field-label">FULL NAME</span>
                            <span className="admin-field-value">
                              {overview.customer?.name || '—'}
                            </span>
                          </div>
                          <div className="admin-field-box">
                            <span className="admin-field-label">
                              DATE OF BIRTH
                            </span>
                            <span className="admin-field-value">
                              {overview.customer?.dateOfBirth
                                ? formatDate(overview.customer.dateOfBirth)
                                : '—'}
                            </span>
                          </div>
                          <div className="admin-field-box">
                            <span className="admin-field-label">GENDER</span>
                            <span className="admin-field-value">
                              {overview.customer?.gender || '—'}
                            </span>
                          </div>
                          <div className="admin-field-box">
                            <span className="admin-field-label">
                              MARITAL STATUS
                            </span>
                            <span className="admin-field-value">
                              {overview.customer?.maritalStatus || '—'}
                            </span>
                          </div>
                          <div className="admin-field-box">
                            <span className="admin-field-label">
                              NATIONALITY
                            </span>
                            <span className="admin-field-value">
                              {overview.customer?.nationality || '—'}
                            </span>
                          </div>
                          <div className="admin-field-box">
                            <span className="admin-field-label">LANGUAGE</span>
                            <span className="admin-field-value">
                              {overview.customer?.language || '—'}
                            </span>
                          </div>
                        </div>
                      </section>

                      <section className="bm-panel">
                        <div className="admin-card-head">
                          <span
                            className="admin-card-icon"
                            style={{ background: '#e0f2fe', color: '#0284c7' }}
                          >
                            📞
                          </span>
                          <div>
                            <h3>Contact Information</h3>
                            <p>Email and phone numbers</p>
                          </div>
                        </div>
                        <div className="admin-grid-2">
                          <div className="admin-field-box admin-field-full">
                            <span className="admin-field-label">EMAIL</span>
                            <span className="admin-field-value">
                              {overview.customer?.email || '—'}
                            </span>
                          </div>
                          <div className="admin-field-box">
                            <span className="admin-field-label">MOBILE</span>
                            <span className="admin-field-value">
                              {overview.customer?.mobileNumber || '—'}
                            </span>
                          </div>
                          <div className="admin-field-box">
                            <span className="admin-field-label">
                              ALTERNATE MOBILE
                            </span>
                            <span className="admin-field-value">
                              {overview.customer?.alternateMobileNumber || '—'}
                            </span>
                          </div>
                        </div>
                      </section>

                      <section className="bm-panel">
                        <div className="admin-card-head">
                          <span
                            className="admin-card-icon"
                            style={{ background: '#fce7f3', color: '#db2777' }}
                          >
                            📍
                          </span>
                          <div>
                            <h3>Address Information</h3>
                            <p>Permanent and communication addresses</p>
                          </div>
                        </div>

                        <h4
                          style={{
                            fontSize: '13px',
                            color: '#0f172a',
                            marginBottom: '12px',
                            marginTop: '8px',
                          }}
                        >
                          Permanent Address
                        </h4>
                        <div className="admin-grid-2">
                          <div className="admin-field-box admin-field-full">
                            <span className="admin-field-label">ADDRESS</span>
                            <span className="admin-field-value">
                              {overview.customer?.permanentAddress || '—'}
                            </span>
                          </div>
                          <div className="admin-field-box">
                            <span className="admin-field-label">CITY</span>
                            <span className="admin-field-value">
                              {overview.customer?.permanentCity || '—'}
                            </span>
                          </div>
                          <div className="admin-field-box">
                            <span className="admin-field-label">STATE</span>
                            <span className="admin-field-value">
                              {overview.customer?.permanentState || '—'}
                            </span>
                          </div>
                          <div className="admin-field-box">
                            <span className="admin-field-label">COUNTRY</span>
                            <span className="admin-field-value">
                              {overview.customer?.permanentCountry || '—'}
                            </span>
                          </div>
                          <div className="admin-field-box">
                            <span className="admin-field-label">PIN CODE</span>
                            <span className="admin-field-value">
                              {overview.customer?.permanentPinCode || '—'}
                            </span>
                          </div>
                        </div>

                        <h4
                          style={{
                            fontSize: '13px',
                            color: '#0f172a',
                            marginBottom: '12px',
                            marginTop: '24px',
                          }}
                        >
                          Communication Address
                        </h4>
                        <div className="admin-grid-2">
                          <div className="admin-field-box admin-field-full">
                            <span className="admin-field-label">ADDRESS</span>
                            <span className="admin-field-value">
                              {overview.customer?.communicationAddress || '—'}
                            </span>
                          </div>
                          <div className="admin-field-box">
                            <span className="admin-field-label">CITY</span>
                            <span className="admin-field-value">
                              {overview.customer?.communicationCity || '—'}
                            </span>
                          </div>
                          <div className="admin-field-box">
                            <span className="admin-field-label">STATE</span>
                            <span className="admin-field-value">
                              {overview.customer?.communicationState || '—'}
                            </span>
                          </div>
                          <div className="admin-field-box">
                            <span className="admin-field-label">COUNTRY</span>
                            <span className="admin-field-value">
                              {overview.customer?.communicationCountry || '—'}
                            </span>
                          </div>
                          <div className="admin-field-box">
                            <span className="admin-field-label">PIN CODE</span>
                            <span className="admin-field-value">
                              {overview.customer?.communicationPinCode || '—'}
                            </span>
                          </div>
                        </div>
                      </section>
                    </div>

                    <div className="profile-grid-right">
                      <section className="bm-panel">
                        <div className="admin-card-head">
                          <span
                            className="admin-card-icon"
                            style={{ background: '#fef3c7', color: '#d97706' }}
                          >
                            💼
                          </span>
                          <div>
                            <h3>Financial Details</h3>
                            <p>Income and employment</p>
                          </div>
                        </div>
                        <div className="admin-grid-1">
                          <div className="admin-field-box">
                            <span className="admin-field-label">
                              OCCUPATION
                            </span>
                            <span className="admin-field-value">
                              {overview.customer?.occupation || '—'}
                            </span>
                          </div>
                          <div className="admin-field-box">
                            <span className="admin-field-label">
                              ANNUAL INCOME
                            </span>
                            <span className="admin-field-value">
                              {overview.customer?.annualIncome
                                ? formatMoney(overview.customer.annualIncome)
                                : '—'}
                            </span>
                          </div>
                          <div className="admin-field-box">
                            <span className="admin-field-label">
                              SOURCE OF INCOME
                            </span>
                            <span className="admin-field-value">
                              {overview.customer?.sourceOfIncome || '—'}
                            </span>
                          </div>
                          <div className="admin-field-box">
                            <span className="admin-field-label">
                              OPENING BALANCE
                            </span>
                            <span className="admin-field-value">
                              {overview.customer?.openingBalance
                                ? formatMoney(overview.customer.openingBalance)
                                : '—'}
                            </span>
                          </div>
                        </div>
                      </section>

                      <section className="bm-panel">
                        <div className="admin-card-head">
                          <span
                            className="admin-card-icon"
                            style={{ background: '#e0f2fe', color: '#0284c7' }}
                          >
                            🏛️
                          </span>
                          <div>
                            <h3>Branch Info</h3>
                            <p>Assigned banking branch</p>
                          </div>
                        </div>
                        <div className="admin-grid-1">
                          <div className="admin-field-box">
                            <span className="admin-field-label">
                              BRANCH NAME
                            </span>
                            <span className="admin-field-value">
                              {overview.customer?.branchName || '—'}
                            </span>
                          </div>
                          <div className="admin-field-box">
                            <span className="admin-field-label">
                              BRANCH CODE
                            </span>
                            <span className="admin-field-value">
                              {overview.customer?.branchCode || '—'}
                            </span>
                          </div>
                          <div className="admin-field-box">
                            <span className="admin-field-label">
                              IFSC CODE
                            </span>
                            <span className="admin-field-value">
                              {overview.customer?.ifscCode || '—'}
                            </span>
                          </div>
                        </div>
                      </section>
                    </div>
                  </div>
                </div>
              )
            )}

            <footer className="dashboard-footer">
              © 2026 Nova Bank ·{' '}
              <span>Customer ID · {customer.customerNumber || customer.id}</span>
            </footer>
          </div>
        </div>
      </div>

      {modal && (
        <ActionDialog
          action={modal}
          onClose={() => {
            setModal('')
            if (['Transfer', 'Payments', 'Support'].includes(activePage))
              setActivePage('Dashboard')
          }}
          initialValues={modal === 'account-application' ? customer : undefined}
          customer={customer}
          customerProfile={
            modal === 'account-application' ? overview?.customer : undefined
          }
          customerAccounts={overview?.accounts || []}
          onSuccess={(result) => {
            if (modal === 'account-application') {
              setOverview((current) =>
                current
                  ? {
                      ...current,
                      application: result,
                      customer: result.customer || current.customer,
                    }
                  : current
              )
              setActivePage('Open Account')
            } else if (['transfer'].includes(modal)) {
              getCustomerOverview(customer)
                .then((data) => setOverview(data))
                .catch((refreshError) => setError(refreshError.message))
            }
          }}
        />
      )}

      {showTransferModal && (
        <TransferModal
          accounts={overview?.accounts || []}
          onClose={closeTransferModal}
          onSuccess={() => {
            getCustomerOverview(customer)
              .then((data) => setOverview(data))
              .catch((err) => setError(err.message))
          }}
        />
      )}

      {showPasswordModal && (
        <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />
      )}

      <TransactionDetailPanel
        transaction={selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
      />
    </>
  )
}