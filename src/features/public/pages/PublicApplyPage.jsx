import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Brand from '../../../shared/components/Brand'
import Icon from '../../../shared/components/Icon'
import {
  getActiveBranches,
  submitPublicApplication,
}
 from '../../../services/bankingService'
import { isApiConfigured } from '../../../services/apiClient'
import './PublicApplyPage.css'

const maxDocumentSize = 10 * 1024 * 1024
const acceptedDocumentTypes = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
])

const OPENING_BALANCE_BY_TYPE = {
  SAVINGS: 1000,
  CURRENT: 10000,
}

const defaultForm = {
  title: 'MR',
  name: '',
  email: '',
  phone: '',
  alternateMobileNumber: '',
  dateOfBirth: '',
  gender: 'MALE',
  nationality: 'Indian',
  maritalStatus: 'SINGLE',
  language: '',
  accountType: 'SAVINGS',
  currency: 'INR',
  openingBalance: OPENING_BALANCE_BY_TYPE.SAVINGS,
  preferredBranchCode: '',
  permanentAddress: '',
  permanentCity: '',
  permanentState: '',
  permanentCountry: 'India',
  permanentPinCode: '',
  communicationAddress: '',
  communicationCity: '',
  communicationState: '',
  communicationCountry: '',
  communicationPinCode: '',
  occupation: '',
  annualIncome: '',
  sourceOfIncome: '',
  aadhaarNumber: '',
  panNumber: '',
}

export default function PublicApplyPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState(defaultForm)
  const [sameAddress, setSameAddress] = useState(false)
  const [step, setStep] = useState(1)
  const [aadhaarFile, setAadhaarFile] = useState(null)
  const [panFile, setPanFile] = useState(null)
  const [profileImage, setProfileImage] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [branches, setBranches] = useState([])
  const [branchesLoading, setBranchesLoading] = useState(true)
  const [result, setResult] = useState(null)

  const [fieldErrors, setFieldErrors] = useState({})

  const formRef = useRef(null)
  const topRef = useRef(null)

  useEffect(() => {
    let active = true
    setBranchesLoading(true)
    getActiveBranches()
      .then((list) => {
        if (!active) return
        setBranches(list || [])
        setForm((current) => ({
          ...current,
          preferredBranchCode:
            current.preferredBranchCode || list?.[0]?.branchCode || '',
        }))
      })
      .catch((err) => {
        if (active) setError(err.message || 'Could not load branches.')
      })
      .finally(() => {
        if (active) setBranchesLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const validateField = (name, value) => {
    let errorMsg = ''

    if (name === 'phone' || name === 'alternateMobileNumber') {
      if (value.length > 0 && value.length < 10) {
        errorMsg = 'Mobile number must be exactly 10 digits.'
      }
    }

    if (name === 'aadhaarNumber') {
      if (value.length > 0 && value.length < 12) {
        errorMsg = 'Aadhaar number must be exactly 12 digits.'
      }
    }

    if (name === 'panNumber') {
      const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/
      if (value.length > 0 && value.length < 10) {
        errorMsg = 'PAN must be 10 characters (e.g. ABCDE1234F).'
      } else if (value.length === 10 && !panRegex.test(value)) {
        errorMsg = 'Invalid PAN format. (e.g. ABCDE1234F).'
      }
    }

    setFieldErrors((prev) => ({ ...prev, [name]: errorMsg }))
    return errorMsg
  }

  const setField = (key, value) => {
    setForm((current) => {
      const newForm = { ...current, [key]: value }

      if (key === 'accountType') {
        newForm.openingBalance =
          OPENING_BALANCE_BY_TYPE[value] ?? OPENING_BALANCE_BY_TYPE.SAVINGS
      }

      if (sameAddress && key.startsWith('permanent')) {
        const commKey = key.replace('permanent', 'communication')
        newForm[commKey] = value
      }
      return newForm
    })

    if (['phone', 'alternateMobileNumber', 'aadhaarNumber', 'panNumber'].includes(key)) {
      validateField(key, value)
    }
  }

  const handleSameAddressToggle = (e) => {
    const checked = e.target.checked
    setSameAddress(checked)
    if (checked) {
      setForm((current) => ({
        ...current,
        communicationAddress: current.permanentAddress,
        communicationCity: current.permanentCity,
        communicationState: current.permanentState,
        communicationCountry: current.permanentCountry,
        communicationPinCode: current.permanentPinCode,
      }))
    } else {
      setForm((current) => ({
        ...current,
        communicationAddress: '',
        communicationCity: '',
        communicationState: '',
        communicationCountry: '',
        communicationPinCode: '',
      }))
    }
  }

  function validateCurrentStep() {
    const formEl = formRef.current
    if (!formEl) return true

    // Native required-field validation for the visible step only
    const stepEl = formEl.querySelector(`[data-step="${step}"]`)
    const fields = stepEl
      ? stepEl.querySelectorAll('input, select, textarea')
      : formEl.querySelectorAll('input, select, textarea')

    const allValid = Array.from(fields).every((field) => {
      if (field.disabled) return true
      if (field.required && !field.checkValidity()) return false
      return true
    })

    if (!allValid) {
      setError('Please fill out all required fields correctly.')
      return false
    }

    const activeErrors = Object.values(fieldErrors).filter(Boolean)
    if (activeErrors.length > 0) {
      setError('Please fix the errors in the form before continuing.')
      return false
    }

    if (step === 3) {
      for (const [label, file] of [
        ['Aadhaar document', aadhaarFile],
        ['PAN document', panFile],
      ]) {
        if (!file) {
          setError(`Please upload your ${label}.`)
          return false
        }
        if (file.size > maxDocumentSize) {
          setError(`${label} must be 10 MB or smaller.`)
          return false
        }
        if (!acceptedDocumentTypes.has(file.type)) {
          setError(`${label} must be a PDF, PNG or JPG file.`)
          return false
        }
      }

      if (form.aadhaarNumber.length !== 12) {
        setError('Please enter a valid 12-digit Aadhaar number.')
        return false
      }
      if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(form.panNumber)) {
        setError('Please enter a valid PAN (e.g. ABCDE1234F).')
        return false
      }
    }
    return true
  }

  function handleContinue(event) {
    event.preventDefault()
    setError('')
    if (!validateCurrentStep()) return
    setStep((s) => s + 1)
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function handleBack() {
    setError('')
    setStep((s) => s - 1)
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    if (!validateCurrentStep()) return

    setLoading(true)
    try {
      const payload = new FormData()
      Object.entries(form).forEach(([key, value]) => {
        payload.set(key, value ?? '')
      })
      payload.set('aadhaarFile', aadhaarFile)
      payload.set('panFile', panFile)

      if (profileImage) {
        payload.set('profileImage', profileImage)
      }

      const response = await submitPublicApplication(payload)
      setResult(response)
      topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } catch (err) {
      setError(err.message || 'Could not submit your application.')
    } finally {
      setLoading(false)
    }
  }

  // ── SUCCESS SCREEN ──────────────────────────────────────────────
  if (result) {
  return (
    <main className="apply-app" style={{ backgroundColor: '#f1f5f9', minHeight: '100vh' }}>
      <div className="apply-topbar">
        <button className="apply-brand" type="button" onClick={() => navigate('/')}>
          <Brand />
        </button>
        <button className="back-home" onClick={() => navigate('/')}>
          <Icon name="arrowRight" size={15} style={{ transform: 'rotate(180deg)' }} /> Back to Nova Bank
        </button>
      </div>

      <div className="apply-layout-wide" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 60px)', padding: '1rem' }}>
        
        {/* Modern Card Container */}
        <section 
          className="apply-success" 
          style={{ 
            background: '#ffffff', 
            padding: '0', 
            borderRadius: '16px', 
            textAlign: 'center', 
            maxWidth: '480px', 
            width: '100%',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 10px 10px -5px rgba(0, 0, 0, 0.02)', 
            border: '1px solid #e2e8f0',
            overflow: 'hidden'
          }}
        >
          {/* Top Colorful Gradient Bar */}
          <div style={{ height: '6px', width: '100%', background: 'linear-gradient(90deg, #6366f1, #a855f7, #ec4899)' }} />

          <div style={{ padding: '2.5rem 2rem' }}>
            
            {/* Animated Success Icon */}
            <div className="apply-success-icon" style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              backgroundColor: '#ecfdf5', 
              color: '#10b981', 
              padding: '1rem', 
              borderRadius: '50%',
              border: '2px solid #d1fae5',
              marginBottom: '1.5rem',
              boxShadow: '0 0 0 8px rgba(16, 185, 129, 0.05)'
            }}>
              <Icon name="check" size={36} strokeWidth={3} />
            </div>

            <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1e293b', margin: '0 0 0.5rem 0' }}>Application Received</h1>
            <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '0 0 2rem 0', lineHeight: '1.5' }}>
              Thank you. Your Nova Bank account application has been submitted for review.
            </p>

            {/* Styled Details Box */}
            <div className="apply-success-card" style={{ 
              background: '#f8fafc', 
              border: '1px solid #e2e8f0', 
              borderRadius: '12px', 
              padding: '1rem 1.25rem', 
              marginBottom: '1.5rem',
              textAlign: 'left'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.75rem', borderBottom: '1px dashed #cbd5e1' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: '500', color: '#64748b' }}>Reference ID</span>
                <b style={{ fontSize: '0.85rem', fontWeight: '700', color: '#4f46e5', backgroundColor: '#e0e7ff', padding: '0.25rem 0.5rem', borderRadius: '6px', letterSpacing: '0.5px' }}>
                  {result.id || result.customerId || '—'}
                </b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: '500', color: '#64748b' }}>Status</span>
                <b className="apply-status-pill" style={{ 
                  fontSize: '0.75rem', 
                  fontWeight: '700', 
                  color: '#b45309', 
                  backgroundColor: '#fef3c7', 
                  padding: '0.25rem 0.75rem', 
                  borderRadius: '999px',
                  textTransform: 'uppercase',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}>
                  {result.status || 'KYC PENDING'}
                </b>
              </div>
            </div>

            <p className="apply-success-note" style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: '1.6', marginBottom: '2rem', padding: '0 0.5rem' }}>
              {isApiConfigured
                ? 'Once our team verifies your KYC and opens your account, we will email your username and password. You can then log in from the Nova Bank home page.'
                : 'Demo preview only — no real data was stored.'}
            </p>

            {/* Modernized Buttons */}
            <div className="apply-success-actions" style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button 
                className="button button-primary" 
                onClick={() => navigate('/')}
                style={{ 
                  flex: 1, 
                  minWidth: '140px',
                  padding: '0.75rem 1rem', 
                  borderRadius: '10px', 
                  fontWeight: '600',
                  backgroundColor: '#4f46e5',
                  color: '#ffffff',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.2)',
                  transition: 'all 0.2s'
                }}
              >
                Back to home
              </button>
              <button 
                className="button button-secondary" 
                onClick={() => navigate('/login')}
                style={{ 
                  flex: 1, 
                  minWidth: '140px',
                  padding: '0.75rem 1rem', 
                  borderRadius: '10px', 
                  fontWeight: '600',
                  backgroundColor: '#ffffff',
                  color: '#334155',
                  border: '1px solid #e2e8f0',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Go to login
              </button>
            </div>
            
          </div>
        </section>
      </div>
    </main>
  )
}

  // ── FORM SCREEN ────────────────────────────────────────────────
  return (
    <main className="apply-app">
      <div className="apply-topbar">
        <button className="apply-brand" type="button" onClick={() => navigate('/')}>
          <Brand />
        </button>
        <button className="back-home" onClick={() => navigate('/')}>
          <Icon name="arrowRight" size={15} style={{ transform: 'rotate(180deg)' }} /> Back to Home
        </button>
      </div>

      <div className="apply-layout-wide" ref={topRef}>
        {/* SIDEBAR */}
        <aside className="apply-sidebar">
          <div className="sidebar-content">
            <h1>Welcome to<br /><span>Nova Bank</span></h1>
            <p className="tagline">Secure. Simple. Smart.</p>

            <div className="sidebar-features">
              <div className="feature">
                <span className="feature-icon">🛡️</span>
                <div>
                  <h4>Bank with Confidence</h4>
                  <p>Your data is protected by bank-grade encryption.</p>
                </div>
              </div>
              <div className="feature">
                <span className="feature-icon">⚡</span>
                <div>
                  <h4>Fast &amp; Easy Onboarding</h4>
                  <p>Open your account in just a few simple steps.</p>
                </div>
              </div>
              <div className="feature">
                <span className="feature-icon">🎧</span>
                <div>
                  <h4>24/7 Support</h4>
                  <p>We're always here to help you with your financial journey.</p>
                </div>
              </div>
            </div>

            <div className="sidebar-footer">
              <p>Your Dreams.<br />Our Commitment.</p>
            </div>
          </div>
        </aside>

        {/* FORM */}
        <form
          ref={formRef}
          className="apply-form-compact"
          onSubmit={step === 3 ? handleSubmit : handleContinue}
          noValidate
        >
          <div className="apply-form-header">
            <h2>Open your Nova Bank Account</h2>
            <span>Please fill all required (*) fields.</span>
          </div>

          <div className="apply-steps-header">
            <div className={`apply-step-title ${step >= 1 ? 'active' : ''}`}>
              <span>1</span> Personal details
            </div>
            <div className={`apply-step-divider ${step >= 2 ? 'active' : ''}`} />
            <div className={`apply-step-title ${step >= 2 ? 'active' : ''}`}>
              <span>2</span> Address &amp; account
            </div>
            <div className={`apply-step-divider ${step >= 3 ? 'active' : ''}`} />
            <div className={`apply-step-title ${step >= 3 ? 'active' : ''}`}>
              <span>3</span> Identity documents
            </div>
          </div>

          {/* STEP 1 */}
          {step === 1 && (
            <div className="apply-section fade-in" data-step="1">
              <div className="apply-grid-3">
                <label className="form-label">
                  <span>Title <b className="req">*</b></span>
                  <select value={form.title} onChange={(e) => setField('title', e.target.value)} required>
                    <option value="MR">Mr</option>
                    <option value="MS">Ms</option>
                    <option value="MRS">Mrs</option>
                    <option value="DR">Dr</option>
                  </select>
                </label>

                <label className="form-label apply-span-2">
                  <span>Full name (as on ID) <b className="req">*</b></span>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setField('name', e.target.value)}
                    placeholder="As shown on your ID"
                  />
                </label>

                <label className="form-label">
                  <span>Date of birth <b className="req">*</b></span>
                  <input type="date" required max={new Date().toISOString().slice(0, 10)} value={form.dateOfBirth} onChange={(e) => setField('dateOfBirth', e.target.value)} />
                </label>

                <label className="form-label">
                  <span>Gender <b className="req">*</b></span>
                  <select value={form.gender} onChange={(e) => setField('gender', e.target.value)} required>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </label>

                <label className="form-label apply-span-2">
                  <span>Email <b className="req">*</b></span>
                  <input type="email" required value={form.email} onChange={(e) => setField('email', e.target.value)} placeholder="you@example.com" />
                </label>

                <label className="form-label">
                  <span>Mobile number <b className="req">*</b></span>
                  <input
                    type="tel"
                    required
                    inputMode="numeric"
                    value={form.phone}
                    onChange={(e) => setField('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="10 digits"
                    style={{ borderColor: fieldErrors.phone ? '#ef4444' : undefined }}
                  />
                  {fieldErrors.phone && <small className="field-error-text">{fieldErrors.phone}</small>}
                </label>

                <label className="form-label">
                  <span>Alt mobile</span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={form.alternateMobileNumber}
                    onChange={(e) => setField('alternateMobileNumber', e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="10 digits"
                    style={{ borderColor: fieldErrors.alternateMobileNumber ? '#ef4444' : undefined }}
                  />
                  {fieldErrors.alternateMobileNumber && <small className="field-error-text">{fieldErrors.alternateMobileNumber}</small>}
                </label>

                <label className="form-label">
                  <span>Nationality <b className="req">*</b></span>
                  <input required value={form.nationality} onChange={(e) => setField('nationality', e.target.value)} />
                </label>

                <label className="form-label">
                  <span>Marital status <b className="req">*</b></span>
                  <select value={form.maritalStatus} onChange={(e) => setField('maritalStatus', e.target.value)} required>
                    <option value="SINGLE">Single</option>
                    <option value="MARRIED">Married</option>
                    <option value="DIVORCED">Divorced</option>
                    <option value="WIDOWED">Widowed</option>
                  </select>
                </label>

                <label className="form-label">
                  <span>Language</span>
                  <input value={form.language} onChange={(e) => setField('language', e.target.value)} placeholder="e.g. Hindi" />
                </label>

                <label className="form-label apply-span-3">
                  <span>Profile photo</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg"
                    onChange={(e) => setProfileImage(e.target.files?.[0] || null)}
                  />
                  <small className="field-help-text" style={{ display: 'block', marginTop: '4px' }}>
                    Optional. JPG or PNG, up to 10 MB.
                  </small>
                </label>
              </div>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="apply-section fade-in" data-step="2">
              <div className="apply-grid-3">
                <label className="form-label">
                  <span>Account type <b className="req">*</b></span>
                  <select value={form.accountType} onChange={(e) => setField('accountType', e.target.value)} required>
                    <option value="SAVINGS">Savings account</option>
                    <option value="CURRENT">Current account</option>
                  </select>
                </label>
                <label className="form-label">
                  <span>Currency <b className="req">*</b></span>
                  <select value={form.currency} onChange={(e) => setField('currency', e.target.value)} required>
                    <option value="INR">INR</option>
                  </select>
                </label>
                <label className="form-label">
                  <span>Branch <b className="req">*</b></span>
                  <select required value={form.preferredBranchCode} onChange={(e) => setField('preferredBranchCode', e.target.value)} disabled={branchesLoading}>
                    <option value="" disabled>{branchesLoading ? 'Loading…' : 'Select a branch'}</option>
                    {branches.map((b) => (
                      <option key={b.branchCode} value={b.branchCode}>
                        {b.branchName} {b.city ? `— ${b.city}` : ''}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="form-label">
                  <span>Opening balance (INR)</span>
                  <input
                    readOnly
                    value={`₹ ${Number(form.openingBalance).toLocaleString('en-IN')}`}
                  />
                  <small className="field-help-text">
                    Auto-set: Savings = ₹1,000 · Current = ₹10,000
                  </small>
                </label>

                <label className="form-label apply-span-2">
                  <span>Permanent Address <b className="req">*</b></span>
                  <input required value={form.permanentAddress} onChange={(e) => setField('permanentAddress', e.target.value)} placeholder="House number and street" />
                </label>
                <label className="form-label">
                  <span>City <b className="req">*</b></span>
                  <input required value={form.permanentCity} onChange={(e) => setField('permanentCity', e.target.value)} />
                </label>
                <label className="form-label">
                  <span>State <b className="req">*</b></span>
                  <input required value={form.permanentState} onChange={(e) => setField('permanentState', e.target.value)} />
                </label>
                <label className="form-label">
                  <span>Country <b className="req">*</b></span>
                  <input required value={form.permanentCountry} onChange={(e) => setField('permanentCountry', e.target.value)} />
                </label>
                <label className="form-label">
                  <span>PIN code <b className="req">*</b></span>
                  <input required inputMode="numeric" pattern="[0-9]{4,10}" value={form.permanentPinCode} onChange={(e) => setField('permanentPinCode', e.target.value.replace(/\D/g, ''))} />
                </label>

                <div className="apply-checkbox-wrapper apply-span-3">
                  <label className="apply-checkbox-label">
                    <input type="checkbox" checked={sameAddress} onChange={handleSameAddressToggle} />
                    Communication Address is same as Permanent Address
                  </label>
                </div>

                <label className="form-label apply-span-2">
                  <span>Communication Address</span>
                  <input value={form.communicationAddress} onChange={(e) => setField('communicationAddress', e.target.value)} disabled={sameAddress} placeholder="House number and street" />
                </label>
                <label className="form-label">
                  <span>City</span>
                  <input value={form.communicationCity} onChange={(e) => setField('communicationCity', e.target.value)} disabled={sameAddress} />
                </label>
                <label className="form-label">
                  <span>State</span>
                  <input value={form.communicationState} onChange={(e) => setField('communicationState', e.target.value)} disabled={sameAddress} />
                </label>
                <label className="form-label">
                  <span>Country</span>
                  <input value={form.communicationCountry} onChange={(e) => setField('communicationCountry', e.target.value)} disabled={sameAddress} />
                </label>
                <label className="form-label">
                  <span>PIN code</span>
                  <input inputMode="numeric" pattern="[0-9]{4,10}" value={form.communicationPinCode} onChange={(e) => setField('communicationPinCode', e.target.value.replace(/\D/g, ''))} disabled={sameAddress} />
                </label>

                <div className="apply-section-divider apply-span-3" />

                    <div className="form-label apply-span-2">
  <span>OCCUPATION <b className="req">*</b></span>
  <input 
    type="text" 
    required 
    placeholder="Enter your occupation" 
    value={form.occupation} 
    onChange={(e) => setField('occupation', e.target.value)} 
  />
</div>
                <label className="form-label">
                  <span>Annual income (INR) <b className="req">*</b></span>
                  <input required type="number" min="0" step="0.01" value={form.annualIncome} onChange={(e) => setField('annualIncome', e.target.value)} placeholder="Example: 600000" />
                </label>

                <label className="form-label">
                  <span>Source of income <b className="req">*</b></span>
                  <select value={form.sourceOfIncome} onChange={(e) => setField('sourceOfIncome', e.target.value)} required>
                    <option value="" disabled>Select source</option>
                    <option value="SALARY">Salary</option>
                    <option value="BUSINESS">Business</option>
                    <option value="INVESTMENT">Investment</option>
                    <option value="PENSION">Pension</option>
                    <option value="RENTAL_INCOME">Rental income</option>
                    <option value="OTHER">Other</option>
                  </select>
                </label>
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div className="apply-section fade-in" data-step="3">
              <div className="apply-grid-3">
                <label className="form-label">
                  <span>Aadhaar number <b className="req">*</b></span>
                  <input
                    required
                    inputMode="numeric"
                    value={form.aadhaarNumber}
                    onChange={(e) => setField('aadhaarNumber', e.target.value.replace(/\D/g, '').slice(0, 12))}
                    placeholder="12-digit number"
                    style={{ borderColor: fieldErrors.aadhaarNumber ? '#ef4444' : undefined }}
                  />
                  {fieldErrors.aadhaarNumber && <small className="field-error-text">{fieldErrors.aadhaarNumber}</small>}
                </label>

                <label className="form-label">
                  <span>PAN number <b className="req">*</b></span>
                  <input
                    required
                    maxLength={10}
                    value={form.panNumber}
                    onChange={(e) => setField('panNumber', e.target.value.toUpperCase().slice(0, 10))}
                    placeholder="ABCDE1234F"
                    style={{ borderColor: fieldErrors.panNumber ? '#ef4444' : undefined }}
                  />
                  {fieldErrors.panNumber && <small className="field-error-text">{fieldErrors.panNumber}</small>}
                </label>

                <div className="apply-spacer" />

                <label className="form-label">
                  <span>Aadhaar document <b className="req">*</b></span>
                  <input type="file" required accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => setAadhaarFile(e.target.files?.[0] || null)} />
                  <small className="field-help-text">PDF, PNG or JPG · max 10 MB</small>
                </label>
                <label className="form-label">
                  <span>PAN document <b className="req">*</b></span>
                  <input type="file" required accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => setPanFile(e.target.files?.[0] || null)} />
                  <small className="field-help-text">PDF, PNG or JPG · max 10 MB</small>
                </label>
              </div>

              <p className="apply-hint" style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '1rem' }}>
                Your documents are transmitted securely and used only for KYC verification.
              </p>
            </div>
          )}

          {error && <p className="form-error" role="alert" style={{ marginTop: '12px' }}>{error}</p>}

          {/* ACTIONS */}
          <div className="apply-actions" style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginTop: '1.5rem' }}>
            <div>
              {step > 1 ? (
                <button type="button" className="button button-secondary" onClick={handleBack} disabled={loading}>
                  Back
                </button>
              ) : (
                <button type="button" className="button button-secondary" onClick={() => navigate('/')}>
                  Cancel
                </button>
              )}
            </div>
            <button type="submit" className="button button-primary" disabled={loading || branchesLoading}>
              {loading ? 'Submitting…' : step === 3 ? 'Submit Application' : 'Continue'}
              <Icon name={step === 3 ? 'check' : 'arrowRight'} size={16} />
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}