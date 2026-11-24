import {
  ApiError,
  apiRequest,
  clearAuthSession,
  ensureFreshAccessToken,
  getAccessToken,
  getRefreshToken,
  getSavedAuthUser,
  isApiConfigured,
  setAccessToken,
  setRefreshToken,
  setSavedAuthUser,
} from './apiClient'

const demoSessionKey = 'nova.demo.session'
const demoRegistrationsKey = 'nova.demo.registrations'
const demoCustomer = {
  id: 'CUS-10482',
  fullName: 'Vinay Kumar',
  email: 'vinay.kumar@demo.nova',
  phone: '+91 98765 43210',
  customerNumber: 'NVB-2026-10482',
}

function parseJwtClaims(token) {
  try {
    const payload = token.split('.')[1]?.replace(/-/g, '+').replace(/_/g, '/')
    if (!payload) return {}
    return JSON.parse(atob(payload.padEnd(Math.ceil(payload.length / 4) * 4, '=')))
  } catch {
    return {}
  }
}

async function hashPassword(password) {
  const bytes = new TextEncoder().encode(password)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export async function registerOnlineBanking({ fullName, email, phone, password }) {
  const normalizedEmail = email.trim().toLowerCase()
  if (isApiConfigured) {
    const normalizedPhone = phone.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '')
    if (normalizedPhone.length !== 10) {
      throw new Error('Enter a 10-digit mobile number.')
    }
    const response = await apiRequest('/auth-service/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: fullName.trim(),
        email: normalizedEmail,
        phone: normalizedPhone,
        password,
      }),
    })
    return {
      email: normalizedEmail,
      message:
        typeof response === 'string' && response.trim()
          ? response.trim()
          : 'Your online banking profile was created successfully.',
    }
  }

  const registrations = JSON.parse(sessionStorage.getItem(demoRegistrationsKey) || '{}')
  if (normalizedEmail === demoCustomer.email || registrations[normalizedEmail]) {
    throw new Error('An online banking profile already exists for this email. Please sign in.')
  }

  const passwordHash = await hashPassword(password)
  const customer = {
    id: `CUS-DEMO-${Date.now()}`,
    fullName: fullName.trim(),
    email: normalizedEmail,
    phone: phone.trim(),
    customerNumber: `NVB-DEMO-${String(Date.now()).slice(-8)}`,
  }
  registrations[normalizedEmail] = { customer, passwordHash }
  sessionStorage.setItem(demoRegistrationsKey, JSON.stringify(registrations))
  return {
    email: normalizedEmail,
    message: 'Your demo online banking profile was created successfully.',
  }
}

export async function signIn({ email, password }) {
  if (isApiConfigured) {
    const session = await apiRequest('/auth-service/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: email.trim().toLowerCase(), password }),
    })
    const accessToken = session?.token || session?.accessToken
    if (!accessToken || !session?.refreshToken || !session.user) {
      throw new Error('The sign-in service returned an invalid session.')
    }
    
    const claims = parseJwtClaims(accessToken)
    const roles = Array.isArray(claims.roles)
      ? claims.roles.map((role) => String(role).replace(/^ROLE_/, '').toUpperCase())
      : []

    const user = {
      id: session.user.email,
      fullName: session.user.name,
      email: session.user.email,
      phone: session.user.phone,
      roles: roles,
      branchId: claims.branchId || claims.branch_id || session.user.branchId || null,
      branchCode: claims.branchCode || claims.branch_code || session.user.branchCode || null,
    }
    
    setRefreshToken(session.refreshToken)
    setAccessToken(accessToken)
    setSavedAuthUser(user)
    return user
  }

  const normalizedEmail = email.trim().toLowerCase()
  if (normalizedEmail === demoCustomer.email && password === 'NovaDemo2026!') {
    sessionStorage.setItem(demoSessionKey, JSON.stringify(demoCustomer))
    return demoCustomer
  }

  const registrations = JSON.parse(sessionStorage.getItem(demoRegistrationsKey) || '{}')
  const registration = registrations[normalizedEmail]
  if (registration && registration.passwordHash === (await hashPassword(password))) {
    sessionStorage.setItem(demoSessionKey, JSON.stringify(registration.customer))
    return registration.customer
  }

  throw new Error(
    'The email or password is incorrect. Check your details or create an online banking profile.'
  )
}

export async function getCurrentUser() {
  if (isApiConfigured) {
    const savedUser = getSavedAuthUser()
    if (!savedUser) return null
    if (!getAccessToken() && !getRefreshToken()) return null

    try {
      await ensureFreshAccessToken()
    } catch (error) {
      if (error instanceof ApiError && [400, 401, 403].includes(error.status)) {
        clearAuthSession()
        return null
      }
      throw error
    }

    if (!getAccessToken()) return null

    if ((savedUser.roles || []).some((role) => role !== 'CUSTOMER')) {
      return savedUser
    }

    try {
      const profile = await apiRequest('/customer-service/api/v1/customers/me')
      return {
        ...savedUser,
        id: profile.customerId,
        customerNumber: profile.customerId,
        fullName: [profile.firstName, profile.middleName, profile.lastName]
          .filter(Boolean)
          .join(' '),
        phone: profile.mobileNumber || savedUser.phone,
        roles: savedUser.roles || [],
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return savedUser
      if (error instanceof ApiError && [401, 403].includes(error.status)) {
        clearAuthSession()
        return null
      }
      throw error
    }
  }

  const savedSession = sessionStorage.getItem(demoSessionKey)
  return savedSession ? JSON.parse(savedSession) : null
}

export async function signOut() {
  if (isApiConfigured) {
    clearAuthSession()
  } else {
    sessionStorage.removeItem(demoSessionKey)
  }
}

export async function logout() {
  if (isApiConfigured) {
    try {
      await apiRequest('/auth-service/api/v1/auth/logout', { method: 'POST' })
    } catch (error) {
      console.warn('Backend logout failed:', error?.message || error)
    } finally {
      clearAuthSession()
    }
  } else {
    sessionStorage.removeItem(demoSessionKey)
  }
}

/* ---------- Admin Roles ---------- */

export async function getRoles() {
  if (isApiConfigured) {
    return apiRequest('/auth-service/api/v1/admin/auth/roles');
  }
  return [
    { id: '1', name: 'BRANCH_MANAGER' },
    { id: '2', name: 'KYC_OFFICER' },
    { id: '3', name: 'HR' },
    { id: '4', name: 'CUSTOMER' },
  ];
}

export async function assignRole(email, roleName) {
  if (isApiConfigured) {
    return apiRequest(`/auth-service/api/v1/admin/auth/assign/role/${encodeURIComponent(email)}`, {
      method: 'PATCH',
      body: JSON.stringify({ name: roleName }),
    });
  }
  return Promise.resolve({ message: 'Role assigned in demo mode.' });
}
// src/services/authService.js

export async function changePassword(oldPassword, newPassword) {
  if (!isApiConfigured) return { message: 'Demo mode' };

  return apiRequest('/auth-service/api/v1/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ oldPassword, newPassword }),
  });
}