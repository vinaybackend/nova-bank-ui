// src/services/apiClient.js
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '')
const accessTokenKey = 'nova.auth.access-token'
const refreshTokenKey = 'nova.auth.refresh-token'
const authUserKey = 'nova.auth.user'

const REFRESH_PATH = '/auth-service/api/v1/auth/refresh-token'
const REFRESH_ADMIN_PATH = '/auth-service/api/v1/admin/auth/refresh-token'

export const isApiConfigured = Boolean(apiBaseUrl)

export const getAccessToken = () => sessionStorage.getItem(accessTokenKey)
export const getRefreshToken = () => sessionStorage.getItem(refreshTokenKey)
export const setRefreshToken = (token) => sessionStorage.setItem(refreshTokenKey, token)
export const getSavedAuthUser = () => {
  try {
    return JSON.parse(sessionStorage.getItem(authUserKey) || 'null')
  } catch {
    return null
  }
}
export const setSavedAuthUser = (user) => sessionStorage.setItem(authUserKey, JSON.stringify(user))

let refreshTimer
let refreshInFlight
let backgroundRefreshInterval

function decodeTokenExpiry(token) {
  try {
    const payload = token.split('.')[1]?.replace(/-/g, '+').replace(/_/g, '/')
    if (!payload) return null
    const claims = JSON.parse(atob(payload.padEnd(Math.ceil(payload.length / 4) * 4, '=')))
    return Number.isFinite(claims.exp) ? claims.exp * 1000 : null
  } catch {
    return null
  }
}

function notifySessionExpired() {
  clearAuthSession()
  window.dispatchEvent(new Event('nova:session-expired'))
}

function scheduleTokenRefresh(token) {
  window.clearTimeout(refreshTimer)
  const expiresAt = decodeTokenExpiry(token)
  if (!expiresAt || !getRefreshToken()) return

  // Refresh 2 minutes before expiry
  const delay = Math.max(1000, expiresAt - Date.now() - 120_000)
  refreshTimer = window.setTimeout(() => {
    refreshAccessToken().catch(retryRefreshAfterDelay)
  }, delay)
}

function retryRefreshAfterDelay() {
  if (!getAccessToken() || !getRefreshToken()) return
  refreshTimer = window.setTimeout(() => {
    refreshAccessToken().catch(retryRefreshAfterDelay)
  }, 30_000)
}

// 👈 NEW: Background refresher (pings every 10 minutes if user is active)
function startBackgroundRefresh() {
  if (backgroundRefreshInterval) clearInterval(backgroundRefreshInterval)
  
  backgroundRefreshInterval = setInterval(() => {
    // Only refresh if the tab is visible
    if (document.visibilityState === 'visible' && getRefreshToken()) {
      refreshAccessToken().catch(() => {})
    }
  }, 10 * 60 * 1000) // 10 minutes
}

export function ensureFreshAccessToken() {
  const token = getAccessToken()
  if (!token) return Promise.resolve(null)
  const expiresAt = decodeTokenExpiry(token)
  if (expiresAt && expiresAt - Date.now() <= 120_000 && getRefreshToken()) {
    return refreshAccessToken()
  }
  scheduleTokenRefresh(token)
  return Promise.resolve(token)
}

export function setAccessToken(token) {
  sessionStorage.setItem(accessTokenKey, token)
  scheduleTokenRefresh(token)
  startBackgroundRefresh() // Start the background timer when logged in
}

export function clearAuthSession() {
  window.clearTimeout(refreshTimer)
  if (backgroundRefreshInterval) clearInterval(backgroundRefreshInterval)
  refreshInFlight = null
  sessionStorage.removeItem(accessTokenKey)
  sessionStorage.removeItem(refreshTokenKey)
  sessionStorage.removeItem(authUserKey)
}

export class ApiError extends Error {
  constructor(message, status, body) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

async function sendRequest(path, options = {}, token) {
  const isFormData = options.body instanceof FormData
  const headers = {
    Accept: 'application/json',
    ...(options.body && !isFormData ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  }

  let response
  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      ...options,
      credentials: 'include',
      headers,
    })
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(`Could not reach the Nova backend at ${apiBaseUrl}.`, { cause: error })
    }
    throw error
  }
  return response
}

async function errorFromResponse(response) {
  const contentType = response.headers.get('content-type') || ''
  let message
  let parsedBody
  if (contentType.includes('application/json')) {
    try {
      parsedBody = await response.json()
    } catch {
      parsedBody = undefined
    }
    if (parsedBody && typeof parsedBody === 'object') {
      message = parsedBody.message || parsedBody.error
      if (!message) {
        message = Object.values(parsedBody).filter(Boolean).join(' ')
      }
      if (!message) message = JSON.stringify(parsedBody)
    } else if (typeof parsedBody === 'string') {
      message = parsedBody
    }
  } else {
    message = await response.text()
  }
  return new ApiError(
    message || `Request failed with status ${response.status}.`,
    response.status,
    parsedBody,
  )
}

async function callRefreshEndpoint(path, refreshToken) {
  return sendRequest(
    path,
    {
      method: 'POST',
      body: JSON.stringify(refreshToken),
    },
    undefined,
  )
}

async function refreshAccessToken() {
  if (refreshInFlight) return refreshInFlight

  refreshInFlight = (async () => {
    const refreshToken = getRefreshToken()
    if (!refreshToken) {
      notifySessionExpired()
      throw new ApiError('Your session has expired. Sign in again to continue.', 401)
    }

    let response = await callRefreshEndpoint(REFRESH_PATH, refreshToken)

    if (response.status === 404) {
      response = await callRefreshEndpoint(REFRESH_ADMIN_PATH, refreshToken)
    }

    if (!response.ok) {
      const error = await errorFromResponse(response)
      if ([400, 401, 403].includes(response.status)) {
        notifySessionExpired()
      }
      throw error
    }

    const session = await response.json().catch(() => null)
    const newToken = session?.token || session?.accessToken
    const newRefresh = session?.refreshToken
    if (!newToken || !newRefresh) {
      notifySessionExpired()
      throw new Error('The sign-in service returned an invalid refreshed session.')
    }

    setRefreshToken(newRefresh)
    setAccessToken(newToken)
    if (session.user) setSavedAuthUser(session.user)
    return newToken
  })()

  try {
    return await refreshInFlight
  } finally {
    refreshInFlight = null
  }
}

const AUTH_PATH_SUFFIXES = [
  '/auth/login',
  '/auth/register',
  '/auth/refresh-token',
]

function isAuthPath(path) {
  const clean = path.split('?')[0].split('#')[0].replace(/\/$/, '')
  return AUTH_PATH_SUFFIXES.some((suffix) => clean.endsWith(suffix))
}

export async function apiRequest(path, options = {}) {
  if (!apiBaseUrl) {
    throw new Error('Backend API is not configured. Set VITE_API_BASE_URL to enable API requests.')
  }

  const { responseType, ...requestOptions } = options
  const authPath = isAuthPath(path)

  if (!authPath) {
    try {
      await ensureFreshAccessToken()
    } catch {
      /* fall through — the request itself will 401 and trigger the reactive path */
    }
  }

  const requestToken = getAccessToken()
  let response = await sendRequest(path, requestOptions, authPath ? undefined : requestToken)

  if (response.status === 401 && !authPath) {
    const currentToken = getAccessToken()

    if (currentToken && currentToken !== requestToken) {
      response = await sendRequest(path, requestOptions, currentToken)
    } else if (getRefreshToken()) {
      try {
        const token = await refreshAccessToken()
        response = await sendRequest(path, requestOptions, token)
      } catch (err) {
        if (err instanceof ApiError && [400, 401, 403].includes(err.status)) {
          notifySessionExpired()
          throw new ApiError('Your session has expired. Sign in again to continue.', 401)
        }
        throw err
      }
    } else if (requestToken) {
      notifySessionExpired()
      throw new ApiError('Your session has expired. Sign in again to continue.', 401)
    }
  }

  if (!response.ok) {
    throw await errorFromResponse(response)
  }

  if (response.status === 204) return null
  if (responseType === 'blob') return response.blob()

  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    const text = await response.text()
    if (!text) return null;
    
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }
  return response.text()
}