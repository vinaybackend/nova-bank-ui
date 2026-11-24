import { apiRequest } from './apiClient'

const customerService = '/customer-service/api/v1/customers'
const accountService = '/account-service/api/v1'
const authService = '/auth-service/api/v1/admin/auth'
const kycService = '/kyc-service/api/v1/kyc'
const transactionService = '/transaction-service/api/v1/transactions'

export async function getStaffOverview(includeAdminData = false, accountPage = 0, customerPage = 0) {
  const [kycs, customers, branches, accounts] = await Promise.all([
    apiRequest(`${kycService}/all`).catch((error) => {
      if (error.status === 403) return []
      throw error
    }),
    apiRequest(`${customerService}/all?page=${customerPage}&size=100&sortBy=createdAt&sortDir=desc`).catch((error) => {
      if (error.status === 403) return null
      throw error
    }),
    apiRequest(`${accountService}/branches/active`).catch((error) => {
      if (error.status === 403) return []
      throw error
    }),
    includeAdminData
      ? getAdminAccounts(accountPage)
      : Promise.resolve(null),
  ])
  return {
    kycs,
    customers: customers?.content || [],
    customerTotal: customers?.totalElements ?? customers?.totalElement ?? customers?.content?.length ?? 0,
    customerPage: customers?.page ?? 0,
    customerPages: customers?.totalPages ?? customers?.totalPage ?? 0,
    branches,
    accounts: accounts?.content || [],
    accountTotal: accounts?.totalElements ?? null,
    accountPage: accounts?.number ?? 0,
    accountPages: accounts?.totalPages ?? 0,
  }
}

export function getAdminAccounts(page = 0) {
  return apiRequest(`${accountService}/accounts/all?page=${page}&size=100`).then((response) => {
    if (!Array.isArray(response?.content) || !Number.isFinite(response?.totalElements)) {
      throw new Error('The account service returned an invalid admin account page.')
    }
    return response
  })
}

export async function getDepositOperations() {
  const [pending, recent] = await Promise.all([
    apiRequest(`${transactionService}/deposits/pending`),
    apiRequest(`${transactionService}/deposits/recent`),
  ])
  if (!Array.isArray(pending) || !Array.isArray(recent)) {
    throw new Error('The transaction service returned an invalid deposit log.')
  }
  return { pending, recent }
}

export async function getAdminTransactionMonitor(page = 0) {
  try {
    const response = await apiRequest(`${transactionService}/admin?page=${page}&size=100`)
    if (!Array.isArray(response?.content) || !Number.isFinite(response?.totalElements)) {
      throw new Error('The transaction service returned an invalid admin transaction page.')
    }
    return {
      pending: response.content.filter((transaction) => transaction.transactionStatus === 'PENDING'),
      recent: response.content,
      total: response.totalElements,
      page: response.number,
      pages: response.totalPages,
    }
  } catch (error) {
    if (error.status === 404) return null
    throw error
  }
}

export function postDepositRequest(transactionId) {
  return apiRequest(`${transactionService}/deposits/${encodeURIComponent(transactionId)}/post`, {
    method: 'POST',
  })
}

export function createStaffDeposit(deposit) {
  return apiRequest(`${transactionService}/deposit`, {
    method: 'POST',
    body: JSON.stringify(deposit),
  })
}

export function createStaffTransfer(transfer) {
  return apiRequest(`${transactionService}/transfer`, {
    method: 'POST',
    body: JSON.stringify(transfer),
  })
}

export function reviewKyc(kycId, verificationStatus, reviewerId, rejectionReason = '') {
  return apiRequest(`${kycService}/${encodeURIComponent(kycId)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ verificationStatus, reviewerId, rejectionReason }),
  })
}

export async function getCustomerRecord(customerId) {
  return apiRequest(`${customerService}/${encodeURIComponent(customerId)}`)
}

export async function getCustomerAccounts(customerId) {
  try {
    return await apiRequest(`${accountService}/accounts/customer/${encodeURIComponent(customerId)}`)
  } catch (error) {
    if (error.status === 403) return null
    throw error
  }
}

export function createBranch(branch) {
  return apiRequest(`${accountService}/branches/create`, {
    method: 'POST',
    body: JSON.stringify(branch),
  })
}

export function registerEmployee(employee) {
  return apiRequest(`${authService}/employee/register`, {
    method: 'POST',
    body: JSON.stringify({
      ...employee,
      role: { name: employee.role },
    }),
  })
}

export function getStaffEmployees() {
  return apiRequest(`${authService}/employees`)
}

export function getStaffRoles() {
  return apiRequest(`${authService}/roles`)
}

export async function getStaffAccessData() {
  const [employees, roles] = await Promise.all([getStaffEmployees(), getStaffRoles()])
  return { employees, roles }
}

export function ensureStaffRole(role) {
  return apiRequest(`${authService}/role/add`, {
    method: 'POST',
    body: JSON.stringify({ name: role }),
  })
}

export function assignStaffRole(userId, role, branchId = '') {
  const query = branchId ? `?branchId=${encodeURIComponent(branchId)}` : ''
  return apiRequest(`${authService}/assign/role/${encodeURIComponent(userId)}${query}`, {
    method: 'PATCH',
    body: JSON.stringify({ name: role }),
  })
}

export async function openKycDocument(kycId, documentId) {
  const preview = window.open('about:blank', '_blank')
  if (!preview) throw new Error('Allow pop-ups to preview KYC documents.')
  preview.opener = null
  try {
    const file = await apiRequest(
      `${kycService}/${encodeURIComponent(kycId)}/documents/${encodeURIComponent(documentId)}`,
      { responseType: 'blob' },
    )
    const url = URL.createObjectURL(file)
    preview.location.href = url
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
  } catch (error) {
    preview.close()
    throw error
  }
}
