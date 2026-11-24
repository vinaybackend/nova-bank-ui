import { useEffect, useRef, useState } from 'react'
import Icon from '../../shared/components/Icon'
import { getActiveBranches, submitBankingAction } from '../../services/bankingService'
import { isApiConfigured } from '../../services/apiClient'

const actions = {
  'deposit-request': { title: 'Request a cash deposit', description: 'Tell your branch which account will receive the cash. Your balance changes only after a teller or branch manager verifies receipt.', submit: 'Submit deposit request', fields: ['accountNumber', 'amount', 'description'] },
  transfer: { title: 'Transfer money', description: 'Choose one of your accounts, enter the recipient’s account number and amount, then confirm the transfer.', submit: 'Send money', fields: ['fromAccountNumber', 'toAccountNumber', 'amount', 'description'] },
  payment: { title: 'Pay a bill', description: 'Make a secure payment from your Nova account.', submit: 'Continue to payment', fields: ['biller', 'amount'] },
  'account-application': {
    title: 'Open your first account',
    description: 'Enter your personal information, address and account preferences, then provide your Aadhaar and PAN details for KYC review.',
    submit: 'Submit application',
    // NOTE: field renamed from preferredBranchId → preferredBranchCode
    fields: ['title', 'firstName', 'middleName', 'lastName', 'email', 'phone', 'alternateMobileNumber', 'dateOfBirth', 'gender', 'nationality', 'maritalStatus', 'language', 'accountType', 'currency', 'preferredBranchCode', 'permanentAddress', 'permanentCity', 'permanentState', 'permanentCountry', 'permanentPinCode', 'communicationAddress', 'communicationCity', 'communicationState', 'communicationCountry', 'communicationPinCode', 'occupation', 'annualIncome', 'sourceOfIncome', 'aadhaarNumber', 'aadhaarFile', 'panNumber', 'panFile'],
  },
  beneficiary: { title: 'Add a beneficiary', description: 'Save a trusted recipient for your future transfers.', submit: 'Add beneficiary', fields: ['name'] },
  statement: { title: 'Get your statement', description: 'Choose an account and we’ll prepare your latest statement.', submit: 'Prepare statement', fields: ['account'] },
  support: { title: 'How can we help?', description: 'Choose a secure path to continue with Nova Bank.' },
}

const fieldDetails = {
  accountNumber: { label: 'Deposit to', type: 'select' },
  fromAccountNumber: { label: 'Pay from', type: 'select' },
  toAccountNumber: { label: 'Recipient account number', placeholder: 'Enter the destination account number' },
  description: { label: 'Note (optional)', placeholder: 'What is this transfer for?' },
  biller: { label: 'Biller', placeholder: 'Biller name' },
  amount: { label: 'Amount', placeholder: '₹ 0.00', type: 'number' },
  email: { label: 'Email address', placeholder: 'you@example.com', type: 'email' },
  name: { label: 'Recipient name', placeholder: 'Enter full name' },
  title: { label: 'Title', type: 'select', options: ['MR', 'MS', 'MRS', 'DR'] },
  firstName: { label: 'First name', placeholder: 'As shown on your identity document' },
  middleName: { label: 'Middle name (optional)', placeholder: 'Middle name' },
  lastName: { label: 'Last name', placeholder: 'As shown on your identity document' },
  dateOfBirth: { label: 'Date of birth', type: 'date' },
  gender: { label: 'Gender', type: 'select', options: ['MALE', 'FEMALE', 'OTHER'] },
  nationality: { label: 'Nationality', placeholder: 'e.g. Indian' },
  maritalStatus: { label: 'Marital status (optional)', type: 'select', options: ['SINGLE', 'MARRIED'] },
  language: { label: 'Preferred language (optional)', placeholder: 'e.g. Hindi, English' },
  account: { label: 'Account', placeholder: 'Savings account ending 4821' },
  accountType: { label: 'Account type', type: 'select', options: [{ value: 'SAVINGS', label: 'Savings account' }, { value: 'CURRENT', label: 'Current account' }] },
  currency: { label: 'Account currency', type: 'select', options: ['INR'] },
  // NOTE: renamed from preferredBranchId → preferredBranchCode
  preferredBranchCode: { label: 'Branch', type: 'select', help: 'Choose the branch where your new account will be opened.' },
  phone: { label: 'Mobile number', placeholder: '98765 43210', type: 'tel' },
  alternateMobileNumber: { label: 'Alternate mobile number (optional)', placeholder: '10 to 15 digits', type: 'tel' },
  permanentAddress: { label: 'Permanent address', placeholder: 'House number and street' },
  permanentCity: { label: 'City', placeholder: 'City' },
  permanentState: { label: 'State', placeholder: 'State' },
  permanentCountry: { label: 'Country', placeholder: 'Country' },
  permanentPinCode: { label: 'PIN code', placeholder: '6-digit PIN code' },
  communicationAddress: { label: 'Communication address (optional)', placeholder: 'House number and street' },
  communicationCity: { label: 'Communication city (optional)', placeholder: 'City' },
  communicationState: { label: 'Communication state (optional)', placeholder: 'State' },
  communicationCountry: { label: 'Communication country (optional)', placeholder: 'Country' },
  communicationPinCode: { label: 'Communication PIN code (optional)', placeholder: 'PIN code' },
  occupation: { label: 'Occupation (optional)', placeholder: 'Your occupation' },
  annualIncome: { label: 'Annual income in INR (optional)', placeholder: '0.00', type: 'number' },
  sourceOfIncome: { label: 'Source of income (optional)', type: 'select', options: ['SALARY', 'BUSINESS', 'INVESTMENT', 'PENSION', 'RENTAL_INCOME', 'OTHER'] },
  aadhaarNumber: { label: 'Aadhaar number', placeholder: '12-digit Aadhaar number' },
  aadhaarFile: { label: 'Aadhaar document', type: 'file', accept: '.pdf,.png,.jpg,.jpeg', help: 'PDF, PNG or JPG, up to 10 MB.' },
  panNumber: { label: 'PAN number', placeholder: 'ABCDE1234F' },
  panFile: { label: 'PAN document', type: 'file', accept: '.pdf,.png,.jpg,.jpeg', help: 'PDF, PNG or JPG, up to 10 MB.' },
}

const accountActions = new Set(['account-application'])
const maxDocumentSize = 10 * 1024 * 1024
const acceptedDocumentTypes = new Set(['application/pdf', 'image/png', 'image/jpeg'])

export default function ActionDialog({ action, onClose, onSuccess, initialValues = {}, customer, customerProfile, customerAccounts = [] }) {
  const [error, setError] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [application, setApplication] = useState(null)
  const [loading, setLoading] = useState(false)
  const [branches, setBranches] = useState([])
  const [branchesLoading, setBranchesLoading] = useState(() => accountActions.has(action))
  const [step, setStep] = useState(0)
  const [personalDetails, setPersonalDetails] = useState(() => {
    const names = (initialValues.fullName || '').trim().split(/\s+/).filter(Boolean)
    const phone = customerProfile?.mobileNumber || initialValues.phone || ''
    return {
      ...customerProfile,
      ...initialValues,
      firstName: customerProfile?.firstName || names[0] || '',
      lastName: customerProfile?.lastName || names.slice(1).join(' '),
      phone: phone.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, ''),
      title: customerProfile?.title || 'MR',
      nationality: customerProfile?.nationality || 'Indian',
      permanentCountry: customerProfile?.permanentCountry || 'India',
      currency: customerProfile?.currency || 'INR',
      // NOTE: rename here too
      preferredBranchCode: customerProfile?.preferredBranchCode || initialValues.preferredBranchCode || '',
    }
  })
  const formRef = useRef(null)
  const content = actions[action] || actions.support
  const transferableAccounts = customerAccounts.filter((account) => account.status === 'ACTIVE')

  // NOTE: now matches by branchCode
  const selectedBranch = branches.find(
    (branch) => String(branch.branchCode) === String(personalDetails.preferredBranchCode)
  )

  const applicationSteps = [
    { title: 'Personal details', fields: ['title', 'firstName', 'middleName', 'lastName', 'email', 'phone', 'alternateMobileNumber', 'dateOfBirth', 'gender', 'nationality', 'maritalStatus', 'language'] },
    // NOTE: renamed field in step 2
    { title: 'Address & account', fields: ['accountType', 'currency', 'preferredBranchCode', 'permanentAddress', 'permanentCity', 'permanentState', 'permanentCountry', 'permanentPinCode', 'communicationAddress', 'communicationCity', 'communicationState', 'communicationCountry', 'communicationPinCode', 'occupation', 'annualIncome', 'sourceOfIncome'] },
    { title: 'Identity documents', fields: ['aadhaarNumber', 'aadhaarFile', 'panNumber', 'panFile'] },
  ]

  useEffect(() => {
    if (!accountActions.has(action)) return undefined
    let active = true
    getActiveBranches()
      .then((availableBranches) => {
        if (!active) return
        setBranches(availableBranches)
        setPersonalDetails((current) => ({
          ...current,
          // NOTE: use branchCode, not id
          preferredBranchCode:
            current.preferredBranchCode || availableBranches[0]?.branchCode || '',
        }))
        if (!availableBranches.length) {
          setError('No active branches are available for account opening.')
        }
      })
      .catch((branchError) => {
        if (active) setError(branchError.message)
      })
      .finally(() => {
        if (active) setBranchesLoading(false)
      })

    return () => { active = false }
  }, [action])

  function handleNextStep() {
    // NOTE: renamed field
    if (applicationSteps[step].fields.includes('preferredBranchCode') && !branches.length) {
      setError('No active branches are available for account opening.')
      return
    }
    const form = formRef.current
    const fields = form?.querySelectorAll('input, select, textarea')
    const valid = fields && Array.from(fields).every((field) => field.reportValidity())
    if (!valid) return
    const stepFields = applicationSteps[step].fields.filter((field) => !field.endsWith('File'))
    const formData = new FormData(form)
    const values = Object.fromEntries(stepFields.map((field) => [field, formData.get(field)]))
    setPersonalDetails((current) => ({ ...current, ...values }))
    setError('')
    setStep((current) => current + 1)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    const form = event.currentTarget
    if (accountActions.has(action) && step < applicationSteps.length - 1) {
      handleNextStep()
      return
    }
    const fields = accountActions.has(action) ? form.querySelectorAll('select, input') : []
    const valid = Array.from(fields).every((field) => field.reportValidity())
    if (!valid) return

    setLoading(true)
    const formData = new FormData(form)
    if (accountActions.has(action)) {
      for (const field of applicationSteps[step].fields.filter((name) => name.endsWith('File'))) {
        const document = formData.get(field)
        if (!(document instanceof File) || document.size > maxDocumentSize || !acceptedDocumentTypes.has(document.type)) {
          setError('Choose PDF, JPG or PNG Aadhaar and PAN documents no larger than 10 MB each.')
          setLoading(false)
          return
        }
      }
      for (const field of applicationSteps.slice(0, step).flatMap((applicationStep) => applicationStep.fields).filter((name) => !name.endsWith('File'))) {
        formData.set(field, personalDetails[field] || '')
      }
    }
    const payload = accountActions.has(action) ? formData : Object.fromEntries(formData.entries())
    if (['transfer', 'deposit-request'].includes(action)
      && !transferableAccounts.some((account) => account.accountNumber === (action === 'transfer' ? payload.fromAccountNumber : payload.accountNumber))) {
      setError('Choose one of your active accounts.')
      setLoading(false)
      return
    }
    try {
      const depositAccount = action === 'deposit-request'
        ? transferableAccounts.find((account) => account.accountNumber === payload.accountNumber)
        : null
      const submitPayload = action === 'deposit-request' ? {
        ...payload,
        currency: depositAccount?.currency || 'INR',
      } : action === 'transfer' ? {
        ...payload,
        currency: transferableAccounts.find((account) => account.accountNumber === payload.fromAccountNumber)?.currency || 'INR',
      } : payload
      const result = await submitBankingAction(action, submitPayload, customer, customerProfile, customerAccounts)
      onSuccess?.(result)
      if (accountActions.has(action) || ['transfer', 'deposit-request'].includes(action)) setApplication(result)
      setConfirmation(result?.message || 'Your request was received.')
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="action-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <button className="modal-close" aria-label="Close dialog" onClick={onClose}><Icon name="close" /></button>
        {confirmation ? (
          <div className="success-state">
            <span><Icon name="check" size={25} /></span>
            <h2 id="modal-title">{application
              ? action === 'transfer' ? 'Transfer complete'
                : action === 'deposit-request' ? 'Deposit request submitted'
                  : 'Application submitted'
              : 'Request received'}</h2>
            <p>{application
              ? ['transfer', 'deposit-request'].includes(action)
                ? confirmation
                : isApiConfigured
                ? 'Your customer profile is saved in customer-service and your Aadhaar/PAN numbers and files are saved with the KYC application in the backend database. Your status stays pending until KYC is approved; the account opens after approval.'
                : 'Demo preview only: no document was uploaded or saved. With a backend connected, your submitted application would wait for KYC verification.'
              : confirmation}</p>
            {application?.id && action === 'account-application' && <p className="application-confirmation-reference">Application ID · <b>{application.id}</b></p>}
            {application?.reference && <p className="application-confirmation-reference">{action === 'transfer' ? 'Transfer' : 'Deposit request'} reference · <b>{application.reference}</b></p>}
            <button className="button button-primary" onClick={onClose}>Done</button>
          </div>
        ) : (
          <div>
            <span className="modal-icon"><Icon name={action === 'payment' ? 'receipt' : action.includes('account') ? 'bank' : action === 'deposit-request' ? 'bank' : 'swap'} size={22} /></span>
            <h2 id="modal-title">{content.title}</h2>
            <p className="modal-description">{content.description}</p>
            {accountActions.has(action) && <div className="application-stepper" aria-label="Application steps">
              {applicationSteps.map((applicationStep, index) => (
                <div className={`application-step ${index === step ? 'current' : index < step ? 'complete' : ''}`} key={applicationStep.title}>
                  <span>{index < step ? <Icon name="check" size={12} /> : index + 1}</span>
                  <b>{applicationStep.title}</b>
                </div>
              ))}
            </div>}
            {action === 'support' ? (
              <div className="support-guidance">
                <p>Already have an account? Sign in to view your accounts and application updates.</p>
                <p>New to Nova Bank? Start an account application and track its KYC review online.</p>
                <div className="support-guidance-actions">
                  <a className="button button-primary" href="/login" onClick={onClose}>Sign in</a>
                  <a className="button button-secondary" href="/register" onClick={onClose}>Open account</a>
                </div>
              </div>
            ) : <form
              ref={formRef}
              onSubmit={handleSubmit}
              noValidate={accountActions.has(action)}
              encType={accountActions.has(action) ? 'multipart/form-data' : undefined}
            >
              {content.fields
                .filter((field) => !accountActions.has(action) || applicationSteps[step].fields.includes(field))
                .map((field) => {
                  const details = fieldDetails[field]
                  return (
                    <label className="form-label" key={field}>{details.label}
                      {details.type === 'select' ? (
                        <select
                          name={field}
                          required={!['maritalStatus', 'sourceOfIncome'].includes(field)}
                          disabled={(field === 'preferredBranchCode' && branchesLoading) || (['fromAccountNumber', 'accountNumber'].includes(field) && !transferableAccounts.length)}
                          defaultValue={
                            field === 'preferredBranchCode'
                              ? personalDetails[field] || ''
                              : ['fromAccountNumber', 'accountNumber'].includes(field)
                              ? transferableAccounts[0]?.accountNumber || ''
                              : ''
                          }
                          onChange={
                            field === 'preferredBranchCode'
                              ? (event) => setPersonalDetails((current) => ({ ...current, preferredBranchCode: event.target.value }))
                              : undefined
                          }
                        >
                          <option value="" disabled>Select {details.label.toLowerCase()}</option>
                          {(field === 'preferredBranchCode'
                            ? branches.map((branch) => ({
                                // NOTE: use branchCode as value
                                value: branch.branchCode,
                                label: `${branch.branchName} — ${branch.district ? `${branch.district}, ` : ''}${branch.city}, ${branch.state}`,
                              }))
                            : ['fromAccountNumber', 'accountNumber'].includes(field)
                              ? transferableAccounts.map((account) => ({
                                value: account.accountNumber,
                                label: `${account.name} · •••• ${account.accountNumber.slice(-4)}${field === 'fromAccountNumber' ? ` · ${new Intl.NumberFormat('en-IN', { style: 'currency', currency: account.currency || 'INR' }).format(account.balance)}` : ''}`,
                              }))
                            : details.options).map((option) => {
                            const value = typeof option === 'string' ? option : option.value
                            const label = typeof option === 'string' ? option : option.label
                            return <option value={value} key={value}>{label}</option>
                          })}
                        </select>
                      ) : details.type === 'file' ? (
                        <>
                          <input name={field} required type="file" accept={details.accept} />
                          <span className="form-help">{details.help}</span>
                        </>
                      ) : (
                        <input
                          name={field}
                          type={details.type || 'text'}
                          min={field === 'amount' ? '0.01' : field === 'annualIncome' ? '0' : undefined}
                          step={['annualIncome', 'amount'].includes(field) ? '0.01' : undefined}
                          inputMode={['toAccountNumber', 'accountNumber'].includes(field) ? 'numeric' : undefined}
                          maxLength={['toAccountNumber', 'accountNumber'].includes(field) ? 20 : undefined}
                          required={!['middleName', 'alternateMobileNumber', 'communicationAddress', 'communicationCity', 'communicationState', 'communicationCountry', 'communicationPinCode', 'occupation', 'annualIncome', 'language', 'description'].includes(field)}
                          max={field === 'dateOfBirth' ? new Date().toISOString().slice(0, 10) : undefined}
                          pattern={['toAccountNumber', 'accountNumber'].includes(field) ? '[0-9]{6,20}' : field === 'panNumber' ? '[A-Za-z]{5}[0-9]{4}[A-Za-z]' : ['phone', 'alternateMobileNumber'].includes(field) ? '[0-9]{10,15}' : ['permanentPinCode', 'communicationPinCode'].includes(field) ? '[0-9]{4,10}' : field === 'aadhaarNumber' ? '[0-9]{12}' : undefined}
                          placeholder={details.placeholder}
                          autoComplete={field === 'email' ? 'email' : field === 'phone' ? 'tel' : field === 'firstName' ? 'given-name' : field === 'lastName' ? 'family-name' : undefined}
                          defaultValue={personalDetails[field] || ''}
                        />
                      )}

                      {/* Selected Branch Card */}
                      {field === 'preferredBranchCode' && selectedBranch && (
                        <div className="selected-branch-card" aria-live="polite">
                          <div className="selected-branch-heading">
                            <span><Icon name="bank" size={16} /> Selected branch</span>
                            <b>{selectedBranch.status || 'ACTIVE'}</b>
                          </div>
                          <strong>{selectedBranch.branchName}</strong>
                          <div className="selected-branch-details">
                            <span><small>IFSC</small><b>{selectedBranch.ifscCode || 'Not provided'}</b></span>
                            <span><small>Branch code</small><b>{selectedBranch.branchCode || 'Not provided'}</b></span>
                            <span className="selected-branch-address"><small>Address</small><b>{[selectedBranch.address, selectedBranch.district, selectedBranch.city, selectedBranch.state, selectedBranch.pinCode, selectedBranch.country].filter(Boolean).join(', ') || 'Address not provided'}</b></span>
                          </div>
                          <span className="selected-branch-live"><i /> Live details from Nova Bank branches</span>
                        </div>
                      )}
                      {field === 'preferredBranchCode' && details.help && <span className="form-help">{branchesLoading ? 'Loading active branches…' : details.help}</span>}
                    </label>
                  )
                })}
              {error && <p className="form-error" role="alert">{error}</p>}
              <div className={`application-form-actions ${accountActions.has(action) && step > 0 ? 'with-back' : ''}`}>
                {accountActions.has(action) && step > 0 && <button className="button button-secondary application-back" type="button" onClick={() => {
                  const stepFields = applicationSteps[step].fields.filter((field) => !field.endsWith('File'))
                  const formData = new FormData(formRef.current)
                  const values = Object.fromEntries(stepFields.map((field) => [field, formData.get(field)]))
                  setPersonalDetails((current) => ({ ...current, ...values }))
                  setError('')
                  setStep((current) => current - 1)
                }}>Back</button>}
                <button className="button button-primary modal-submit" type="submit" disabled={loading || (applicationSteps[step]?.fields.includes('preferredBranchCode') && branchesLoading)}>
                  {loading
                    ? 'Please wait…'
                    : accountActions.has(action) && step < applicationSteps.length - 1
                      ? 'Continue'
                      : content.submit} <Icon name="arrowRight" size={16} />
                </button>
              </div>
              <div className="modal-secure"><Icon name="shield" size={14} />{accountActions.has(action)
                ? isApiConfigured ? ' Your document is sent securely for identity verification.' : ' Demo preview only — your document will not be uploaded or saved.'
                : action === 'transfer'
                  ? isApiConfigured ? ' Transfers are securely validated and processed by Nova Bank.' : ' Demo preview only — no money will be moved.'
                  : action === 'deposit-request'
                    ? isApiConfigured ? ' This request does not credit your balance until branch staff verifies the cash.' : ' Demo preview only — no deposit request will be submitted.'
                  : ' Preview flow — no real transactions.'}</div>
            </form>}
          </div>
        )}
      </section>
    </div>
  )
}