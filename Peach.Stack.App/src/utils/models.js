// --- Sort Direction Constants -------------------------------------------------

/**
 * Numeric constants used for the `sortDirection` field in API search requests.
 * Matches the server-side sort direction enum.
 */
export const sortDirections = {
  descending: -1,
  ascending: 1,
}

// --- Gender Lookup Data -------------------------------------------------------

/**
 * List of gender options used to populate select/radio inputs.
 * Values correspond to the server-side Gender enum.
 */
export const genderOptions = [
  { value: 0, label: 'Not Specified' },
  { value: 1, label: 'Male' },
  { value: 2, label: 'Female' },
]

/**
 * A keyed lookup map derived from `genderOptions` that maps a numeric gender
 * value to its human-readable label. E.g. genderLabels[1] === 'Male'.
 */
export const genderLabels = Object.fromEntries(
  genderOptions.map((option) => [option.value, option.label]),
)

// --- Pagination Constants -----------------------------------------------------

/**
 * Allowed page-size choices shown in pagination dropdowns throughout the app.
 * These values are passed directly to API requests as the `pageSize` field.
 */
export const pageSizeOptions = [10, 15, 25, 50]

// --- Search Object Factories --------------------------------------------------

/**
 * Creates a fresh search state object with sensible defaults, ready to be
 * passed to an API list/search endpoint.
 *
 * @param {string} [defaultSortBy=''] - The column name to sort by initially.
 * @returns {{ filterText: string, page: number, pageSize: number, sortBy: string, sortDirection: number }}
 */
export function createSearch(defaultSortBy = '') {
  return {
    filterText: '',
    page: 0,
    pageSize: 15,
    sortBy: defaultSortBy,
    sortDirection: sortDirections.ascending,
  }
}

/**
 * Creates a blank Customer record with all fields at their zero/empty defaults.
 * Used when opening the "new customer" form so all inputs start empty.
 *
 * @returns {Object} A customer object with every property initialised to null/empty.
 */
export function createEmptyCustomer() {
  return {
    id: null,
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    postal: '',
    birthDate: null,
    notes: '',
    gender: 0,
    active: false,
    imageBase64: null,
    createdOn: null,
    updateOn: null,
  }
}

// --- Search Serialisation Helpers ---------------------------------------------

/**
 * Converts a local search state object into the shape expected by the API,
 * optionally overriding the page number (e.g. when changing page size).
 *
 * @param {Object} searchState - The current search/filter/sort state from component state.
 * @param {number} [pageOverride] - If provided, use this page number instead of the one
 *   stored in `searchState`. Useful when resetting to page 0 after a filter change.
 * @returns {Object} A sanitised search payload ready to send to the API.
 */
export function toApiSearch(searchState, pageOverride) {
  let page = searchState.page
  if (typeof pageOverride === 'number') {
    page = pageOverride
  }

  let pageSize = 15
  if (Number.isFinite(Number(searchState.pageSize))) {
    pageSize = Math.max(1, Number(searchState.pageSize))
  }

  return {
    filterText: searchState.filterText ?? '',

    // Prefer the explicit override; otherwise use whatever page is in state.
    page,

    // Guard against non-numeric pageSize values; fall back to 15.
    pageSize,

    sortBy: searchState.sortBy,
    sortDirection: searchState.sortDirection,
  }
}

/**
 * Calculates the total number of pages for a result set.
 *
 * @param {number} totalRecords - The total number of matching records reported by the API.
 * @param {number} pageSize - How many records are shown per page.
 * @returns {number} The total page count, or 0 if `totalRecords` is falsy/non-positive.
 */
export function formatPageCount(totalRecords, pageSize) {
  // Guard: if there are no records there are no pages.
  if (!totalRecords || totalRecords <= 0) {
    return 0
  }

  return Math.ceil(totalRecords / pageSize)
}

/**
 * Converts a UTC date string or Date object into the "YYYY-MM-DD" format
 * required by HTML `<input type="date">` elements.
 *
 * @param {string|Date|null|undefined} dateValue - The date to format.
 * @returns {string} A "YYYY-MM-DD" string, or an empty string if the input is
 *   absent or unparseable.
 */
export function toDateInputValue(dateValue) {
  // Return empty string for null/undefined/empty so the input shows as blank.
  if (!dateValue) {
    return ''
  }

  const parsedDate = new Date(dateValue)

  // Return empty string if the date couldn't be parsed (e.g. malformed string).
  if (Number.isNaN(parsedDate.getTime())) {
    return ''
  }

  // ISO 8601 format: "2024-06-15T00:00:00.000Z" -> take the first 10 chars.
  return parsedDate.toISOString().slice(0, 10)
}

/**
 * Normalises a Customer object before sending it to the API  -  ensures
 * birthDate is null (not empty string), gender is a number, and active is
 * a boolean, regardless of how the form controls store them.
 *
 * @param {Object} customer - The raw customer object as held in component state.
 * @returns {Object} A copy of the customer with coerced field types.
 */
export function normalizeCustomerForApi(customer) {
  return {
    ...customer,

    // HTML date inputs produce "" when cleared; the API expects explicit null.
    birthDate: customer.birthDate || null,

    // Select inputs return strings; the API expects a numeric enum value.
    gender: Number(customer.gender),

    // Checkboxes can return truthy strings; the API expects a real boolean.
    active: Boolean(customer.active),

    // Empty string from a cleared image input should be sent as null.
    imageBase64: customer.imageBase64 || null,
  }
}
