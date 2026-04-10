import { toast } from 'react-toastify'

const BASE_URL = '/api'
const DEFAULT_HEADERS = {
  'Cache-Control': 'no-cache',
}

let activeRequestCount = 0
const activityListeners = new Set()

function notifyActivityListeners() {
  const isLoading = activeRequestCount > 0
  activityListeners.forEach((listener) => listener(isLoading))
}

function beginRequest() {
  activeRequestCount += 1
  notifyActivityListeners()
}

function endRequest() {
  activeRequestCount = Math.max(0, activeRequestCount - 1)
  notifyActivityListeners()
}

function flattenProblemDetailsErrors(errors) {
  if (!errors || typeof errors !== 'object') {
    return []
  }

  return Object.values(errors).flatMap((value) => {
    if (Array.isArray(value)) {
      return value.filter(Boolean)
    }

    if (typeof value === 'string') {
      return [value]
    }

    return []
  })
}

function buildMessages(data) {
  if (!data) {
    return ['The request failed.']
  }

  if (typeof data === 'string') {
    return [data]
  }

  if (Array.isArray(data)) {
    return data.filter(Boolean)
  }

  const validationMessages = flattenProblemDetailsErrors(data.errors)
  if (validationMessages.length > 0) {
    return validationMessages
  }

  if (typeof data.detail === 'string' && data.detail.trim().length > 0) {
    return [data.detail]
  }

  if (typeof data.title === 'string' && data.title.trim().length > 0) {
    return [data.title]
  }

  return ['The request failed.']
}

export class ApiError extends Error {
  constructor(message, { status, detail, data, messages }) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.detail = detail
    this.data = data
    this.messages = messages
  }
}

async function parseResponseBody(response) {
  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    return response.json()
  }
  const text = await response.text()
  return text || null
}

async function createApiErrorFromResponse(response) {
  let data = null
  try {
    data = await parseResponseBody(response)
  } catch {
    // ignore parse failures
  }

  const status = response.status
  const detail = typeof data?.detail === 'string' ? data.detail : null
  const messages = buildMessages(data)

  return new ApiError(messages[0], { status, detail, data, messages })
}

function createNetworkError() {
  return new ApiError('The request failed.', {
    status: 0,
    detail: null,
    data: null,
    messages: ['The request failed.'],
  })
}

function handleUnauthorized(error, redirectOnUnauthorized) {
  if (redirectOnUnauthorized && error.status === 401) {
    window.location.assign('/')
    return true
  }

  return false
}

function showMessages(messages) {
  messages.forEach((message) => toast.error(message))
}

async function fetchRequest(method, url, body) {
  const headers = { ...DEFAULT_HEADERS }
  if (body !== undefined && body !== null) {
    headers['Content-Type'] = 'application/json'
  }

  const response = await fetch(`${BASE_URL}${url}`, {
    method,
    headers,
    credentials: 'include',
    body: body !== undefined && body !== null ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    throw await createApiErrorFromResponse(response)
  }

  return response
}

async function executeRequest(method, url, body, options = {}) {
  const {
    redirectOnUnauthorized = true,
    showToast = true,
    trackLoading = true,
  } = options

  if (trackLoading) {
    beginRequest()
  }

  try {
    const response = await fetchRequest(method, url, body)
    return await parseResponseBody(response)
  } catch (error) {
    const apiError = error instanceof ApiError ? error : createNetworkError()

    if (handleUnauthorized(apiError, redirectOnUnauthorized)) {
      return null
    }

    if (showToast) {
      showMessages(apiError.messages)
    }

    throw apiError
  } finally {
    if (trackLoading) {
      endRequest()
    }
  }
}

async function executeRawRequest(config, options = {}) {
  const {
    redirectOnUnauthorized = true,
    showToast = true,
    trackLoading = true,
  } = options

  if (trackLoading) {
    beginRequest()
  }

  try {
    return await fetchRequest(config.method, config.url, config.data)
  } catch (error) {
    const apiError = error instanceof ApiError ? error : createNetworkError()

    if (handleUnauthorized(apiError, redirectOnUnauthorized)) {
      return null
    }

    if (showToast) {
      showMessages(apiError.messages)
    }

    throw apiError
  } finally {
    if (trackLoading) {
      endRequest()
    }
  }
}

export function subscribeToNetworkActivity(listener) {
  activityListeners.add(listener)
  listener(activeRequestCount > 0)

  return () => {
    activityListeners.delete(listener)
  }
}

export const api = {
  get(url, options) {
    return executeRequest('get', url, undefined, options)
  },
  post(url, data, options) {
    return executeRequest('post', url, data, options)
  },
  put(url, data, options) {
    return executeRequest('put', url, data, options)
  },
  delete(url, options) {
    return executeRequest('delete', url, undefined, options)
  },
  request(config, options) {
    return executeRawRequest(config, options)
  },
}
