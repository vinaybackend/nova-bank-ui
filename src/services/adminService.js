// src/services/adminService.js
import { apiRequest } from './apiClient';

/* ================= BRANCHES ================= */

export async function createBranch(payload) {
  return apiRequest(`/branch-service/api/v1/branches/create`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getBranchByCode(branchCode) {
  if (!branchCode) throw new Error('Branch code is required.');
  return apiRequest(`/branch-service/api/v1/branches/${encodeURIComponent(branchCode)}`);
}

export async function getBranches({ city, status, page = 0, size = 100 } = {}) {
  const params = new URLSearchParams({ page, size });
  if (city) params.append('city', city);
  if (status) params.append('status', status);
  return apiRequest(`/branch-service/api/v1/branches/search?${params.toString()}`);
}

export async function updateBranch(id, payload) {
  return apiRequest(`/branch-service/api/v1/branches/update/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function updateBranchStatus(id, payload) {
  return apiRequest(`/branch-service/api/v1/branches/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function getBranchStatusHistory(branchCode) {
  return apiRequest(`/branch-service/api/v1/branches/${encodeURIComponent(branchCode)}/status-history`);
}

export async function searchBranches({ branchCode, ifscCode, city, status, branchType, page = 0, size = 100 } = {}) {
  const params = new URLSearchParams({ page, size });
  if (branchCode) params.append('branchCode', branchCode);
  if (ifscCode) params.append('ifscCode', ifscCode);
  if (city) params.append('city', city);
  if (status) params.append('status', status);
  if (branchType) params.append('branchType', branchType);
  return apiRequest(`/branch-service/api/v1/branches/search?${params.toString()}`);
}

/* ================= CUSTOMERS ================= */

export async function getAllCustomers({ page = 0, size = 100 } = {}) {
  const qs = new URLSearchParams({ page, size }).toString();
  return apiRequest(`/customer-service/api/v1/customers/all?${qs}`);
}

export async function getCustomersByBranch(branchCode, { page = 0, size = 100 } = {}) {
  const qs = new URLSearchParams({ page, size }).toString();
  return apiRequest(`/customer-service/api/v1/customers/all-customer/${encodeURIComponent(branchCode)}?${qs}`);
}

export async function getCustomerById(customerId) {
  if (!customerId) throw new Error('Customer ID is required.');
  return apiRequest(`/customer-service/api/v1/customers/${encodeURIComponent(customerId)}`);
}

export async function updateCustomerStatus(customerId, status) {
  if (!customerId) throw new Error('Customer ID is required.');
  return apiRequest(`/customer-service/api/v1/customers/status/${encodeURIComponent(customerId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ status })
  });
}

export async function closeCustomer(customerId) {
  if (!customerId) throw new Error('Customer ID is required.');
  return apiRequest(`/customer-service/api/v1/customers/${encodeURIComponent(customerId)}/close`, {
    method: 'PATCH'
  });
}

/* ================= ACCOUNTS ================= */

export async function getAllAccounts({ page = 0, size = 100 } = {}) {
  const qs = new URLSearchParams({ page, size }).toString();
  return apiRequest(`/account-service/api/v1/accounts/all?${qs}`);
}

export async function getAccountsByBranch(branchCode, { page = 0, size = 100 } = {}) {
  const qs = new URLSearchParams({ page, size }).toString();
  return apiRequest(`/account-service/api/v1/accounts/all-account/${encodeURIComponent(branchCode)}?${qs}`);
}

export async function getAccountById(accountId) {
  if (!accountId) throw new Error('Account ID is required.');
  return apiRequest(`/account-service/api/v1/accounts/${encodeURIComponent(accountId)}`);
}

export async function getAccountsByCustomer(customerId) {
  if (!customerId) throw new Error('Customer ID is required.');
  return apiRequest(`/account-service/api/v1/accounts/customer/${encodeURIComponent(customerId)}`);
}

export async function updateAccountStatus(accountId, accountStatus) {
  if (!accountId) throw new Error('Account ID is required.');
  return apiRequest(`/account-service/api/v1/accounts/status/${encodeURIComponent(accountId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ accountStatus })
  });
}

export async function getAccountByNumber(accountNumber) {
  if (!accountNumber) throw new Error('Account number is required.');
  return apiRequest(`/account-service/api/v1/accounts/account-number/${encodeURIComponent(accountNumber)}`);
}

/* ================= TRANSACTIONS ================= */

export async function getAllTransactions({ page = 0, size = 100 } = {}) {
  const qs = new URLSearchParams({ page, size }).toString();
  return apiRequest(`/transaction-service/api/v1/transactions/admin?${qs}`);
}

export async function getTransactionsByBranch(branchCode, { page = 0, size = 100 } = {}) {
  const qs = new URLSearchParams({ page, size }).toString();
  return apiRequest(`/transaction-service/api/v1/transactions/all-transaction/${encodeURIComponent(branchCode)}?${qs}`);
}

export async function adminWithdraw(payload) {
  return apiRequest(`/transaction-service/api/v1/transactions/withdraw`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function adminTransfer(payload) {
  return apiRequest(`/transaction-service/api/v1/transactions/transfer`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

/* ================= KYC ================= */

export async function getAllKyc() {
  return apiRequest(`/kyc-service/api/v1/kyc/all`);
}

export async function getKycByBranch(branchCode, { page = 0, size = 100 } = {}) {
  const qs = new URLSearchParams({ page, size }).toString();
  return apiRequest(`/kyc-service/api/v1/kyc/all-kyc/${encodeURIComponent(branchCode)}?${qs}`);
}

export async function updateKycStatus(kycId, verificationStatus, reviewerId, rejectionReason) {
  if (!kycId) throw new Error('KYC ID is required.');
  return apiRequest(`/kyc-service/api/v1/kyc/${encodeURIComponent(kycId)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({
      verificationStatus,
      reviewerId: reviewerId ?? null,
      rejectionReason: rejectionReason ?? null,
    }),
  });
}

export async function getKycDocument(kycId, documentId) {
  if (!kycId || !documentId) throw new Error('KYC ID and Document ID are required.');
  return apiRequest(
    `/kyc-service/api/v1/kyc/${encodeURIComponent(kycId)}/documents/${encodeURIComponent(documentId)}`,
    { responseType: 'blob' }
  );
}

/* ================= EMPLOYEES & ROLES ================= */

/**
 * Fetch the employee directory from EMPLOYEE-SERVICE.
 * Returns a Spring Page<EmployeeResponse> with all fields:
 * employeeCode, firstName, middleName, lastName, dateOfBirth, gender,
 * email, mobileNumber, jobTitle, department, grade, employeeType,
 * employmentStatus, maritalStatus, branchCode, branchName, dateOfJoining,
 * documents, bankAccount, createdAt, updatedAt.
 */
export async function getEmployeeDirectory({
  search,
  branchCode,
  status,
  page = 0,
  size = 100,
  sortBy = 'id',
  sortDir = 'desc',
} = {}) {
  const params = new URLSearchParams({ page, size, sortBy, sortDir });
  if (search) params.append('search', search);
  if (branchCode) params.append('branchCode', branchCode);
  if (status) params.append('status', status);
  return apiRequest(`/employee-service/api/v1/employees/all?${params.toString()}`);
}

export async function registerEmployee(payload) {
  return apiRequest(`/employee-service/api/v1/employees/register`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/** Auth-service view (login accounts only). Kept for compatibility. */
export async function getEmployees() {
  return apiRequest(`/auth-service/api/v1/admin/auth/employees`);
}

export async function getEmployeesByBranch(branchCode, { page = 0, size = 100 } = {}) {
  const qs = new URLSearchParams({ page, size }).toString();
  return apiRequest(`/employee-service/api/v1/employees/all-employee/${encodeURIComponent(branchCode)}?${qs}`);
}

export async function getEmployeeDetails(employeeCode) {
  if (!employeeCode) throw new Error('Employee code is required.');
  return apiRequest(`/employee-service/api/v1/employees/details/${encodeURIComponent(employeeCode)}`);
}

export async function updateEmployeeStatus(employeeId, status) {
  if (!employeeId) throw new Error('Employee ID is required.');
  return apiRequest(`/employee-service/api/v1/employees/${employeeId}/status?status=${encodeURIComponent(status)}`, {
    method: 'PATCH'
  });
}

export async function getRoles() {
  return apiRequest(`/auth-service/api/v1/admin/auth/roles`);
}

export async function addRole(roleName) {
  return apiRequest(`/auth-service/api/v1/admin/auth/role/add`, {
    method: 'POST',
    body: JSON.stringify({ name: roleName }),
  });
}

export async function assignRoleToEmployee(email, roleName) {
  return apiRequest(`/auth-service/api/v1/admin/auth/assign/role/${encodeURIComponent(email)}`, {
    method: 'PATCH',
    body: JSON.stringify({ name: roleName }),
  });
}

/* ================= HELPERS ================= */

export function normalizeList(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.content)) return payload.content;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;

  if (payload?._embedded) {
    const keys = Object.keys(payload._embedded);
    if (keys.length > 0 && Array.isArray(payload._embedded[keys[0]])) {
      return payload._embedded[keys[0]];
    }
  }
  return [];
}

export function pageTotal(payload) {
  return (
    payload?.totalElements ??
    payload?.totalElement ??
    payload?.total ??
    normalizeList(payload).length
  );
}

const adminService = {
  // Branches
  createBranch, getBranchByCode, getBranches, updateBranch, updateBranchStatus, getBranchStatusHistory, searchBranches,
  // Customers
  getAllCustomers, getCustomersByBranch, getCustomerById, updateCustomerStatus, closeCustomer,
  // Accounts
  getAllAccounts, getAccountsByBranch, getAccountById, getAccountsByCustomer, updateAccountStatus, getAccountByNumber,
  // Transactions
  getAllTransactions, getTransactionsByBranch, adminWithdraw, adminTransfer,
  // KYC
  getAllKyc, getKycByBranch, updateKycStatus, getKycDocument,
  // Employees & Roles
  getEmployeeDirectory, // 👈 NEW
  registerEmployee, getEmployees, getEmployeesByBranch, getEmployeeDetails, updateEmployeeStatus, getRoles, addRole, assignRoleToEmployee,
  // Helpers
  normalizeList, pageTotal,
};

export default adminService;