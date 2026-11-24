import { apiRequest } from './apiClient';

// Base route for the Employee Service
const BASE_URL = '/employee-service/api/v1/employees';

/**
 * Fetch all employees (Paginated)
 * Hits: GET /employee-service/api/v1/employees/all
 */
export async function getAllEmployees({ page = 0, size = 100, search = '', branchCode = '', status = '' } = {}) {
  const params = new URLSearchParams({ page, size });
  if (search) params.append('search', search);
  if (branchCode) params.append('branchCode', branchCode);
  if (status) params.append('status', status);
  
  // 👈 FIXED: Added /all to match the backend @GetMapping("/all")
  return apiRequest(`${BASE_URL}/all?${params.toString()}`);
}

/**
 * Fetch a single employee by Database ID
 */
export async function getEmployeeById(id) {
  if (!id) throw new Error('Employee ID is required.');
  return apiRequest(`${BASE_URL}/${id}`);
}

/**
 * Fetch a single employee by Employee Code
 */
export async function getEmployeeByCode(employeeCode) {
  if (!employeeCode) throw new Error('Employee Code is required.');
  return apiRequest(`${BASE_URL}/code/${encodeURIComponent(employeeCode)}`);
}

/**
 * Register a new employee (Handles both Employee DB and Auth DB)
 */
export async function registerEmployee(payload) {
  return apiRequest(`${BASE_URL}/register`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Update the employment status of an employee
 * Hits: PATCH /employee-service/api/v1/employees/{id}/status
 */
export async function updateEmployeeStatus(id, status) {
  if (!id) throw new Error('Employee ID is required.');
  return apiRequest(`${BASE_URL}/${id}/status?status=${encodeURIComponent(status)}`, {
    method: 'PATCH',
  });
}