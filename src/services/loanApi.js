import { apiRequest } from './apiClient'

const LOAN_BASE = '/loan-service/api/v1'

const sendJson = (path, method, data) =>
  apiRequest(`${LOAN_BASE}${path}`, {
    method,
    body: JSON.stringify(data),
  })

export const getLoanProducts = () => apiRequest(`${LOAN_BASE}/loan-products`)

export const createLoanProduct = (data) =>
  sendJson('/loan-products', 'POST', data)

export const estimateLoan = (productId, data) =>
  sendJson(`/loan-products/${productId}/estimate`, 'POST', data)

export const submitLoanApplication = (data) =>
  sendJson('/applications', 'POST', data)

export const finalizeLoanApplication = (applicationId) =>
  apiRequest(`${LOAN_BASE}/applications/${encodeURIComponent(applicationId)}/submit`, {
    method: 'POST',
  })

export const getMyLoanApplications = () =>
  apiRequest(`${LOAN_BASE}/applications/me`)

export const getLoanApplications = () => apiRequest(`${LOAN_BASE}/applications`)

export const getAssignedLoanApplications = () =>
  apiRequest(`${LOAN_BASE}/applications/assigned`)

export const getLoanDashboard = () => apiRequest(`${LOAN_BASE}/dashboard`)

export const getLoanApplication = (applicationId) =>
  apiRequest(`${LOAN_BASE}/applications/${encodeURIComponent(applicationId)}`)

export const getLoanApplicationReviewDetails = (applicationId) =>
  apiRequest(`${LOAN_BASE}/applications/${encodeURIComponent(applicationId)}/review-details`)

export const getLoanApplicationHistory = (applicationId) =>
  apiRequest(`${LOAN_BASE}/applications/${encodeURIComponent(applicationId)}/history`)

export const submitEmploymentInfo = (applicationId, data) =>
  sendJson(`/applications/${encodeURIComponent(applicationId)}/employment`, 'POST', data)

export const getLoanDocuments = (applicationId) =>
  apiRequest(`${LOAN_BASE}/applications/${encodeURIComponent(applicationId)}/documents`)

export const uploadLoanDocument = (applicationId, documentType, file) => {
  const form = new FormData()
  form.set('documentType', documentType)
  form.set('file', file, file.name || 'document')
  return apiRequest(
    `${LOAN_BASE}/applications/${encodeURIComponent(applicationId)}/documents`,
    { method: 'POST', body: form }
  )
}

export const downloadLoanDocument = (documentId) =>
  apiRequest(`${LOAN_BASE}/documents/${encodeURIComponent(documentId)}/file`, {
    responseType: 'blob',
  })

export const previewLoanDocument = (documentId) =>
  apiRequest(`${LOAN_BASE}/documents/${encodeURIComponent(documentId)}/preview`, {
    responseType: 'blob',
  })

export const verifyLoanDocument = (documentId, verified) =>
  sendJson(`/documents/${encodeURIComponent(documentId)}/verification`, 'PATCH', {
    verified,
  })

export const deleteLoanDocument = (documentId) =>
  apiRequest(`${LOAN_BASE}/documents/${encodeURIComponent(documentId)}`, {
    method: 'DELETE',
  })

export const assessLoanCredit = (applicationId, creditScore) =>
  sendJson(
    `/applications/${encodeURIComponent(applicationId)}/credit-assessment`,
    'POST',
    { creditScore }
  )

export const recommendLoanApplication = (applicationId, data) =>
  sendJson(`/applications/${encodeURIComponent(applicationId)}/recommendation`, 'POST', data)

export const decideLoanApplication = (applicationId, data) =>
  sendJson(`/applications/${encodeURIComponent(applicationId)}/manager-decision`, 'POST', data)

export const assignLoanApplication = (applicationId, officerId) =>
  sendJson(`/applications/${encodeURIComponent(applicationId)}/assignment`, 'POST', { officerId })

export const requestAdditionalLoanDocuments = (applicationId, requestedDocuments) =>
  sendJson(`/applications/${encodeURIComponent(applicationId)}/additional-documents`, 'POST', {
    requestedDocuments,
  })

export const approveLoanApplication = (applicationId) =>
  apiRequest(`${LOAN_BASE}/applications/${encodeURIComponent(applicationId)}/final-approval`, {
    method: 'POST',
  })

export const respondToLoanOffer = (applicationId, accepted) =>
  sendJson(`/applications/${encodeURIComponent(applicationId)}/offer-response`, 'POST', {
    accepted,
  })

export const acceptLoanAgreement = (applicationId) =>
  apiRequest(`${LOAN_BASE}/applications/${encodeURIComponent(applicationId)}/accept-agreement`, {
    method: 'POST',
  })

export const prepareLoanDisbursement = (applicationId) =>
  apiRequest(`${LOAN_BASE}/applications/${encodeURIComponent(applicationId)}/prepare-disbursement`, {
    method: 'POST',
  })

export const getApplicationLoanAccount = (applicationId) =>
  apiRequest(`${LOAN_BASE}/applications/${encodeURIComponent(applicationId)}/loan-account`)

export const disburseLoan = (applicationId) =>
  apiRequest(`${LOAN_BASE}/applications/${encodeURIComponent(applicationId)}/disburse`, {
    method: 'POST',
  })

export const getMyLoanAccounts = () => apiRequest(`${LOAN_BASE}/accounts/me`)

export const getLoanSchedule = (accountId) =>
  apiRequest(`${LOAN_BASE}/accounts/${encodeURIComponent(accountId)}/schedule`)

export const getLoanPayments = (accountId) =>
  apiRequest(`${LOAN_BASE}/accounts/${encodeURIComponent(accountId)}/payments`)

export const payLoanEmi = (accountId, data) =>
  sendJson(`/accounts/${encodeURIComponent(accountId)}/payments`, 'POST', data)

export const prepayLoan = (accountId, data) =>
  sendJson(`/accounts/${encodeURIComponent(accountId)}/prepayments`, 'POST', data)

export const getForeclosureQuote = (accountId) =>
  apiRequest(`${LOAN_BASE}/accounts/${encodeURIComponent(accountId)}/foreclosure-quote`)

export const forecloseLoan = (accountId, data) =>
  sendJson(`/accounts/${encodeURIComponent(accountId)}/foreclosure`, 'POST', data)

export const getStaffLoanPortfolio = () => apiRequest(`${LOAN_BASE}/staff/portfolio`)

export const getStaffLoanSchedule = (accountId) =>
  apiRequest(`${LOAN_BASE}/staff/accounts/${encodeURIComponent(accountId)}/schedule`)

export const getStaffLoanPayments = (accountId) =>
  apiRequest(`${LOAN_BASE}/staff/accounts/${encodeURIComponent(accountId)}/payments`)