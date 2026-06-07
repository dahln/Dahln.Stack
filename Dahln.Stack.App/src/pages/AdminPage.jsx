import './AdminPage.css'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import ConfirmDialog from '../components/ConfirmDialog'
import { api } from '../services/apiClient'
import {
  createSearch,
  formatPageCount,
  pageSizeOptions,
  sortDirections,
  toApiSearch,
} from '../utils/models'

// --- Constants ----------------------------------------------------------------

/** localStorage key used to persist the user-list search state across page reloads */
const USER_SEARCH_STORAGE_KEY = 'Usersearch'

/** Default column to sort the user list by */
const DEFAULT_SORT_COLUMN = 'Email'

/**
 * AdminPage  -  restricted to administrators.
 *
 * Three sections:
 *   1. System Settings  -  email API key, sender address, domain restriction, registration toggle
 *   2. Document Store   -  configure the MongoDB connection string
 *   3. Users            -  search, paginate, toggle admin role, and delete users
 */
export default function AdminPage() {
  // --- State: System Settings -----------------------------------------------

  /** All editable fields for the system-settings form, kept in a single object */
  const [systemSettings, setSystemSettings] = useState({
    emailApiKey: '',
    systemEmailAddress: '',
    emailDomainRestriction: '',
    registrationEnabled: true,
  })

  // --- State: MongoDB Connection --------------------------------------------

  /** True when the server already has a connection string stored (value is hidden) */
  const [hasMongoConnectionString, setHasMongoConnectionString] = useState(false)

  /** True when the stored connection string has been successfully verified */
  const [isMongoConnectionVerified, setIsMongoConnectionVerified] = useState(false)

  /** The connection string the admin is about to save (cleared after save) */
  const [mongoConnectionString, setMongoConnectionString] = useState('')

  /** Busy flag  -  prevents double-clicks on the save button */
  const [isSavingMongoConnection, setIsSavingMongoConnection] = useState(false)

  /** User-facing status message in the Document Store card */
  const [mongoConnectionSuccess, setMongoConnectionSuccess] = useState('')

  // --- State: User Search ---------------------------------------------------

  /** The current page of users returned from the search API */
  const [userList, setUserList] = useState([])

  /** Current search/sort/pagination state object */
  const [search, setSearch] = useState(createSearch(DEFAULT_SORT_COLUMN))

  /** Total number of matching users (used to compute page count) */
  const [totalFound, setTotalFound] = useState(0)

  /** The user record targeted for deletion  -  drives the ConfirmDialog */
  const [userToDelete, setUserToDelete] = useState(null)

  // --- Load Settings --------------------------------------------------------

  /**
   * Fetches current system settings and MongoDB connection status from the server.
   * Wrapped in useCallback so it can be listed as a stable dependency in the
   * initial useEffect without causing infinite re-renders.
   */
  const getSettings = useCallback(async () => {
    const response = await api.get('v1/settings')
    if (response) {
      setSystemSettings({
        emailApiKey: response.emailApiKey ?? '',
        systemEmailAddress: response.systemEmailAddress ?? '',
        emailDomainRestriction: response.emailDomainRestriction ?? '',
        registrationEnabled: Boolean(response.registrationEnabled),
      })
      setHasMongoConnectionString(response.hasMongoDBConnectionString ?? false)
      setIsMongoConnectionVerified(response.mongoDBConnectionVerified ?? false)
    }
  }, [])

  // --- User Search ----------------------------------------------------------

  /**
   * Submits a paginated user search to the API.
   *
   * @param {number}  page          - Zero-based page index to request
   * @param {boolean} reset         - When true, resets filters/sort to defaults
   * @param {object}  currentSearch - The search state to derive the next query from
   */
  const searchUsers = useCallback(async (page, reset = false, currentSearch) => {
    let nextSearch = toApiSearch(currentSearch, page)
    if (reset) {
      nextSearch = createSearch(DEFAULT_SORT_COLUMN)
    }

    setSearch(nextSearch)
    localStorage.setItem(USER_SEARCH_STORAGE_KEY, JSON.stringify(nextSearch))

    const response = await api.post('v1/users', nextSearch)
    if (response) {
      setUserList(response.results ?? [])
      setTotalFound(response.total ?? 0)
    }
  }, [])

  // --- Initial Data Load ----------------------------------------------------

  useEffect(() => {
    // Load system settings immediately
    getSettings()

    // Restore the last-used search state from localStorage, or start fresh
    const cachedSearch = localStorage.getItem(USER_SEARCH_STORAGE_KEY)
    if (!cachedSearch) {
      searchUsers(0, true, createSearch(DEFAULT_SORT_COLUMN))
      return
    }

    const parsedSearch = JSON.parse(cachedSearch)
    setSearch(parsedSearch)
    searchUsers(parsedSearch.page, false, parsedSearch)
  }, [getSettings, searchUsers])

  // --- Settings Handlers ----------------------------------------------------

  /**
   * Persists the current system-settings form values to the server.
   */
  async function updateSettings() {
    await api.put('v1/settings', systemSettings)
    toast.success('Settings saved.')
  }

  /**
   * Toggles the sort direction for a column, or switches to a new column
   * (defaulting to ascending).
   *
   * @param {string} column - The column name to sort by
   */
  async function handleSort(column) {
    let nextDirection = sortDirections.ascending
    if (search.sortBy === column && search.sortDirection === sortDirections.ascending) {
      nextDirection = sortDirections.descending
    }

    const nextSearch = {
      ...search,
      sortBy: column,
      sortDirection: nextDirection,
    }

    setSearch(nextSearch)
    await searchUsers(nextSearch.page, false, nextSearch)
  }

  /**
   * Updates the page size when the user changes the dropdown, then re-runs
   * the search starting from page 0 so results are consistent.
   */
  async function handlePageSizeChange(changeEvent) {
    const selectedPageSize = Number(changeEvent.target.value)
    const nextSearch = {
      ...search,
      page: 0,
      pageSize: selectedPageSize,
    }

    setSearch(nextSearch)
    await searchUsers(0, false, nextSearch)
  }

  /**
   * Toggles the administrator role for a user by calling the toggle endpoint,
   * then updates the local list optimistically.
   *
   * @param {object} userRecord - The user row from the current search results
   */
  async function toggleAdministrator(userRecord) {
    await api.get(`v1/user/${userRecord.id}/role/administrator`)

    setUserList((currentUserList) =>
      currentUserList.map((currentUser) => {
        if (currentUser.id === userRecord.id) {
          return { ...currentUser, isAdministrator: !currentUser.isAdministrator }
        }

        return currentUser
      }),
    )
  }

  // --- MongoDB Handlers -----------------------------------------------------

  /**
   * Saves a new (or replacement) MongoDB connection string to the server.
   * Clears the input field on success so the sensitive value is not left on screen.
   */
  async function saveMongoConnectionString() {
    if (!mongoConnectionString.trim()) {
      return
    }

    setIsSavingMongoConnection(true)
    setMongoConnectionSuccess('')

    try {
      await api.put('v1/settings', {
        ...systemSettings,
        mongoDBConnectionString: mongoConnectionString.trim(),
      })

      setHasMongoConnectionString(true)
      setIsMongoConnectionVerified(false)
      setMongoConnectionString('')
      setMongoConnectionSuccess('Connection string saved.')
    } finally {
      setIsSavingMongoConnection(false)
    }
  }

  /**
   * Removes the stored MongoDB connection string from the server, effectively
   * disabling the document store.
   */
  async function clearMongoConnectionString() {
    setIsSavingMongoConnection(true)
    setMongoConnectionSuccess('')

    try {
      await api.put('v1/settings', {
        ...systemSettings,
        mongoDBConnectionString: '',
      })

      setHasMongoConnectionString(false)
      setIsMongoConnectionVerified(false)
      setMongoConnectionString('')
      setMongoConnectionSuccess('Document store connection cleared.')
    } finally {
      setIsSavingMongoConnection(false)
    }
  }

  // --- User Actions ---------------------------------------------------------

  /**
   * Deletes the user currently stored in `userToDelete` and removes them from
   * the local list on success.
   */
  async function deleteUser() {
    if (!userToDelete) {
      return
    }

    const response = await api.delete(`v1/user/${userToDelete.id}`)
    if (response) {
      setUserList((currentUserList) =>
        currentUserList.filter((userRecord) => userRecord.id !== userToDelete.id),
      )
    }
  }

  // --- Derived Values -------------------------------------------------------

  /** Total number of pages for the current search result set */
  const totalPageCount = formatPageCount(totalFound, search.pageSize)

  // --- Render ---------------------------------------------------------------

  return (
    <>
      <div className="row mt-3 g-3 align-items-start">
        {/* -- System Settings Card -- */}
        <div className="col-12 col-md-6">
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">Settings</h5>
            </div>

            <div className="card-body">
              <div style={{ display: 'grid', gap: '1rem', maxWidth: '32rem' }}>
                <div>
                  <label className="form-label" htmlFor="settingsEmailApiKey">Email API Key</label>
                  <input
                    id="settingsEmailApiKey"
                    className="form-control"
                    value={systemSettings.emailApiKey}
                    onChange={(changeEvent) =>
                      setSystemSettings((currentSettings) => ({
                        ...currentSettings,
                        emailApiKey: changeEvent.target.value,
                      }))
                    }
                  />
                </div>

                <div>
                  <label className="form-label" htmlFor="settingsSystemEmailAddress">System Email Address</label>
                  <input
                    id="settingsSystemEmailAddress"
                    className="form-control"
                    value={systemSettings.systemEmailAddress}
                    onChange={(changeEvent) =>
                      setSystemSettings((currentSettings) => ({
                        ...currentSettings,
                        systemEmailAddress: changeEvent.target.value,
                      }))
                    }
                  />
                </div>

                <div>
                  <label className="form-label" htmlFor="settingsEmailDomainRestriction">Email Domain Restrictions</label>
                  <input
                    id="settingsEmailDomainRestriction"
                    className="form-control"
                    value={systemSettings.emailDomainRestriction}
                    onChange={(changeEvent) =>
                      setSystemSettings((currentSettings) => ({
                        ...currentSettings,
                        emailDomainRestriction: changeEvent.target.value,
                      }))
                    }
                  />
                </div>

                <div className="form-check mt-2">
                  <input
                    id="settingsRegistrationEnabled"
                    className="form-check-input"
                    type="checkbox"
                    checked={systemSettings.registrationEnabled}
                    onChange={(changeEvent) =>
                      setSystemSettings((currentSettings) => ({
                        ...currentSettings,
                        registrationEnabled: changeEvent.target.checked,
                      }))
                    }
                  />
                  <label className="form-check-label" htmlFor="settingsRegistrationEnabled">
                    Registration Enabled
                  </label>
                </div>

                <div>
                  <button type="button" className="btn btn-primary" onClick={updateSettings}>
                    Save Settings
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* -- Document Store Card -- */}
        <div className="col-12 col-md-6">
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">Document Store</h5>
            </div>

            <div className="card-body">
              <p className="text-muted mb-3">
                Documents and images are stored in MongoDB. Provide a connection string to any
                MongoDB instance (self-hosted, cloud, Atlas, etc.).
              </p>

              {/* Connection status badge */}
              <div className="mb-3 d-flex align-items-center gap-2">
                <span className="small text-secondary">Status:</span>
                {(() => {
                  if (isMongoConnectionVerified) {
                    return <span className="badge bg-success">Connected</span>
                  }

                  if (hasMongoConnectionString) {
                    return <span className="badge bg-warning text-dark">Not verified</span>
                  }

                  return <span className="badge bg-danger">Not connected</span>
                })()}
              </div>

              {mongoConnectionSuccess && (
                <div className="alert alert-success py-2 small">{mongoConnectionSuccess}</div>
              )}

              {hasMongoConnectionString && (
                <div className="mb-3 d-flex align-items-center gap-2 flex-wrap">
                  <span className="small text-secondary">A connection string is stored.</span>

                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger"
                    onClick={clearMongoConnectionString}
                    disabled={isSavingMongoConnection}
                  >
                    Clear Connection String
                  </button>
                </div>
              )}

              {/* New / replacement connection string form */}
              <form
                onSubmit={(submitEvent) => {
                  submitEvent.preventDefault()
                  saveMongoConnectionString()
                }}
              >
                <div style={{ display: 'grid', gap: '1rem', maxWidth: '32rem' }}>
                  <div>
                    <label className="form-label" htmlFor="settingsMongoConnectionString">
                      {(() => {
                        if (hasMongoConnectionString) {
                          return 'Replace Connection String'
                        }

                        return 'Connection String'
                      })()}
                    </label>
                    <input
                      id="settingsMongoConnectionString"
                      className="form-control"
                      type="password"
                      value={mongoConnectionString}
                      onChange={(changeEvent) => setMongoConnectionString(changeEvent.target.value)}
                      placeholder="mongodb://... or mongodb+srv://..."
                      autoComplete="new-password"
                    />
                  </div>

                  <div>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={isSavingMongoConnection || !mongoConnectionString.trim()}
                    >
                      {(() => {
                        if (isSavingMongoConnection) {
                          return 'Saving...'
                        }

                        if (hasMongoConnectionString) {
                          return 'Replace'
                        }

                        return 'Save'
                      })()}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* -- Users Card -- */}
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">Users</h5>
            </div>

            <div className="card-body">
              {/* Search bar + page size selector */}
              <div className="d-flex flex-wrap justify-content-end gap-2 align-items-center mb-2">
                <form
                  style={{ maxWidth: '28rem', width: '100%' }}
                  onSubmit={(submitEvent) => {
                    submitEvent.preventDefault()
                    searchUsers(0, false, search)
                  }}
                  autoComplete="off"
                >
                  <div className="input-group search-input-group">
                    <input
                      className="form-control"
                      type="text"
                      value={search.filterText}
                      onChange={(changeEvent) =>
                        setSearch((currentSearch) => ({
                          ...currentSearch,
                          filterText: changeEvent.target.value,
                        }))
                      }
                    />
                    <button type="submit" className="btn btn-outline-secondary">
                      <i className="bi bi-search me-2" />
                      Search
                    </button>
                    <span className="input-group-text page-size-label">
                      <span>Page</span>
                      <span>Size</span>
                    </span>
                    <select
                      value={search.pageSize}
                      onChange={handlePageSizeChange}
                      aria-label="Select page size"
                      className="form-select flex-grow-0"
                      style={{ width: '4.5rem' }}
                    >
                      {pageSizeOptions.map((sizeOption) => (
                        <option key={sizeOption} value={sizeOption}>
                          {sizeOption}
                        </option>
                      ))}
                    </select>
                  </div>
                </form>
              </div>

              <div className="text-end mb-3">
                <button
                  type="button"
                  className="btn btn-link btn-sm text-decoration-none"
                  onClick={() => searchUsers(0, true, createSearch(DEFAULT_SORT_COLUMN))}
                >
                  Reset Search
                </button>
              </div>

              {/* User table */}
              <div className="table-responsive">
                <table className="table table-hover table-sm align-middle">
                  <thead>
                    <tr>
                      <th style={{ width: '50%' }}>
                        {/* Sortable Email column header */}
                        <button
                          type="button"
                          className="btn btn-link text-decoration-none"
                          onClick={() => handleSort('Email')}
                        >
                          Email
                          {search.sortBy === 'Email' && (
                            <i
                              className={(() => {
                                let iconClassName = 'bi bi-chevron-up ms-1'
                                if (search.sortDirection === sortDirections.ascending) {
                                  iconClassName = 'bi bi-chevron-down ms-1'
                                }
                                return iconClassName
                              })()}
                            />
                          )}
                        </button>
                      </th>
                      <th style={{ width: '49%' }} />
                      <th style={{ width: '1%' }} />
                    </tr>
                  </thead>

                  <tbody>
                    {userList.map((userRecord) => (
                      <tr key={userRecord.id}>
                        <td>
                          <h6 className="mb-0 px-2">{userRecord.email}</h6>
                        </td>
                        <td>
                          {/* Checkbox is disabled for the currently signed-in admin to prevent
                              accidental self-demotion */}
                          <div className="form-check">
                            <input
                              id={`administrator-${userRecord.id}`}
                              className="form-check-input"
                              type="checkbox"
                              checked={Boolean(userRecord.isAdministrator)}
                              disabled={Boolean(userRecord.isSelf)}
                              onChange={() => toggleAdministrator(userRecord)}
                            />
                            <label
                              className="form-check-label"
                              htmlFor={`administrator-${userRecord.id}`}
                            >
                              Administrator
                            </label>
                          </div>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            onClick={() => setUserToDelete(userRecord)}
                          >
                            <i className="bi bi-trash" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination controls */}
              <div className="d-flex justify-content-between align-items-center mt-3 flex-wrap gap-3">
                <div className="small text-secondary">Found {totalFound.toLocaleString()}</div>

                <ul className="pagination mb-0">
                  {/* Previous page  -  hidden on page 1 */}
                  {search.page + 1 > 1 && (
                    <li className="page-item">
                      <button
                        type="button"
                        className="page-link"
                        onClick={() => searchUsers(search.page - 1, false, search)}
                      >
                        Previous
                      </button>
                    </li>
                  )}

                  {/* Current page indicator */}
                  <li className="page-item disabled">
                    <span className="page-link">
                      Page {(() => {
                        if (totalPageCount === 0) {
                          return 0
                        }

                        return search.page + 1
                      })()} of {totalPageCount}
                    </span>
                  </li>

                  {/* Next page  -  hidden on the last page */}
                  {search.page + 1 < totalPageCount && (
                    <li className="page-item">
                      <button
                        type="button"
                        className="page-link"
                        onClick={() => searchUsers(search.page + 1, false, search)}
                      >
                        Next
                      </button>
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* -- Delete User Confirmation Dialog -- */}
      <ConfirmDialog
        isOpen={Boolean(userToDelete)}
        title="Delete User"
        message="Are you sure you want to delete this user?"
        confirmLabel="Delete"
        onCancel={() => setUserToDelete(null)}
        onConfirm={async () => {
          await deleteUser()
          setUserToDelete(null)
        }}
      />
    </>
  )
}
