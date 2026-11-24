// src/services/branchManagerService.js
import { apiRequest, getSavedAuthUser, getAccessToken } from './apiClient';

function getManagerName() {
  const user = getSavedAuthUser();
  return user?.fullName ?? user?.name ?? user?.email ?? 'Branch Manager';
}

function getManagerEmail() {
  const user = getSavedAuthUser();
  return user?.email ?? '';
}

export async function getMyEmployeeProfile() {
  const email = getManagerEmail();
  if (!email) throw new Error('No email found in session');

  const qs = new URLSearchParams({ size: 100 }).toString();
  const response = await apiRequest(`/employee-service/api/v1/employees/all?${qs}`);
  
  const employees = Array.isArray(response) ? response : (response?.content ?? []);
  const myProfile = employees.find(e => e.email === email);
  
  if (!myProfile) throw new Error('Employee profile not found');
  return myProfile;
}

export function getManagerIdentity() {
  const user = getSavedAuthUser();
  return {
    name: getManagerName(),
    email: user?.email ?? '',
    roles: Array.isArray(user?.roles) ? user.roles : [],
  };
}

/* ---------- Branch ---------- */

export async function getMyBranch() {
  const profile = await getMyEmployeeProfile();
  if (!profile.branchCode) throw new Error('Employee profile has no branch assigned.');
  return apiRequest(`/branch-service/api/v1/branches/${encodeURIComponent(profile.branchCode)}`);
}

export async function getAllBranches() {
  const qs = new URLSearchParams({ size: 100 }).toString();
  return apiRequest(`/branch-service/api/v1/branches?${qs}`);
}

/* ---------- Customers ---------- */

export async function getCustomers({ page = 0, size = 100 } = {}) {
  const qs = new URLSearchParams({ page, size }).toString();
  return apiRequest(`/customer-service/api/v1/customers/all?${qs}`);
}

export async function getCustomerById(customerId) {
  if (!customerId) throw new Error('Customer ID is required.');
  return apiRequest(`/customer-service/api/v1/customers/${encodeURIComponent(customerId)}`);
}

/* ---------- Accounts ---------- */

export async function getAccounts({ page = 0, size = 100 } = {}) {
  const qs = new URLSearchParams({ page, size }).toString();
  return apiRequest(`/account-service/api/v1/accounts/all?${qs}`);
}

export async function getAccountById(accountId) {
  if (!accountId) throw new Error('Account ID is required.');
  return apiRequest(`/account-service/api/v1/accounts/${encodeURIComponent(accountId)}`);
}

export async function getAccountsByCustomer(customerId) {
  if (!customerId) throw new Error('Customer ID is required.');
  return apiRequest(`/account-service/api/v1/accounts/customer/${encodeURIComponent(customerId)}`);
}

// Direct Deposit function
export async function depositToAccount(accountNumber, amount) {
  if (!accountNumber) throw new Error('Account Number is required.');
  if (!amount || amount <= 0) throw new Error('Valid amount is required.');
  
  return apiRequest(`/account-service/api/v1/accounts/deposit/${encodeURIComponent(accountNumber)}`, {
    method: 'PATCH',
    body: JSON.stringify({ amount: Number(amount) }),
  });
}

/* ---------- Transactions ---------- */

export async function getTransactions({ page = 0, size = 100 } = {}) {
  const qs = new URLSearchParams({ page, size }).toString();
  return apiRequest(`/transaction-service/api/v1/transactions/admin?${qs}`);
}

export async function adminTransfer(payload) {
  return apiRequest('/transaction-service/api/v1/transactions/mine/transfer', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function adminWithdraw(payload) {
  return apiRequest('/transaction-service/api/v1/transactions/mine/withdraw', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/* ---------- KYC ---------- */

export async function getKycRequests() {
  return apiRequest(`/kyc-service/api/v1/kyc/all`);
}

// ✨ THIS IS THE API YOU WERE ASKING FOR (Same as Admin/KYC Officer)
export async function updateKycStatus(kycId, status, remarks) {
  if (!kycId) throw new Error('KYC ID is required.');
  return apiRequest(
    `/kyc-service/api/v1/kyc/${encodeURIComponent(kycId)}/status`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        verificationStatus: status,
        reviewerId: getManagerName(),
        rejectionReason: remarks ?? null,
      }),
    }
  );
}

/* ---------- Employees ---------- */

export async function getBranchEmployees() {
  const qs = new URLSearchParams({ size: 100 }).toString();
  return apiRequest(`/employee-service/api/v1/employees/all?${qs}`);
}

export async function registerEmployee(data) {
  return apiRequest('/employee-service/api/v1/employees/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateEmployeeStatus(id, status) {
  return apiRequest(`/employee-service/api/v1/employees/${id}/status?status=${encodeURIComponent(status)}`, {
    method: 'PATCH',
  });
}

/* ---------- Convenience ---------- */

export function normalizeList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.content)) return payload.content;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

const branchManagerService = {
  getMyEmployeeProfile,
  getMyBranch,
  getAllBranches,
  getCustomers,
  getCustomerById,
  getAccounts,
  getAccountById,
  getAccountsByCustomer,
  depositToAccount,
  getTransactions,
  adminTransfer,
  adminWithdraw,
  getKycRequests,
  updateKycStatus,
  getBranchEmployees,
  registerEmployee,
  updateEmployeeStatus,
  getManagerIdentity,
  normalizeList,
};

export default branchManagerService;