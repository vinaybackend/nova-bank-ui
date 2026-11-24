// src/services/kycOfficerService.js
import { apiRequest } from './apiClient';

// Matches the gateway routing convention: /<service-name>/api/...
const BASE = '/kyc-service/api/v1/kyc';
const CUSTOMER_BASE = '/customer-service/api/v1/customers';

/* ---------- List all KYC applications ---------- */
export async function fetchAllKyc() {
  const data = await apiRequest(`${BASE}/all`);
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.content)) return data.content;
  return [];
}

/* ---------- Applications for one customer ---------- */
export async function fetchKycByCustomer(customerId) {
  if (!customerId) throw new Error('Customer ID is required.');
  const data = await apiRequest(
    `${BASE}/customer/${encodeURIComponent(customerId)}`
  );
  return Array.isArray(data) ? data : [];
}

/* ---------- Customer full profile ---------- */
export async function fetchCustomerById(customerId) {
  if (!customerId) throw new Error('Customer ID is required.');
  return apiRequest(
    `${CUSTOMER_BASE}/${encodeURIComponent(customerId)}`
  );
}

/* ---------- Update KYC status (PATCH) ---------- */
export async function changeKycStatus({
  kycId,
  verificationStatus,
  reviewerId,
  rejectionReason,
}) {
  if (!kycId) throw new Error('KYC ID is required.');
  if (!verificationStatus) throw new Error('Verification status is required.');

  return apiRequest(`${BASE}/${encodeURIComponent(kycId)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({
      verificationStatus,
      reviewerId: reviewerId ?? null,
      rejectionReason: rejectionReason ?? null,
    }),
  });
}

/* ---------- Document (blob) ---------- */
export async function fetchKycDocument(kycId, documentId) {
  if (!kycId || !documentId) {
    throw new Error('KYC ID and document ID are required.');
  }
  return apiRequest(
    `${BASE}/${encodeURIComponent(kycId)}/documents/${encodeURIComponent(documentId)}`,
    { responseType: 'blob' }
  );
}