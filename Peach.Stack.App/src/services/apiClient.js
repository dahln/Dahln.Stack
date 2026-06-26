import { toast } from 'react-toastify'

// --- Configuration ------------------------------------------------------------

// All API requests are made relative to this base path.  The leading slash
// ensures the path is always resolved from the document root regardless of the
// current client-side route.
const BASE_URL = '/api/'

// These headers are merged into every request.  Cache-Control: no-cache forces
// the browser to revalidate with the server rather than returning a stale cached
// response, which is important for data that changes frequently.
const DEFAULT_HEADERS = {
  'Cache-Control': 'no-cache',
}

// --- Global Network Activity Tracking ----------------------------------------
//
// Components (e.g. LoadingOverlay) can subscribe to know whether any API
// requests are currently in-flight.  We track the count of active requests so
// that the loading indicator stays visible until ALL concurrent requests finish,
// not just the first one to complete.

/** Number of fetch calls that are currently pending a response. */
let activeRequestCount = 0

/**
 * Set of listener functions that are notified whenever the loading state
 * changes (i.e. when the first request starts or the last one finishes).
 * @type {Set<function(boolean): void>}
 */
const activityListeners = new Set()

/**
 * Calls every registered listener with the current loading state (true if
 * any requests are in-flight, false if none are).  Called after every change
 * to `activeRequestCount`.
 */
function notifyActivityListeners() {
  const isCurrentlyLoading = activeRequestCount > 0
  activityListeners.forEach((listener) => listener(isCurrentlyLoading))
}

/**
 * Increments the in-flight request counter and notifies listeners.
 * Called at the start of every tracked request.
 */
function beginRequest() {
  activeRequestCount += 1
  notifyActivityListeners()
}

/**
 * Decrements the in-flight request counter (floor 0) and notifies listeners.
 * Called in the finally block of every tracked request.
 */
function endRequest() {
  // Math.max(0, ...) prevents the counter from going negative if endRequest is
  // somehow called more times than beginRequest.
  activeRequestCount = Math.max(0, activeRequestCount - 1)
  notifyActivityListeners()
}

/**
 * Subscribes a callback to global network activity state changes.
 * The callback is immediately invoked once with the current state so the
 * subscriber can synchronise its UI without waiting for the next request.
 *
 * @param {function(boolean): void} listener - Called with `true` when any
 *   request is in-flight, and `false` when all requests have settled.
 * @returns {function(): void} An unsubscribe function.  Call it in a
 *   useEffect cleanup to avoid memory leaks.
 */
export function subscribeToNetworkActivity(listener) {
  activityListeners.add(listener)

  // Immediately sync the subscriber with the current loading state.
  listener(activeRequestCount > 0)

  // Return an unsubscribe function so callers can clean up in useEffect.
  return () => {
    activityListeners.delete(listener)
  }
}

// --- Error Parsing Helpers ----------------------------------------------------
//
// The API can return errors in several shapes: plain strings, arrays of
// strings, RFC 7807 Problem Details objects ({ title, detail, errors: {...} }),
// or empty bodies.  These helpers normalise all of those into a flat string[].

/**
 * Extracts all validation error messages from an RFC 7807 `errors` object.
 * The `errors` field is a dictionary where each key maps to a string or
 * string array.  This function flattens that structure into a single array.
 *
 * @param {Object|null} validationErrors - The `errors` property of a Problem Details response.
 * @returns {string[]} All non-empty error strings, or an empty array if none exist.
 */
function flattenProblemDetailsErrors(validationErrors) {
  if (!validationErrors || typeof validationErrors !== 'object') {
    return []
  }

  return Object.values(validationErrors).flatMap((fieldErrors) => {
    if (Array.isArray(fieldErrors)) {
      return fieldErrors.filter(Boolean)
    }

    if (typeof fieldErrors === 'string') {
      return [fieldErrors]
    }

    return []
  })
}

/**
 * Returns true when the response content type represents JSON, including
 * structured syntax suffixes such as `application/problem+json`.
 *
 * @param {string|null} contentType - Raw Content-Type header value.
 * @returns {boolean}
 */
function isJsonContentType(contentType) {
  return typeof contentType === 'string' && /(^|\b|\/|\+)json\b/i.test(contentType)
}

/**
 * Attempts to parse a text body as JSON when it looks like a JSON payload.
 * Falls back to the original text if parsing fails.
 *
 * @param {string} responseText - Raw response body text.
 * @returns {any}
 */
function parseTextResponse(responseText) {
  const trimmedResponseText = responseText.trim()

  if (!trimmedResponseText) {
    return null
  }

  const looksLikeJson =
    (trimmedResponseText.startsWith('{') && trimmedResponseText.endsWith('}')) ||
    (trimmedResponseText.startsWith('[') && trimmedResponseText.endsWith(']'))

  if (looksLikeJson) {
    try {
      return JSON.parse(trimmedResponseText)
    } catch {
      // Fall back to the original text when the payload is not valid JSON.
    }
  }

  return responseText
}

/**
 * Re-parses string payloads that actually contain JSON so downstream error
 * handling can treat double-encoded problem-details responses as structured
 * data instead of rendering the raw JSON text to the user.
 *
 * @param {any} responseBody - Parsed response body or raw string payload.
 * @returns {any}
 */
function normalizeErrorResponseBody(responseBody) {
  if (typeof responseBody !== 'string') {
    return responseBody
  }

  const parsedResponseBody = parseTextResponse(responseBody)
  if (parsedResponseBody === responseBody) {
    return responseBody
  }

  return normalizeErrorResponseBody(parsedResponseBody)
}

/**
 * Removes query-string noise and lowercases the route so endpoint-specific
 * fallbacks can be matched consistently.
 *
 * @param {string} relativeUrl - Request URL relative to the API base.
 * @returns {string}
 */
function normalizeRelativeUrl(relativeUrl) {
  if (typeof relativeUrl !== 'string') {
    return ''
  }

  return relativeUrl.split('?')[0].trim().toLowerCase()
}

/**
 * Maps generic ASP.NET Identity problem-details responses to clearer messages.
 *
 * @param {any} responseBody - Parsed error response body.
 * @param {number} httpStatusCode - HTTP status for the failed request.
 * @param {string} relativeUrl - Request URL relative to the API base.
 * @returns {string|null}
 */
function getCuratedProblemDetailsMessage(responseBody, httpStatusCode, relativeUrl) {
  if (!responseBody || typeof responseBody !== 'object') {
    return null
  }

  const normalizedRelativeUrl = normalizeRelativeUrl(relativeUrl)

  if (responseBody.detail === 'RequiresTwoFactor') {
    return 'Two-factor authentication is required.'
  }

  if (normalizedRelativeUrl === 'login' && httpStatusCode === 401) {
    return 'The email address or password is incorrect.'
  }

  if (normalizedRelativeUrl === 'forgotpassword') {
    return 'We could not start the password reset. Confirm the email address and try again.'
  }

  if (normalizedRelativeUrl === 'resetpassword') {
    return 'We could not reset your password. The reset link may be invalid or expired.'
  }

  if (normalizedRelativeUrl === 'resendconfirmationemail') {
    return 'We could not resend the confirmation email. Confirm the email address and try again.'
  }

  if (normalizedRelativeUrl === 'v1/account/register') {
    return 'We could not create your account. Check the information you entered and try again.'
  }

  if (responseBody.detail === 'Failed' && httpStatusCode === 401) {
    return 'Your sign-in details were not accepted.'
  }

  if (responseBody.detail === 'Failed') {
    return 'The request could not be completed. Check the information you entered and try again.'
  }

  return null
}

/**
 * Extracts one or more human-readable error messages from an API response body.
 * Handles all the error shapes the API might return.
 *
 * @param {any} responseBody - The parsed response body (may be a string, array,
 *   Problem Details object, or null/undefined).
 * @param {number} [httpStatusCode=0] - HTTP status for the failed request.
 * @param {string} [relativeUrl=''] - Request URL relative to the API base.
 * @returns {string[]} A non-empty array of error message strings.
 */
function buildMessages(responseBody, httpStatusCode = 0, relativeUrl = '') {
  const normalizedResponseBody = normalizeErrorResponseBody(responseBody)

  // Null/undefined body  -  nothing to parse, return a generic fallback.
  if (!normalizedResponseBody) {
    return ['The request failed.']
  }

  // Plain string body (rare, but some endpoints do this).
  if (typeof normalizedResponseBody === 'string') {
    return [normalizedResponseBody]
  }

  // Already an array of messages (some custom endpoint shapes).
  if (Array.isArray(normalizedResponseBody)) {
    return normalizedResponseBody.filter(Boolean)
  }

  // RFC 7807 Problem Details with a nested `errors` validation dictionary.
  const validationMessages = flattenProblemDetailsErrors(normalizedResponseBody.errors)
  if (validationMessages.length > 0) {
    return validationMessages
  }

  const curatedProblemDetailsMessage = getCuratedProblemDetailsMessage(
    normalizedResponseBody,
    httpStatusCode,
    relativeUrl,
  )
  if (curatedProblemDetailsMessage) {
    return [curatedProblemDetailsMessage]
  }

  // RFC 7807 `detail` field  -  the most specific single-line description.
  if (
    typeof normalizedResponseBody.detail === 'string' &&
    normalizedResponseBody.detail.trim().length > 0
  ) {
    return [normalizedResponseBody.detail]
  }

  // RFC 7807 `title` field  -  less specific, but better than nothing.
  if (
    typeof normalizedResponseBody.title === 'string' &&
    normalizedResponseBody.title.trim().length > 0
  ) {
    return [normalizedResponseBody.title]
  }

  // Nothing useful found in the body  -  return generic message.
  return ['The request failed.']
}

// --- ApiError Class -----------------------------------------------------------

/**
 * A typed error class thrown by all API methods when a request fails.
 * Carries the HTTP status code, parsed error messages, and the raw response
 * body so callers can inspect them and decide how to react.
 *
 * @property {string} name - Always 'ApiError', for `instanceof` and logging.
 * @property {number} status - HTTP status code (0 for network-level failures).
 * @property {string|null} detail - The RFC 7807 `detail` string, if present.
 * @property {any} data - The raw parsed response body.
 * @property {string[]} messages - All extracted user-facing error messages.
 */
export class ApiError extends Error {
  /**
   * @param {string} message - Primary error message (used as `Error.message`).
   * @param {{ status: number, detail: string|null, data: any, messages: string[] }} details
   */
  constructor(message, { status, detail, data, messages }) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.detail = detail
    this.data = data
    this.messages = messages
  }
}

// --- Response Processing Helpers ---------------------------------------------

/**
 * Reads a fetch Response body and returns the parsed value.
 * Returns parsed JSON for JSON responses, text for text responses, or null for
 * empty bodies.
 *
 * @param {Response} fetchResponse - The raw fetch API Response object.
 * @returns {Promise<any>} The parsed body content, or null if the body is empty.
 */
async function parseResponseBody(fetchResponse) {
  const contentType = fetchResponse.headers.get('content-type') ?? ''

  if (isJsonContentType(contentType)) {
    return fetchResponse.json()
  }

  // For non-JSON responses, fall back to text.  Return null if the body is empty.
  const responseText = await fetchResponse.text()
  return parseTextResponse(responseText)
}

/**
 * Reads a failed Response, parses the body, and builds a descriptive ApiError.
 *
 * @param {Response} failedResponse - A fetch Response with a non-ok status code.
 * @param {string} relativeUrl - Request URL relative to the API base.
 * @returns {Promise<ApiError>} A fully populated ApiError instance.
 */
async function createApiErrorFromResponse(failedResponse, relativeUrl) {
  let parsedErrorBody = null

  try {
    parsedErrorBody = await parseResponseBody(failedResponse)
  } catch {
    // If we can't parse the error body, we still want to throw an ApiError
    // rather than a generic parse exception  -  so we swallow this and proceed
    // with parsedErrorBody = null.
  }

  const httpStatusCode = failedResponse.status
  const normalizedErrorBody = normalizeErrorResponseBody(parsedErrorBody)
  let errorDetail = null
  if (typeof normalizedErrorBody?.detail === 'string') {
    errorDetail = normalizedErrorBody.detail
  }

  const errorMessages = buildMessages(normalizedErrorBody, httpStatusCode, relativeUrl)

  return new ApiError(errorMessages[0], {
    status: httpStatusCode,
    detail: errorDetail,
    data: normalizedErrorBody,
    messages: errorMessages,
  })
}

/**
 * Creates a generic ApiError for use when a request fails at the network
 * level (e.g. offline, DNS failure) before any HTTP response is received.
 *
 * @returns {ApiError}
 */
function createNetworkError() {
  return new ApiError('The request failed.', {
    status: 0, // 0 indicates no HTTP response was received
    detail: null,
    data: null,
    messages: ['The request failed.'],
  })
}

// --- Error Handling Helpers ---------------------------------------------------

/**
 * If the error is a 401 Unauthorized and the caller has opted into automatic
 * redirect behaviour, navigates the user to the home page (which will show the
 * login form) and returns true so the caller knows to stop processing.
 *
 * @param {ApiError} apiError - The error to inspect.
 * @param {boolean} shouldRedirectOnUnauthorized - Whether the caller wants auto-redirect.
 * @returns {boolean} True if a redirect was triggered (caller should return null).
 */
function handleUnauthorizedError(apiError, shouldRedirectOnUnauthorized) {
  if (shouldRedirectOnUnauthorized && apiError.status === 401) {
    window.location.assign('/')
    return true
  }

  return false
}

/**
 * Displays each error message in the array as a toast notification.
 *
 * @param {string[]} errorMessages - The messages to show.
 */
function showErrorToasts(errorMessages) {
  errorMessages.forEach((message) => toast.error(message))
}

// --- Core HTTP Execution ------------------------------------------------------

/**
 * Performs the raw fetch call with standard credentials and headers.
 * Throws an ApiError if the server returns a non-ok status.
 *
 * @param {string} httpMethod - HTTP verb ('get', 'post', 'put', 'delete', etc.).
 * @param {string} relativeUrl - The URL path relative to BASE_URL.
 * @param {any} [requestBody] - Optional request payload; serialised to JSON if provided.
 * @returns {Promise<Response>} The raw fetch Response on success.
 * @throws {ApiError} If the response status is not in the 2xx range.
 */
async function fetchRequest(httpMethod, relativeUrl, requestBody) {
  const requestHeaders = { ...DEFAULT_HEADERS }

  // Only set Content-Type for requests that carry a body.
  if (requestBody !== undefined && requestBody !== null) {
    requestHeaders['Content-Type'] = 'application/json'
  }

  let requestPayload
  if (requestBody !== undefined && requestBody !== null) {
    requestPayload = JSON.stringify(requestBody)
  }

  const fetchResponse = await fetch(`${BASE_URL}${relativeUrl}`, {
    method: httpMethod,
    headers: requestHeaders,
    credentials: 'include', // send HttpOnly session cookies automatically
    body: requestPayload,
  })

  if (!fetchResponse.ok) {
    throw await createApiErrorFromResponse(fetchResponse, relativeUrl)
  }

  return fetchResponse
}

/**
 * Executes a standard JSON request (GET/POST/PUT/DELETE) with optional loading
 * tracking, toast notifications, and automatic 401 redirect.
 *
 * @param {string} httpMethod - HTTP verb.
 * @param {string} relativeUrl - URL path relative to BASE_URL.
 * @param {any} [requestBody] - Optional JSON body payload.
 * @param {{ redirectOnUnauthorized?: boolean, showToast?: boolean, trackLoading?: boolean }} [requestOptions]
 * @returns {Promise<any>} The parsed response body, or null on redirected 401.
 * @throws {ApiError} On non-401 errors (after optionally showing toasts).
 */
async function executeRequest(httpMethod, relativeUrl, requestBody, requestOptions = {}) {
  const { redirectOnUnauthorized = true, showToast = true, trackLoading = true } = requestOptions

  if (trackLoading) {
    beginRequest()
  }

  try {
    const fetchResponse = await fetchRequest(httpMethod, relativeUrl, requestBody)
    return await parseResponseBody(fetchResponse)
  } catch (caughtError) {
    // Normalise any non-ApiError (e.g. a network TypeError) into an ApiError.
    let apiError = createNetworkError()
    if (caughtError instanceof ApiError) {
      apiError = caughtError
    }

    // Redirect to login and bail out without throwing if it's a 401.
    if (handleUnauthorizedError(apiError, redirectOnUnauthorized)) {
      return null
    }

    if (showToast) {
      showErrorToasts(apiError.messages)
    }

    throw apiError
  } finally {
    // Always decrement the counter, even if the request threw.
    if (trackLoading) {
      endRequest()
    }
  }
}

/**
 * Executes a request described by a config object (used by the `api.request()`
 * method for callers that prefer the axios-style `{ method, url, data }` shape).
 *
 * @param {{ method: string, url: string, data?: any }} requestConfig
 * @param {{ redirectOnUnauthorized?: boolean, showToast?: boolean, trackLoading?: boolean }} [requestOptions]
 * @returns {Promise<any>}
 */
async function executeRawRequest(requestConfig, requestOptions = {}) {
  const { redirectOnUnauthorized = true, showToast = true, trackLoading = true } = requestOptions

  if (trackLoading) {
    beginRequest()
  }

  try {
    return await fetchRequest(requestConfig.method, requestConfig.url, requestConfig.data)
  } catch (caughtError) {
    let apiError = createNetworkError()
    if (caughtError instanceof ApiError) {
      apiError = caughtError
    }

    if (handleUnauthorizedError(apiError, redirectOnUnauthorized)) {
      return null
    }

    if (showToast) {
      showErrorToasts(apiError.messages)
    }

    throw apiError
  } finally {
    if (trackLoading) {
      endRequest()
    }
  }
}

// --- Public API Object --------------------------------------------------------

/**
 * The central API client used throughout the application.
 * All methods return Promises that resolve with the parsed response body.
 * On failure they throw an `ApiError` (after optionally showing toast notifications).
 *
 * Options accepted by all methods:
 * @param {boolean} [options.redirectOnUnauthorized=true] - Navigate to "/" on 401.
 * @param {boolean} [options.showToast=true] - Show react-toastify error toasts on failure.
 * @param {boolean} [options.trackLoading=true] - Increment/decrement the loading overlay counter.
 */
export const api = {
  /**
   * Performs a GET request.
   * @param {string} relativeUrl - Path relative to /api/.
   * @param {Object} [options]
   * @returns {Promise<any>}
   */
  get(relativeUrl, options) {
    return executeRequest('get', relativeUrl, undefined, options)
  },

  /**
   * Performs a POST request with a JSON body.
   * @param {string} relativeUrl
   * @param {any} requestBody - Data to serialise as the request body.
   * @param {Object} [options]
   * @returns {Promise<any>}
   */
  post(relativeUrl, requestBody, options) {
    return executeRequest('post', relativeUrl, requestBody, options)
  },

  /**
   * Performs a PUT request with a JSON body.
   * @param {string} relativeUrl
   * @param {any} requestBody
   * @param {Object} [options]
   * @returns {Promise<any>}
   */
  put(relativeUrl, requestBody, options) {
    return executeRequest('put', relativeUrl, requestBody, options)
  },

  /**
   * Performs a DELETE request.
   * @param {string} relativeUrl
   * @param {Object} [options]
   * @returns {Promise<any>}
   */
  delete(relativeUrl, options) {
    return executeRequest('delete', relativeUrl, undefined, options)
  },

  /**
   * Performs a request described by a config object (axios-style).
   * @param {{ method: string, url: string, data?: any }} requestConfig
   * @param {Object} [options]
   * @returns {Promise<any>}
   */
  request(requestConfig, options) {
    return executeRawRequest(requestConfig, options)
  },

  /**
   * Uploads an image file using a multipart/form-data POST request.
   * Image files must be sent via FormData rather than JSON, so this method
   * bypasses the standard JSON fetch helper and constructs the request manually.
   *
   * @param {File} imageFile - The image file selected by the user.
   * @param {Object} [options]
   * @returns {Promise<any>} The parsed upload response (e.g. the new image record).
   */
  async uploadImage(imageFile, options = {}) {
    const { redirectOnUnauthorized = true, showToast = true, trackLoading = true } = options

    if (trackLoading) {
      beginRequest()
    }

    try {
      // Build a FormData payload  -  fetch will set the correct multipart boundary
      // automatically when the body is a FormData instance.
      const formData = new FormData()
      formData.append('file', imageFile)

      const fetchResponse = await fetch(`${BASE_URL}images/upload`, {
        method: 'POST',
        headers: { ...DEFAULT_HEADERS }, // no Content-Type  -  let fetch set it with boundary
        credentials: 'include',
        body: formData,
      })

      if (!fetchResponse.ok) {
        throw await createApiErrorFromResponse(fetchResponse)
      }

      return await parseResponseBody(fetchResponse)
    } catch (caughtError) {
      let apiError = createNetworkError()
      if (caughtError instanceof ApiError) {
        apiError = caughtError
      }

      if (handleUnauthorizedError(apiError, redirectOnUnauthorized)) {
        return null
      }
      if (showToast) {
        showErrorToasts(apiError.messages)
      }
      throw apiError
    } finally {
      if (trackLoading) {
        endRequest()
      }
    }
  },
}
