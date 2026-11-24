import { useEffect, useMemo, useState } from 'react'
import {
  acceptLoanAgreement,
  estimateLoan,
  finalizeLoanApplication,
  forecloseLoan,
  getForeclosureQuote,
  getLoanApplication,
  getLoanApplicationHistory,
  getLoanDocuments,
  getLoanPayments,
  getLoanProducts,
  getLoanSchedule,
  getMyLoanAccounts,
  getMyLoanApplications,
  payLoanEmi,
  prepayLoan,
  previewLoanDocument,
  respondToLoanOffer,
  submitEmploymentInfo,
  submitLoanApplication,
  uploadLoanDocument,
} from '../../../../../services/loanApi'
import './CustomerLoanPage.css'

const DOCUMENT_TYPES = [
  'AADHAAR',
  'PAN',
  'SALARY_SLIP',
  'BANK_STATEMENT',
  'BUSINESS_PROOF',
  'EMPLOYMENT_PROOF',
  'INCOME_TAX_RETURN',
  'OTHER',
]
const APPLICATION_STEPS = ['Personal details', 'Loan details', 'Employment', 'Documents']

const money = (value) =>
  value == null
    ? '—'
    : new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 2,
      }).format(Number(value))

const date = (value) => (value ? new Date(value).toLocaleDateString('en-IN') : '—')

const APPLICATION_STATUS_LABELS = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  DETAILS_SUBMITTED: 'Submitted',
  DOCUMENTS_VERIFIED: 'Under review',
  CREDIT_PASSED: 'Under review',
  CREDIT_FAILED: 'Credit assessment complete',
  RECOMMENDED: 'Pending manager approval',
  RETURNED_FOR_REVIEW: 'Returned for review',
  ADDITIONAL_DOCUMENTS_REQUIRED: 'Documents required',
  REJECTED: 'Rejected',
  OFFERED: 'Offer sent',
  OFFER_REJECTED: 'Offer declined',
  OFFER_ACCEPTED: 'Agreement pending',
  AGREEMENT_ACCEPTED: 'Disbursement pending',
  DISBURSEMENT_AUTHORIZED: 'Disbursement processing',
  DISBURSEMENT_PENDING: 'Disbursement pending',
  DISBURSED: 'Disbursed',
  CLOSED: 'Closed',
}
const APPLICATION_PROGRESS = [
  { label: 'Application submitted' },
  { label: 'Officer review' },
  { label: 'Manager decision' },
  { label: 'Offer & agreement' },
  { label: 'Disbursement' },
]
const applicationStatusLabel = (status) =>
  APPLICATION_STATUS_LABELS[status] || String(status || '').replace(/_/g, ' ')

const loanEmi = (amount, annualRate, tenureMonths) => {
  const principal = Number(amount)
  const months = Number(tenureMonths)
  const monthlyRate = Number(annualRate) / 1200
  if (!principal || !months || !Number.isFinite(monthlyRate)) return null
  if (monthlyRate === 0) return principal / months
  return principal * monthlyRate * ((1 + monthlyRate) ** months)
    / (((1 + monthlyRate) ** months) - 1)
}

const loanTerms = (application, products) => {
  const amount = application.recommendedAmount ?? application.requestedAmount
  const rate = application.recommendedInterestRate
    ?? products.find((product) => product.id === application.productId)?.annualInterestRate
  const tenure = application.recommendedTenureMonths ?? application.tenureMonths
  return { amount, rate, tenure, emi: loanEmi(amount, rate, tenure) }
}

const applicationProgressIndex = (status) => {
  if (['DISBURSED', 'CLOSED'].includes(status)) return APPLICATION_PROGRESS.length
  if (['AGREEMENT_ACCEPTED', 'DISBURSEMENT_AUTHORIZED', 'DISBURSEMENT_PENDING'].includes(status)) return 4
  if (['OFFERED', 'OFFER_REJECTED', 'OFFER_ACCEPTED'].includes(status)) return 3
  if (['RECOMMENDED', 'REJECTED'].includes(status)) return 2
  if (['DETAILS_SUBMITTED', 'DOCUMENTS_VERIFIED', 'CREDIT_PASSED', 'CREDIT_FAILED', 'RETURNED_FOR_REVIEW', 'ADDITIONAL_DOCUMENTS_REQUIRED'].includes(status)) return 1
  return 0
}

const paymentId = () =>
  window.crypto?.randomUUID?.() || `loan-${Date.now()}-${Math.random().toString(16).slice(2)}`

function LoanDocumentPreview({ file, onClose }) {
  const url = useMemo(() => (file ? URL.createObjectURL(file) : ''), [file])

  useEffect(() => {
    if (!url) return undefined
    return () => URL.revokeObjectURL(url)
  }, [url])

  if (!file) return null
  return (
    <div className="loan-preview-backdrop" role="presentation" onClick={onClose}>
      <section className="loan-preview-panel" role="dialog" aria-modal="true" aria-label="Document preview" onClick={(event) => event.stopPropagation()}>
        <button className="loan-button loan-button-light" onClick={onClose}>Close preview</button>
        {file.type.startsWith('image/') ? <img src={url} alt="Uploaded loan document" /> : <iframe title="Uploaded loan document" src={url} />}
      </section>
    </div>
  )
}

export default function CustomerLoanPage({ customer }) {
  const [products, setProducts] = useState([])
  const [applications, setApplications] = useState([])
  const [accounts, setAccounts] = useState([])
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [selectedApplication, setSelectedApplication] = useState(null)
  const [documents, setDocuments] = useState([])
  const [applicationHistory, setApplicationHistory] = useState([])
  const [previewFile, setPreviewFile] = useState(null)
  const [selectedAccount, setSelectedAccount] = useState(null)
  const [schedule, setSchedule] = useState([])
  const [payments, setPayments] = useState([])
  const [estimate, setEstimate] = useState(null)
  const [foreclosureQuote, setForeclosureQuote] = useState(null)
  const [form, setForm] = useState({
    amount: '',
    tenureMonths: '',
    purpose: '',
    monthlyIncome: '',
    existingMonthlyEmi: '0',
    employerName: '',
    employmentType: 'SALARIED',
    designation: '',
    workExperienceYears: '',
    businessName: '',
    businessType: '',
    businessVintageYears: '',
    businessAddress: '',
    businessRegistrationNumber: '',
    annualTurnover: '',
  })
  const [documentType, setDocumentType] = useState(DOCUMENT_TYPES[0])
  const [documentFile, setDocumentFile] = useState(null)
  const [documentFiles, setDocumentFiles] = useState({})
  const [applicationStep, setApplicationStep] = useState(0)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [activeLoanSection, setActiveLoanSection] = useState('products')

  const loadOverview = async () => {
    setError('')
    const [availableProducts, myApplications, myAccounts] = await Promise.all([
      getLoanProducts(),
      getMyLoanApplications(),
      getMyLoanAccounts(),
    ])
    setProducts(Array.isArray(availableProducts) ? availableProducts : [])
    setApplications(Array.isArray(myApplications) ? myApplications : [])
    setAccounts(Array.isArray(myAccounts) ? myAccounts : [])
  }

  useEffect(() => {
    let active = true
    Promise.all([getLoanProducts(), getMyLoanApplications(), getMyLoanAccounts()])
      .then(([availableProducts, myApplications, myAccounts]) => {
        if (!active) return
        setProducts(Array.isArray(availableProducts) ? availableProducts : [])
        setApplications(Array.isArray(myApplications) ? myApplications : [])
        setAccounts(Array.isArray(myAccounts) ? myAccounts : [])
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
  }, [])

  const loadSelectedApplication = async (application) => {
    setSelectedApplication(application)
    setError('')
    try {
      const [details, docs, history] = await Promise.all([
        getLoanApplication(application.id),
        getLoanDocuments(application.id),
        getLoanApplicationHistory(application.id),
      ])
      setSelectedApplication(details)
      setActiveLoanSection(details.status === 'DRAFT' ? 'products' : 'applications')
      setDocuments(Array.isArray(docs) ? docs : [])
      setApplicationHistory(Array.isArray(history) ? history : [])
      if (details.status === 'DRAFT') {
        const product = products.find((item) => item.id === details.productId)
        if (product) setSelectedProduct(product)
        setForm((current) => ({
          ...current,
          amount: String(details.requestedAmount ?? ''),
          tenureMonths: String(details.tenureMonths ?? ''),
          purpose: details.purpose || '',
          monthlyIncome: String(details.monthlyIncome ?? ''),
          existingMonthlyEmi: String(details.existingMonthlyEmi ?? 0),
          employerName: details.employerName || '',
          employmentType: details.employmentType || 'SALARIED',
          designation: details.designation || '',
          workExperienceYears: String(details.workExperienceYears ?? ''),
          businessName: details.businessName || '',
          businessType: details.businessType || '',
          businessVintageYears: String(details.businessVintageYears ?? ''),
          businessAddress: details.businessAddress || '',
          businessRegistrationNumber: details.businessRegistrationNumber || '',
          annualTurnover: String(details.annualTurnover ?? ''),
        }))
        setEstimate(null)
        setApplicationStep(3)
      } else if (selectedApplication?.status === 'DRAFT') {
        setSelectedProduct(null)
        setApplicationStep(0)
      }
    } catch (loadError) {
      setError(loadError.message)
    }
  }

  const loadSelectedAccount = async (account) => {
    setActiveLoanSection('accounts')
    setSelectedAccount(account)
    setError('')
    try {
      const [nextSchedule, history] = await Promise.all([
        getLoanSchedule(account.id),
        getLoanPayments(account.id),
      ])
      setSchedule(Array.isArray(nextSchedule) ? nextSchedule : [])
      setPayments(Array.isArray(history) ? history : [])
      setPaymentAmount(String(account.monthlyEmi || ''))
      setForeclosureQuote(null)
    } catch (loadError) {
      setError(loadError.message)
    }
  }

  const updateForm = (key, value) => {
    setEstimate(null)
    setForm((current) => ({ ...current, [key]: value }))
  }

  const employmentPayload = () => ({
    employerName: form.employmentType === 'SALARIED' ? form.employerName : form.businessName,
    employmentType: form.employmentType,
    monthlyIncome: Number(form.monthlyIncome),
    existingMonthlyEmi: Number(form.existingMonthlyEmi || 0),
    designation: form.designation || null,
    workExperienceYears: form.workExperienceYears ? Number(form.workExperienceYears) : null,
    businessName: form.businessName || null,
    businessType: form.businessType || null,
    businessVintageYears: form.businessVintageYears ? Number(form.businessVintageYears) : null,
    businessAddress: form.businessAddress || null,
    businessRegistrationNumber: form.businessRegistrationNumber || null,
    annualTurnover: form.annualTurnover ? Number(form.annualTurnover) : null,
  })

  const runEstimate = async (event) => {
    event.preventDefault()
    if (!selectedProduct) return
    setBusy('estimate')
    setError('')
    setNotice('')
    try {
      const result = await estimateLoan(selectedProduct.id, {
        amount: Number(form.amount),
        tenureMonths: Number(form.tenureMonths),
        monthlyIncome: Number(form.monthlyIncome),
        existingMonthlyEmi: Number(form.existingMonthlyEmi || 0),
      })
      setEstimate(result)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy('')
    }
  }

  const prepareLoanDraft = async () => {
    if (!selectedProduct || !estimate?.eligible) return
    setBusy('draft')
    setError('')
    setNotice('')
    try {
      const application = selectedApplication?.status === 'DRAFT'
        ? selectedApplication
        : await submitLoanApplication({
            productId: selectedProduct.id,
            amount: Number(form.amount),
            tenureMonths: Number(form.tenureMonths),
            purpose: form.purpose.trim(),
          })
      setSelectedApplication(application)
      const updated = await submitEmploymentInfo(application.id, employmentPayload())
      setSelectedApplication(updated)
      setDocuments([])
      setApplicationHistory([])
      setApplicationStep(3)
      setNotice('Your application is saved as a draft. Add the required documents to submit it for review.')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy('')
    }
  }

  const uploadAndSubmitApplication = async (event) => {
    event.preventDefault()
    if (!selectedApplication || selectedApplication.status !== 'DRAFT') return
    setError('')
    setNotice('')
    setBusy('submit')
    try {
      const currentTypes = new Set(documents.map((document) => document.documentType.toUpperCase().replace(/-/g, '_')))
      const hasIncomeEvidence = currentTypes.has('SALARY_SLIP')
        || currentTypes.has('BANK_STATEMENT')
        || documentFiles.SALARY_SLIP
        || documentFiles.BANK_STATEMENT
      if ((!currentTypes.has('AADHAAR') && !documentFiles.AADHAAR)
        || (!currentTypes.has('PAN') && !documentFiles.PAN)
        || !hasIncomeEvidence) {
        throw new Error('Upload Aadhaar, PAN, and either a salary slip or bank statement.')
      }
      const filesToUpload = [
        ['AADHAAR', documentFiles.AADHAAR],
        ['PAN', documentFiles.PAN],
        ['SALARY_SLIP', documentFiles.SALARY_SLIP],
        ['BANK_STATEMENT', documentFiles.BANK_STATEMENT],
      ].filter(([type, file]) => file && !currentTypes.has(type))
      for (const [type, file] of filesToUpload) {
        await uploadLoanDocument(selectedApplication.id, type, file)
      }
      const updatedDocuments = await getLoanDocuments(selectedApplication.id)
      setDocuments(Array.isArray(updatedDocuments) ? updatedDocuments : [])
      const updated = await finalizeLoanApplication(selectedApplication.id)
      setSelectedApplication(updated)
      setSelectedProduct(null)
      setEstimate(null)
      setApplicationStep(0)
      setDocumentFiles({})
      setNotice('Your loan application has been submitted. Track its review and approval below.')
      setApplicationHistory(await getLoanApplicationHistory(updated.id))
      setActiveLoanSection('applications')
      await loadOverview()
    } catch (requestError) {
      setError(requestError.message)
      try {
        const updatedDocuments = await getLoanDocuments(selectedApplication.id)
        setDocuments(Array.isArray(updatedDocuments) ? updatedDocuments : [])
      } catch (documentsError) {
        setError(`${requestError.message} Documents could not be refreshed: ${documentsError.message}`)
      }
    } finally {
      setBusy('')
    }
  }

  const completeEmploymentDetails = async (event) => {
    event.preventDefault()
    if (!selectedApplication) return
    setBusy('employment')
    setError('')
    setNotice('')
    try {
      const updated = await submitEmploymentInfo(selectedApplication.id, employmentPayload())
      setSelectedApplication(updated)
      await loadOverview()
      setNotice('Employment details saved.')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy('')
    }
  }

  const showDocument = async (documentId) => {
    setBusy('preview')
    setError('')
    try {
      setPreviewFile(await previewLoanDocument(documentId))
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy('')
    }
  }

  const uploadDocument = async (event) => {
    event.preventDefault()
    if (!selectedApplication || !documentFile) return
    setBusy('upload')
    setError('')
    setNotice('')
    try {
      await uploadLoanDocument(selectedApplication.id, documentType, documentFile)
      const updatedDocuments = await getLoanDocuments(selectedApplication.id)
      setDocuments(Array.isArray(updatedDocuments) ? updatedDocuments : [])
      setApplicationHistory(await getLoanApplicationHistory(selectedApplication.id))
      setDocumentFile(null)
      event.target.reset()
      setNotice('Document uploaded for review.')
      await loadOverview()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy('')
    }
  }

  const handleOfferResponse = async (accepted) => {
    if (!selectedApplication) return
    setBusy('offer')
    setError('')
    setNotice('')
    try {
      const updated = await respondToLoanOffer(selectedApplication.id, accepted)
      setSelectedApplication(updated)
      setApplicationHistory(await getLoanApplicationHistory(updated.id))
      await loadOverview()
      setNotice(accepted ? 'Offer accepted. Review and accept the agreement below.' : 'Offer rejected.')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy('')
    }
  }

  const acceptAgreement = async () => {
    if (!selectedApplication) return
    setBusy('agreement')
    setError('')
    setNotice('')
    try {
      const updated = await acceptLoanAgreement(selectedApplication.id)
      setSelectedApplication(updated)
      setApplicationHistory(await getLoanApplicationHistory(updated.id))
      await loadOverview()
      setNotice('Agreement accepted. Your loan officer will review disbursement.')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy('')
    }
  }

  const makePayment = async (type) => {
    if (!selectedAccount || !paymentAmount) return
    setBusy(type)
    setError('')
    setNotice('')
    try {
      const request = { paymentId: paymentId(), amount: Number(paymentAmount) }
      const updatedAccount =
        type === 'emi'
          ? await payLoanEmi(selectedAccount.id, request)
          : await prepayLoan(selectedAccount.id, request)
      await loadOverview()
      await loadSelectedAccount(updatedAccount)
      setNotice(type === 'emi' ? 'EMI payment successful.' : 'Prepayment successful.')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy('')
    }
  }

  const getQuote = async () => {
    if (!selectedAccount) return
    setBusy('quote')
    setError('')
    try {
      setForeclosureQuote(await getForeclosureQuote(selectedAccount.id))
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy('')
    }
  }

  const handleForeclosure = async () => {
    if (!selectedAccount || !foreclosureQuote) return
    setBusy('foreclosure')
    setError('')
    setNotice('')
    try {
      const updatedAccount = await forecloseLoan(selectedAccount.id, {
        paymentId: paymentId(),
        amount: Number(foreclosureQuote.outstandingPrincipal),
      })
      setForeclosureQuote(null)
      await loadOverview()
      await loadSelectedAccount(updatedAccount)
      setNotice('Loan closed successfully.')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy('')
    }
  }

  if (loading) return <div className="loan-state">Loading your loan information…</div>

  return (
    <div className="loan-portal">
      <header className="loan-portal-heading loan-portal-heading-modern">
        <div>
          <span className="loan-eyebrow">NOVA BANK · LOAN CENTRE</span>
          <h1>Loans made simple</h1>
          <p>Choose a loan, submit documents, accept the offer, and manage every EMI in one place.</p>
        </div>
        <button className="loan-button loan-button-light loan-refresh-button" onClick={() => loadOverview().catch((e) => setError(e.message))}>
          ↻ <span>Refresh</span>
        </button>
      </header>

      <section className="loan-process-strip" aria-label="Loan application process">
        <div className="loan-process-heading">
          <span className="loan-eyebrow">HOW TO APPLY</span>
          <strong>Complete your loan in 4 easy steps</strong>
        </div>
        <ol>
          <li className={activeLoanSection === 'products' ? 'active' : ''} onClick={() => setActiveLoanSection('products')}>
            <b>1</b><span><strong>Choose a loan</strong><small>Compare plans and EMI</small></span>
          </li>
          <li>
            <b>2</b><span><strong>Add details</strong><small>Income and documents</small></span>
          </li>
          <li>
            <b>3</b><span><strong>Get approval</strong><small>Review and accept offer</small></span>
          </li>
          <li>
            <b>4</b><span><strong>Pay EMI</strong><small>Track account and payments</small></span>
          </li>
        </ol>
      </section>

      <nav className="loan-section-nav loan-section-nav-modern" aria-label="Loan services">
        <button
          type="button"
          className={activeLoanSection === 'products' ? 'active' : ''}
          aria-pressed={activeLoanSection === 'products'}
          onClick={() => setActiveLoanSection('products')}
        >
          <span className="loan-nav-icon">₹</span>
          <span className="loan-nav-copy"><strong>Available loans</strong><small>{products.length} loan options</small></span>
          <span className="loan-nav-arrow">›</span>
        </button>
        <button
          type="button"
          className={activeLoanSection === 'applications' ? 'active' : ''}
          aria-pressed={activeLoanSection === 'applications'}
          onClick={() => setActiveLoanSection('applications')}
        >
          <span className="loan-nav-icon loan-nav-icon-blue">▤</span>
          <span className="loan-nav-copy"><strong>My applications</strong><small>{applications.length} applications</small></span>
          <span className="loan-nav-arrow">›</span>
        </button>
        <button
          type="button"
          className={activeLoanSection === 'accounts' ? 'active' : ''}
          aria-pressed={activeLoanSection === 'accounts'}
          onClick={() => setActiveLoanSection('accounts')}
        >
          <span className="loan-nav-icon loan-nav-icon-green">✓</span>
          <span className="loan-nav-copy"><strong>My loan accounts</strong><small>{accounts.length} active accounts</small></span>
          <span className="loan-nav-arrow">›</span>
        </button>
      </nav>

      {error && <div className="loan-alert loan-alert-error" role="alert">{error}</div>}
      {notice && <div className="loan-alert loan-alert-success" role="status">{notice}</div>}

      {activeLoanSection === 'products' && selectedProduct && (
        <section className="loan-card">
          <div className="loan-section-heading">
            <div>
              <span className="loan-eyebrow">NEW LOAN APPLICATION</span>
              <h2>{selectedProduct.name}</h2>
            </div>
            <button className="loan-text-button" disabled={selectedApplication?.status === 'DRAFT'} onClick={() => { setSelectedProduct(null); setEstimate(null); setApplicationStep(0); setSelectedApplication(null) }}>
              {selectedApplication?.status === 'DRAFT' ? 'Complete your saved draft' : 'Cancel'}
            </button>
          </div>
          <ol className="loan-stepper" aria-label="Loan application steps">
            {APPLICATION_STEPS.map((step, index) => (
              <li className={index === applicationStep ? 'active' : index < applicationStep ? 'complete' : ''} key={step}>
                <span>{index + 1}</span>{step}
              </li>
            ))}
          </ol>
          {applicationStep === 0 && (
            <section className="loan-wizard-panel">
              <h3>Personal details</h3>
              <p className="loan-hint">These details are read from your NOVA Customer Service profile.</p>
              <div className="loan-summary-grid">
                <div><span>Customer ID</span><b>{customer?.customerId || customer?.id || '—'}</b></div>
                <div><span>Full name</span><b>{customer?.name || '—'}</b></div>
                <div><span>Email</span><b>{customer?.email || '—'}</b></div>
                <div><span>Phone</span><b>{customer?.mobileNumber || customer?.phone || '—'}</b></div>
                <div><span>Date of birth</span><b>{customer?.dateOfBirth || '—'}</b></div>
                <div><span>Address</span><b>{customer?.communicationAddress || customer?.permanentAddress || '—'}</b></div>
                <div><span>Customer status</span><b>{customer?.status || '—'}</b></div>
                <div><span>KYC verification</span><b>{customer?.kycStatus || customer?.kycApplicationStatus || 'Checked on submit'}</b></div>
              </div>
              <div className="loan-wizard-actions">
                <button type="button" className="loan-button loan-button-primary" onClick={() => setApplicationStep(1)}>Continue to loan details</button>
              </div>
            </section>
          )}
          {applicationStep === 1 && (
            <section className="loan-wizard-panel">
              <h3>Loan details</h3>
              <div className="loan-form-grid">
                <label>Loan amount (₹)<input type="number" min={selectedProduct.minimumAmount} max={selectedProduct.maximumAmount} required value={form.amount} onChange={(e) => updateForm('amount', e.target.value)} /></label>
                <label>Tenure (months)<input type="number" min={selectedProduct.minimumTenureMonths} max={selectedProduct.maximumTenureMonths} required value={form.tenureMonths} onChange={(e) => updateForm('tenureMonths', e.target.value)} /></label>
                <label className="loan-field-wide">Loan purpose<input required maxLength="500" placeholder="What will you use this loan for?" value={form.purpose} onChange={(e) => updateForm('purpose', e.target.value)} /></label>
              </div>
              <div className="loan-wizard-actions">
                <button type="button" className="loan-button loan-button-light" onClick={() => setApplicationStep(0)}>Back</button>
                <button type="button" className="loan-button loan-button-primary" disabled={!form.amount || !form.tenureMonths || !form.purpose.trim()} onClick={() => setApplicationStep(2)}>Continue to employment</button>
              </div>
            </section>
          )}
          {applicationStep === 2 && (
            <section className="loan-wizard-panel">
              <h3>Employment and income details</h3>
              <form className="loan-form-grid" onSubmit={runEstimate}>
                <label>Employment type<select value={form.employmentType} onChange={(e) => updateForm('employmentType', e.target.value)}><option value="SALARIED">Salaried</option><option value="SELF_EMPLOYED">Self-employed</option></select></label>
                <label>Monthly income (₹)<input type="number" min="1" required value={form.monthlyIncome} onChange={(e) => updateForm('monthlyIncome', e.target.value)} /></label>
                <label>Existing monthly EMIs (₹)<input type="number" min="0" value={form.existingMonthlyEmi} onChange={(e) => updateForm('existingMonthlyEmi', e.target.value)} /></label>
                {form.employmentType === 'SALARIED' ? (
                  <>
                    <label>Company / employer name<input required value={form.employerName} onChange={(e) => updateForm('employerName', e.target.value)} /></label>
                    <label>Designation<input required value={form.designation} onChange={(e) => updateForm('designation', e.target.value)} /></label>
                    <label>Work experience (years)<input type="number" min="0" required value={form.workExperienceYears} onChange={(e) => updateForm('workExperienceYears', e.target.value)} /></label>
                  </>
                ) : (
                  <>
                    <label>Business name<input required value={form.businessName} onChange={(e) => updateForm('businessName', e.target.value)} /></label>
                    <label>Business type<input required value={form.businessType} onChange={(e) => updateForm('businessType', e.target.value)} /></label>
                    <label>Business vintage (years)<input type="number" min="0" required value={form.businessVintageYears} onChange={(e) => updateForm('businessVintageYears', e.target.value)} /></label>
                    <label>Business address<input required value={form.businessAddress} onChange={(e) => updateForm('businessAddress', e.target.value)} /></label>
                    <label>Registration number<input value={form.businessRegistrationNumber} onChange={(e) => updateForm('businessRegistrationNumber', e.target.value)} /></label>
                    <label>Annual turnover (₹)<input type="number" min="1" required value={form.annualTurnover} onChange={(e) => updateForm('annualTurnover', e.target.value)} /></label>
                  </>
                )}
                <div className="loan-form-actions">
                  <button className="loan-button loan-button-light" type="button" onClick={() => setApplicationStep(1)}>Back</button>
                  <button className="loan-button loan-button-primary" disabled={busy === 'estimate'}>{busy === 'estimate' ? 'Calculating…' : 'Calculate EMI & eligibility'}</button>
                </div>
              </form>
              {estimate && (
                <div className="loan-estimate">
                  <div><span>Estimated monthly EMI</span><strong>{money(estimate.monthlyEmi)}</strong></div>
                  <div><span>Estimated FOIR</span><strong>{estimate.estimatedFoirPercent}%</strong></div>
                  <div><span>Maximum eligible EMI</span><strong>{money(estimate.maximumEligibleEmi)}</strong></div>
                  <div><span>Eligibility</span><strong>{estimate.eligible ? 'Eligible' : 'Not eligible at this amount'}</strong></div>
                  <button type="button" className="loan-button loan-button-primary" disabled={!estimate.eligible || busy === 'draft'} onClick={prepareLoanDraft}>
                    {busy === 'draft' ? 'Saving…' : 'Continue to document upload'}
                  </button>
                </div>
              )}
            </section>
          )}
          {applicationStep === 3 && (
            <section className="loan-wizard-panel">
              <h3>Upload required documents</h3>
              <p className="loan-hint">Upload Aadhaar, PAN, and either your latest salary slip or a bank statement. Files must be under 10 MB.</p>
              <form className="loan-document-step" onSubmit={uploadAndSubmitApplication}>
                {['AADHAAR', 'PAN'].map((type) => (
                  <label key={type}>{type.replace(/_/g, ' ')}<input type="file" accept="image/*,.pdf" required={!documents.some((document) => document.documentType.toUpperCase().replace(/-/g, '_') === type)} onChange={(event) => setDocumentFiles((current) => ({ ...current, [type]: event.target.files?.[0] || null }))} /><small>{documents.some((document) => document.documentType.toUpperCase().replace(/-/g, '_') === type) ? 'Already uploaded' : documentFiles[type]?.name || 'Required document'}</small></label>
                ))}
                {['SALARY_SLIP', 'BANK_STATEMENT'].map((type) => (
                  <label key={type}>{type.replace(/_/g, ' ')} (optional alternative)<input type="file" accept="image/*,.pdf" onChange={(event) => setDocumentFiles((current) => ({ ...current, [type]: event.target.files?.[0] || null }))} /><small>{documents.some((document) => document.documentType.toUpperCase().replace(/-/g, '_') === type) ? 'Already uploaded' : documentFiles[type]?.name || 'Upload at least one of salary slip or bank statement'}</small></label>
                ))}
                <div className="loan-submit-review">
                  <h4>Review your application</h4>
                  <div className="loan-summary-grid">
                    <div><span>Customer</span><b>{customer?.name || '—'} · {customer?.customerId || customer?.id || '—'}</b></div>
                    <div><span>Loan purpose</span><b>{form.purpose}</b></div>
                    <div><span>Requested amount</span><b>{money(form.amount)}</b></div>
                    <div><span>Tenure</span><b>{form.tenureMonths} months</b></div>
                    <div><span>Monthly income</span><b>{money(form.monthlyIncome)}</b></div>
                    <div><span>Employment</span><b>{form.employmentType === 'SALARIED' ? `${form.employerName} · ${form.designation}` : `${form.businessName} · ${form.businessType}`}</b></div>
                    {estimate && <div><span>Estimated EMI</span><b>{money(estimate.monthlyEmi)}</b></div>}
                  </div>
                </div>
                <div className="loan-wizard-actions">
                  <button type="button" className="loan-button loan-button-light" disabled={Boolean(selectedApplication?.status === 'DRAFT')} onClick={() => setApplicationStep(2)}>Back</button>
                  <button className="loan-button loan-button-primary" disabled={busy === 'submit'}>{busy === 'submit' ? 'Submitting…' : 'Submit loan application'}</button>
                </div>
              </form>
            </section>
          )}
          <p className="loan-hint">An approved KYC application is required. Your application is shared with the loan team only after all required documents are submitted.</p>
        </section>
      )}

      {activeLoanSection === 'products' && !selectedProduct && (
        <section className="loan-card">
          <div className="loan-section-heading">
            <div><span className="loan-eyebrow">FIND THE RIGHT OPTION</span><h2>Available products</h2></div>
          </div>
          {products.length === 0 ? <p className="loan-empty">No active loan products are available right now.</p> : (
            <div className="loan-product-grid">
              {products.map((product) => (
                <article className="loan-product" key={product.id}>
                  <span className="loan-product-rate">{product.annualInterestRate}% p.a.</span>
                  <h3>{product.name}</h3>
                  <p>{product.description || 'Flexible borrowing for your needs.'}</p>
                  <dl>
                    <div><dt>Loan amount</dt><dd>{money(product.minimumAmount)} – {money(product.maximumAmount)}</dd></div>
                    <div><dt>Tenure</dt><dd>{product.minimumTenureMonths} – {product.maximumTenureMonths} months</dd></div>
                    <div><dt>Maximum FOIR</dt><dd>{product.maximumFoirPercent}%</dd></div>
                  </dl>
                  <button className="loan-button loan-button-primary" onClick={() => {
                    setSelectedProduct(product)
                    setSelectedApplication(null)
                    setApplicationStep(0)
                    setEstimate(null)
                    setDocumentFiles({})
                    setForm((current) => ({ ...current, amount: String(product.minimumAmount), tenureMonths: String(product.minimumTenureMonths) }))
                  }}>Estimate & apply</button>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {activeLoanSection === 'applications' && <section className="loan-card">
        <div className="loan-section-heading"><div><span className="loan-eyebrow">APPLICATION TRACKER</span><h2>My applications</h2></div></div>
        {applications.length === 0 ? <p className="loan-empty">Your submitted loan applications will appear here.</p> : (
          <div className="loan-list">
            {applications.map((application) => (
              <button className={`loan-list-row ${selectedApplication?.id === application.id ? 'selected' : ''}`} key={application.id} onClick={() => loadSelectedApplication(application)}>
                <span><b>{application.id}</b><small>{application.customerName || customer?.name || 'Loan application'} · {money(application.requestedAmount)}</small></span>
                <span className="loan-status">{applicationStatusLabel(application.status)}</span>
              </button>
            ))}
          </div>
        )}
        {selectedApplication && (
          <div className="loan-application-detail loan-customer-detail">
            <div className="loan-detail-heading">
              <div><span className="loan-eyebrow">APPLICATION · {products.find((product) => product.id === selectedApplication.productId)?.name || 'LOAN'}</span><h3>Loan application details</h3><span>{selectedApplication.id} · submitted {date(selectedApplication.createdAt)}</span></div>
              <strong className="loan-status">{applicationStatusLabel(selectedApplication.status)}</strong>
            </div>
            <section className="loan-customer-section">
              <h4>Application summary</h4>
              <div className="loan-customer-facts">
                <div><span>Requested amount</span><b>{money(selectedApplication.requestedAmount)}</b></div>
                <div><span>Loan purpose</span><b>{selectedApplication.purpose || '—'}</b></div>
                <div><span>Requested tenure</span><b>{selectedApplication.tenureMonths} months</b></div>
                <div><span>Application status</span><b>{applicationStatusLabel(selectedApplication.status)}</b></div>
                {selectedApplication.recommendedAmount != null && <div><span>{selectedApplication.status === 'RECOMMENDED' ? 'Officer recommended amount' : 'Sanctioned amount'}</span><b>{money(selectedApplication.recommendedAmount)}</b></div>}
                {selectedApplication.recommendedInterestRate != null && <div><span>Annual interest rate</span><b>{selectedApplication.recommendedInterestRate}% p.a.</b></div>}
                {selectedApplication.recommendedTenureMonths != null && <div><span>Sanctioned tenure</span><b>{selectedApplication.recommendedTenureMonths} months</b></div>}
                {selectedApplication.recommendedAmount != null && selectedApplication.recommendedInterestRate != null && <div><span>Estimated sanctioned EMI</span><b>{money(loanTerms(selectedApplication, products).emi)}</b></div>}
              </div>
            </section>
            <section className="loan-customer-section">
              <h4>Application progress</h4>
              {selectedApplication.status === 'DRAFT' ? (
                <p className="loan-hint">Your application is saved as a draft. Complete the required documents to submit it for review.</p>
              ) : (
                <ol className="loan-customer-progress">
                  {APPLICATION_PROGRESS.map((step, index) => {
                    const activeIndex = applicationProgressIndex(selectedApplication.status)
                    const isCurrent = index === activeIndex && activeIndex < APPLICATION_PROGRESS.length
                    return <li className={`${index < activeIndex ? 'complete' : ''} ${isCurrent ? 'current' : ''}`} key={step.label}><span>{index < activeIndex || activeIndex === APPLICATION_PROGRESS.length ? '✓' : index + 1}</span><b>{step.label}</b></li>
                  })}
                </ol>
              )}
              {selectedApplication.status === 'RETURNED_FOR_REVIEW' && <p className="loan-alert loan-alert-error">Your application was returned for additional review. The loan team will update the application history with next steps.</p>}
              {selectedApplication.status === 'ADDITIONAL_DOCUMENTS_REQUIRED' && <p className="loan-alert loan-alert-error">Additional documents requested: {selectedApplication.additionalDocumentsRequested}</p>}
              {selectedApplication.managerDecisionReason && <p className="loan-hint">Decision note: {selectedApplication.managerDecisionReason}</p>}
              {selectedApplication.recommendationRemarks && <p className="loan-hint">Loan officer note: {selectedApplication.recommendationRemarks}</p>}
              {selectedApplication.status === 'REJECTED' && <p className="loan-alert loan-alert-error">Your application was declined: {selectedApplication.managerDecisionReason || 'Please contact your branch for details.'}</p>}
              {selectedApplication.status === 'CREDIT_FAILED' && <p className="loan-alert loan-alert-error">Your application did not meet the credit assessment criteria.</p>}
            </section>
            <section className="loan-customer-section">
              <h4>Applicant information</h4>
              <div className="loan-customer-facts">
                <div><span>Customer ID</span><b>{selectedApplication.customerId || customer?.customerId || '—'}</b></div>
                <div><span>Full name</span><b>{selectedApplication.customerName || customer?.name || '—'}</b></div>
                <div><span>Email</span><b>{selectedApplication.customerEmail || customer?.email || '—'}</b></div>
                <div><span>Phone</span><b>{selectedApplication.customerPhone || customer?.mobileNumber || '—'}</b></div>
                {customer?.alternateMobileNumber && <div><span>Alternate phone</span><b>{customer.alternateMobileNumber}</b></div>}
                <div><span>KYC verification</span><b>{selectedApplication.kycStatus || '—'}</b></div>
                {customer?.dateOfBirth && <div><span>Date of birth</span><b>{customer.dateOfBirth}</b></div>}
                {customer?.gender && <div><span>Gender</span><b>{customer.gender}</b></div>}
                {customer?.maritalStatus && <div><span>Marital status</span><b>{customer.maritalStatus}</b></div>}
                {customer?.nationality && <div><span>Nationality</span><b>{customer.nationality}</b></div>}
                {customer?.occupation && <div><span>Occupation</span><b>{customer.occupation}</b></div>}
                {customer?.annualIncome != null && <div><span>Annual income on profile</span><b>{money(customer.annualIncome)}</b></div>}
                {customer?.sourceOfIncome && <div><span>Profile income source</span><b>{customer.sourceOfIncome}</b></div>}
                <div><span>Address</span><b>{customer?.communicationAddress || customer?.permanentAddress || '—'}</b></div>
                <div><span>City / state</span><b>{[customer?.communicationCity || customer?.permanentCity, customer?.communicationState || customer?.permanentState].filter(Boolean).join(', ') || '—'}</b></div>
                {customer?.communicationCountry && <div><span>Country</span><b>{customer.communicationCountry}</b></div>}
                {customer?.communicationPinCode && <div><span>PIN code</span><b>{customer.communicationPinCode}</b></div>}
                {customer?.branchName && <div><span>Home branch</span><b>{customer.branchName}</b></div>}
              </div>
            </section>
            <section className="loan-customer-section">
              <h4>Employment and financial details</h4>
              <div className="loan-customer-facts">
                <div><span>Employment type</span><b>{selectedApplication.employmentType || '—'}</b></div>
                <div><span>Monthly income</span><b>{money(selectedApplication.monthlyIncome)}</b></div>
                <div><span>Existing monthly EMIs</span><b>{money(selectedApplication.existingMonthlyEmi)}</b></div>
                <div><span>Employer / business</span><b>{selectedApplication.employerName || selectedApplication.businessName || '—'}</b></div>
                {selectedApplication.designation && <div><span>Designation</span><b>{selectedApplication.designation}</b></div>}
                {selectedApplication.workExperienceYears != null && <div><span>Work experience</span><b>{selectedApplication.workExperienceYears} years</b></div>}
                {selectedApplication.businessType && <div><span>Business type</span><b>{selectedApplication.businessType}</b></div>}
                {selectedApplication.businessVintageYears != null && <div><span>Business vintage</span><b>{selectedApplication.businessVintageYears} years</b></div>}
                {selectedApplication.businessAddress && <div><span>Business address</span><b>{selectedApplication.businessAddress}</b></div>}
                {selectedApplication.annualTurnover != null && <div><span>Annual turnover</span><b>{money(selectedApplication.annualTurnover)}</b></div>}
                {selectedApplication.assessedFoirPercent != null && <div><span>Assessment FOIR</span><b>{selectedApplication.assessedFoirPercent}%</b></div>}
                {selectedApplication.creditPassed != null && <div><span>Credit assessment</span><b>{selectedApplication.creditPassed ? 'Passed' : 'Not approved'}</b></div>}
              </div>
            </section>
            {['RECOMMENDED', 'OFFERED', 'OFFER_ACCEPTED', 'AGREEMENT_ACCEPTED', 'DISBURSEMENT_AUTHORIZED', 'DISBURSEMENT_PENDING', 'DISBURSED', 'CLOSED'].includes(selectedApplication.status) && (
              <section className="loan-customer-section">
                <h4>{selectedApplication.status === 'RECOMMENDED' ? 'Loan officer recommendation' : 'Sanctioned loan terms'}</h4>
                <div className="loan-customer-facts">
                  {selectedApplication.recommendation && <div><span>Recommendation</span><b>{selectedApplication.recommendation}</b></div>}
                  {selectedApplication.recommendationRemarks && <div className="loan-fact-wide"><span>Officer remarks</span><b>{selectedApplication.recommendationRemarks}</b></div>}
                  {selectedApplication.recommendedAmount != null && <div><span>{selectedApplication.status === 'RECOMMENDED' ? 'Recommended amount' : 'Sanctioned amount'}</span><b>{money(selectedApplication.recommendedAmount)}</b></div>}
                  {selectedApplication.recommendedInterestRate != null && <div><span>Annual interest rate</span><b>{selectedApplication.recommendedInterestRate}% p.a.</b></div>}
                  {selectedApplication.recommendedTenureMonths != null && <div><span>Sanctioned tenure</span><b>{selectedApplication.recommendedTenureMonths} months</b></div>}
                  {selectedApplication.recommendedAmount != null && selectedApplication.recommendedInterestRate != null && <div><span>Estimated EMI</span><b>{money(loanTerms(selectedApplication, products).emi)}</b></div>}
                  {selectedApplication.managerDecisionReason && <div className="loan-fact-wide"><span>Branch decision</span><b>{selectedApplication.managerDecisionReason}</b></div>}
                </div>
              </section>
            )}
            {selectedApplication.status === 'SUBMITTED' && (
              <div className="loan-customer-section">
                <h4>Complete employment profile</h4>
                <form className="loan-form-grid loan-employment-form" onSubmit={completeEmploymentDetails}>
                  <label>Monthly income (₹)<input type="number" min="1" required value={form.monthlyIncome} onChange={(e) => updateForm('monthlyIncome', e.target.value)} /></label>
                  <label>Existing monthly EMIs (₹)<input type="number" min="0" value={form.existingMonthlyEmi} onChange={(e) => updateForm('existingMonthlyEmi', e.target.value)} /></label>
                  <label>Employment type<select value={form.employmentType} onChange={(e) => updateForm('employmentType', e.target.value)}><option value="SALARIED">Salaried</option><option value="SELF_EMPLOYED">Self-employed</option></select></label>
                  {form.employmentType === 'SALARIED' ? (
                    <>
                      <label>Company / employer name<input required value={form.employerName} onChange={(e) => updateForm('employerName', e.target.value)} /></label>
                      <label>Designation<input required value={form.designation} onChange={(e) => updateForm('designation', e.target.value)} /></label>
                      <label>Work experience (years)<input type="number" min="0" required value={form.workExperienceYears} onChange={(e) => updateForm('workExperienceYears', e.target.value)} /></label>
                    </>
                  ) : (
                    <>
                      <label>Business name<input required value={form.businessName} onChange={(e) => updateForm('businessName', e.target.value)} /></label>
                      <label>Business type<input required value={form.businessType} onChange={(e) => updateForm('businessType', e.target.value)} /></label>
                      <label>Business vintage (years)<input type="number" min="0" required value={form.businessVintageYears} onChange={(e) => updateForm('businessVintageYears', e.target.value)} /></label>
                      <label>Business address<input required value={form.businessAddress} onChange={(e) => updateForm('businessAddress', e.target.value)} /></label>
                      <label>Registration number<input value={form.businessRegistrationNumber} onChange={(e) => updateForm('businessRegistrationNumber', e.target.value)} /></label>
                      <label>Annual turnover (₹)<input type="number" min="1" required value={form.annualTurnover} onChange={(e) => updateForm('annualTurnover', e.target.value)} /></label>
                    </>
                  )}
                  <button className="loan-button loan-button-primary" disabled={busy === 'employment'}>{busy === 'employment' ? 'Saving…' : 'Save employment details'}</button>
                </form>
              </div>
            )}
            {['DETAILS_SUBMITTED', 'ADDITIONAL_DOCUMENTS_REQUIRED', 'RETURNED_FOR_REVIEW'].includes(selectedApplication.status) && (
              <form className="loan-upload-form" onSubmit={uploadDocument}>
                <label>Document type<select value={documentType} onChange={(e) => setDocumentType(e.target.value)}>{DOCUMENT_TYPES.map((type) => <option key={type} value={type}>{type.replace(/_/g, ' ')}</option>)}</select></label>
                <label>Choose document (max 10 MB)<input type="file" required onChange={(e) => setDocumentFile(e.target.files?.[0] || null)} /></label>
                <button className="loan-button loan-button-primary" disabled={busy === 'upload' || !documentFile}>{busy === 'upload' ? 'Uploading…' : 'Upload document'}</button>
              </form>
            )}
            {['DETAILS_SUBMITTED', 'ADDITIONAL_DOCUMENTS_REQUIRED', 'RETURNED_FOR_REVIEW'].includes(selectedApplication.status) && (
              <p className="loan-hint">Required: Aadhaar, PAN, and either a salary slip or bank statement.</p>
            )}
            <section className="loan-customer-section">
              <h4>Supporting documents</h4>
              {documents.length === 0 ? <p className="loan-hint">No documents uploaded yet.</p> : (
                <div className="loan-customer-documents">{documents.map((document) => (
                  <div key={document.id}>
                    <span><b>{document.documentType.replace(/_/g, ' ')}</b><small>{document.originalFileName}</small></span>
                    <span className={`loan-doc-status ${document.verified ? 'verified' : ''}`}>{document.verified ? 'VERIFIED' : 'UNDER REVIEW'}</span>
                    <button className="loan-text-button" disabled={busy === 'preview'} onClick={() => showDocument(document.id)}>{busy === 'preview' ? 'Loading…' : 'Preview'}</button>
                  </div>
                ))}</div>
              )}
            </section>
            <LoanDocumentPreview file={previewFile} onClose={() => setPreviewFile(null)} />
            {selectedApplication.status === 'OFFERED' && (
              <div className="loan-offer">
                <h4>Your loan offer</h4>
                <p>Sanctioned principal: <b>{money(loanTerms(selectedApplication, products).amount)}</b> · Tenure: <b>{loanTerms(selectedApplication, products).tenure} months</b> · Interest rate: <b>{loanTerms(selectedApplication, products).rate ?? '—'}% p.a.</b> · Estimated EMI: <b>{money(loanTerms(selectedApplication, products).emi)}</b></p>
                <div className="loan-actions">
                  <button className="loan-button loan-button-primary" disabled={busy === 'offer'} onClick={() => handleOfferResponse(true)}>Accept offer</button>
                  <button className="loan-button loan-button-light" disabled={busy === 'offer'} onClick={() => handleOfferResponse(false)}>Reject offer</button>
                </div>
              </div>
            )}
            {selectedApplication.status === 'OFFER_ACCEPTED' && (
              <div className="loan-agreement">
                <h4>Loan agreement</h4><p>{selectedApplication.agreementText || 'Agreement will be shown after accepting the offer.'}</p>
                <h4>Key Fact Statement (KFS)</h4><p>{selectedApplication.keyFactStatement || 'KFS will be shown after accepting the offer.'}</p>
                <button className="loan-button loan-button-primary" disabled={busy === 'agreement'} onClick={acceptAgreement}>{busy === 'agreement' ? 'Saving…' : 'Accept agreement'}</button>
              </div>
            )}
            {applicationHistory.length > 0 && (
              <section className="loan-summary-section">
                <h4>Application progress</h4>
                <ol className="loan-timeline">
                  {applicationHistory.map((entry) => (
                    <li key={entry.id}>
                      <b>{String(entry.action).replace(/_/g, ' ')}</b>
                      <span>{entry.remarks || entry.currentStatus}</span>
                      <small>{date(entry.createdAt)} · {entry.actorId || 'You'}</small>
                    </li>
                  ))}
                </ol>
              </section>
            )}
            {['AGREEMENT_ACCEPTED', 'DISBURSEMENT_PENDING'].includes(selectedApplication.status) && <p className="loan-hint">Your agreement is complete. A loan officer is verifying the beneficiary account and preparing the fund transfer.</p>}
            {selectedApplication.status === 'DISBURSED' && <p className="loan-hint">Your loan is disbursed. Manage repayments in My loan accounts below.</p>}
          </div>
        )}
      </section>}

      {activeLoanSection === 'accounts' && <section className="loan-card">
        <div className="loan-section-heading"><div><span className="loan-eyebrow">AFTER DISBURSEMENT</span><h2>My loan accounts</h2></div></div>
        {accounts.length === 0 ? <p className="loan-empty">Your loan account and repayment schedule appear here after disbursement.</p> : (
          <div className="loan-list">
            {accounts.map((account) => (
              <button className={`loan-list-row ${selectedAccount?.id === account.id ? 'selected' : ''}`} key={account.id} onClick={() => loadSelectedAccount(account)}>
                <span><b>{account.id}</b><small>Outstanding {money(account.outstandingPrincipal)} · EMI {money(account.monthlyEmi)}</small></span>
                <span className="loan-status">{account.closed ? 'CLOSED' : account.status || 'ACTIVE'}</span>
              </button>
            ))}
          </div>
        )}
        {selectedAccount && (
          <div className="loan-account-detail">
            <div className="loan-summary-grid">
              <div><span>Principal</span><b>{money(selectedAccount.principal)}</b></div>
              <div><span>Outstanding</span><b>{money(selectedAccount.outstandingPrincipal)}</b></div>
              <div><span>Monthly EMI</span><b>{money(selectedAccount.monthlyEmi)}</b></div>
              <div><span>Interest rate</span><b>{selectedAccount.annualInterestRate}%</b></div>
            </div>
            {selectedAccount.status === 'PENDING_DISBURSEMENT' && <p className="loan-hint">Your loan account is created and awaiting successful fund transfer. Repayments will be available once it is active.</p>}
            {!selectedAccount.closed && selectedAccount.status !== 'PENDING_DISBURSEMENT' && (
              <div className="loan-repayment">
                <label>Payment amount (₹)<input type="number" min="0.01" step="0.01" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} /></label>
                <div className="loan-actions">
                  <button className="loan-button loan-button-primary" disabled={Boolean(busy)} onClick={() => makePayment('emi')}>{busy === 'emi' ? 'Paying…' : 'Pay EMI'}</button>
                  <button className="loan-button loan-button-light" disabled={Boolean(busy)} onClick={() => makePayment('prepay')}>{busy === 'prepay' ? 'Paying…' : 'Make prepayment'}</button>
                  <button className="loan-button loan-button-light" disabled={Boolean(busy)} onClick={getQuote}>{busy === 'quote' ? 'Loading…' : 'Get foreclosure quote'}</button>
                </div>
                {foreclosureQuote && <div className="loan-quote"><span>Payoff amount: <b>{money(foreclosureQuote.outstandingPrincipal)}</b></span><button className="loan-button loan-button-primary" disabled={busy === 'foreclosure'} onClick={handleForeclosure}>{busy === 'foreclosure' ? 'Closing…' : 'Pay and close loan'}</button></div>}
              </div>
            )}
            <div className="loan-table-section">
              <h3>Repayment schedule</h3>
              {schedule.length === 0 ? <p className="loan-empty">No repayment schedule found.</p> : <div className="loan-table-scroll"><table><thead><tr><th>Installment</th><th>Due date</th><th>Amount due</th><th>Paid</th><th>Status</th></tr></thead><tbody>{schedule.map((row) => <tr key={row.id}><td>{row.installmentNumber}</td><td>{date(row.dueDate)}</td><td>{money(row.amountDue)}</td><td>{money(row.amountPaid)}</td><td>{row.status}</td></tr>)}</tbody></table></div>}
            </div>
            <div className="loan-table-section">
              <h3>Payment history</h3>
              {payments.length === 0 ? <p className="loan-empty">No payments have been made yet.</p> : <div className="loan-table-scroll"><table><thead><tr><th>Date</th><th>Type</th><th>Amount</th><th>Outstanding after payment</th></tr></thead><tbody>{payments.map((payment) => <tr key={payment.id}><td>{date(payment.paidAt)}</td><td>{payment.paymentType}</td><td>{money(payment.amount)}</td><td>{money(payment.outstandingAfterPayment)}</td></tr>)}</tbody></table></div>}
            </div>
          </div>
        )}
      </section>}
    </div>
  )
}