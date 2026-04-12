import { useCallback, useEffect, useState } from 'react'
import { Button, Card, Form, Table } from 'react-bootstrap'
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

const searchStorageKey = 'Usersearch'
const defaultSortBy = 'Email'

/**
 * Admin page for system settings and user administration.
 */
export default function AdminPage() {
  const [systemSettings, setSystemSettings] = useState({
    emailApiKey: '',
    systemEmailAddress: '',
    emailDomainRestriction: '',
    registrationEnabled: true,
  })

  const [items, setItems] = useState([])
  const [search, setSearch] = useState(createSearch(defaultSortBy))
  const [totalFound, setTotalFound] = useState(0)
  const [userToDelete, setUserToDelete] = useState(null)

  const getSettings = useCallback(async () => {
    const response = await api.get('v1/settings')
    if (response) {
      setSystemSettings({
        emailApiKey: response.emailApiKey ?? '',
        systemEmailAddress: response.systemEmailAddress ?? '',
        emailDomainRestriction: response.emailDomainRestriction ?? '',
        registrationEnabled: Boolean(response.registrationEnabled),
      })
    }
  }, [])

  const searchUsers = useCallback(async (page, reset = false, currentSearch) => {
    const nextSearch = reset
      ? createSearch(defaultSortBy)
      : toApiSearch(currentSearch, page)

    setSearch(nextSearch)
    localStorage.setItem(searchStorageKey, JSON.stringify(nextSearch))

    const response = await api.post('v1/users', nextSearch)
    if (response) {
      setItems(response.results ?? [])
      setTotalFound(response.total ?? 0)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    getSettings()

    const cachedSearch = localStorage.getItem(searchStorageKey)
    if (!cachedSearch) {
      searchUsers(0, true, createSearch(defaultSortBy))
      return
    }

    const parsedSearch = JSON.parse(cachedSearch)
    setSearch(parsedSearch)
    searchUsers(parsedSearch.page, false, parsedSearch)
  }, [getSettings, searchUsers])

  async function updateSettings() {
    await api.put('v1/settings', systemSettings)
    toast.success('Settings saved.')
  }

  async function handleSort(column) {
    const nextDirection =
      search.sortBy === column && search.sortDirection === sortDirections.ascending
        ? sortDirections.descending
        : sortDirections.ascending

    const nextSearch = {
      ...search,
      sortBy: column,
      sortDirection: nextDirection,
    }

    setSearch(nextSearch)
    await searchUsers(nextSearch.page, false, nextSearch)
  }

  async function handlePageSizeChange(event) {
    const pageSize = Number(event.target.value)
    const nextSearch = {
      ...search,
      page: 0,
      pageSize,
    }

    setSearch(nextSearch)
    await searchUsers(0, false, nextSearch)
  }

  async function toggleAdministrator(user) {
    await api.get(`v1/user/${user.id}/role/administrator`)

    setItems((currentItems) =>
      currentItems.map((currentUser) =>
        currentUser.id === user.id
          ? { ...currentUser, isAdministrator: !currentUser.isAdministrator }
          : currentUser,
      ),
    )
  }

  async function deleteUser() {
    if (!userToDelete) {
      return
    }

    const response = await api.delete(`v1/user/${userToDelete.id}`)
    if (response) {
      setItems((currentItems) => currentItems.filter((user) => user.id !== userToDelete.id))
    }
  }

  const pageCount = formatPageCount(totalFound, search.pageSize)

  return (
    <>
      <Card className="mt-3 border-secondary">
        <Card.Header className="bg-secondary text-white">
          <h5 className="mb-0">Settings</h5>
        </Card.Header>
        <Card.Body>
          <div style={{ display: 'grid', gap: '1rem', maxWidth: '32rem' }}>
        <Form.Group>
          <Form.Label>Email API Key</Form.Label>
          <Form.Control
            value={systemSettings.emailApiKey}
            onChange={(event) =>
              setSystemSettings((currentSettings) => ({
                ...currentSettings,
                emailApiKey: event.target.value,
              }))
            }
          />
        </Form.Group>

        <Form.Group>
          <Form.Label>System Email Address</Form.Label>
          <Form.Control
            value={systemSettings.systemEmailAddress}
            onChange={(event) =>
              setSystemSettings((currentSettings) => ({
                ...currentSettings,
                systemEmailAddress: event.target.value,
              }))
            }
          />
        </Form.Group>

        <Form.Group>
          <Form.Label>Email Domain Restrictions</Form.Label>
          <Form.Control
            value={systemSettings.emailDomainRestriction}
            onChange={(event) =>
              setSystemSettings((currentSettings) => ({
                ...currentSettings,
                emailDomainRestriction: event.target.value,
              }))
            }
          />
        </Form.Group>

        <Form.Check
          className="mt-2"
          label="Registration Enabled"
          checked={systemSettings.registrationEnabled}
          onChange={(event) =>
            setSystemSettings((currentSettings) => ({
              ...currentSettings,
              registrationEnabled: event.target.checked,
            }))
          }
        />

        <div>
          <Button onClick={updateSettings}>Save Settings</Button>
        </div>
          </div>
        </Card.Body>
      </Card>

      <Card className="mt-4 border-secondary">
        <Card.Header className="bg-secondary text-white">
          <h5 className="mb-0">Users</h5>
        </Card.Header>
        <Card.Body>

      <div className="d-flex flex-wrap justify-content-end gap-2 align-items-center mb-2">
        <Form
          style={{ maxWidth: '28rem', width: '100%' }}
          onSubmit={(event) => {
            event.preventDefault()
            searchUsers(0, false, search)
          }}
          autoComplete="off"
        >
          <div className="input-group search-input-group">
            <Form.Control
              type="text"
              value={search.filterText}
              onChange={(event) =>
                setSearch((currentSearch) => ({
                  ...currentSearch,
                  filterText: event.target.value,
                }))
              }
            />
            <Button type="submit" variant="outline-secondary">
              <i className="bi bi-search me-2" />
              Search
            </Button>
            <span className="input-group-text page-size-label">
              <span>Page</span>
              <span>Size</span>
            </span>
            <Form.Select
              value={search.pageSize}
              onChange={handlePageSizeChange}
              aria-label="Select page size"
              className="flex-grow-0"
              style={{ width: '4.5rem' }}
            >
              {pageSizeOptions.map((sizeOption) => (
                <option key={sizeOption} value={sizeOption}>
                  {sizeOption}
                </option>
              ))}
            </Form.Select>
          </div>
        </Form>
      </div>

      <div className="text-end mb-3">
        <button
          type="button"
          className="btn btn-link btn-sm text-decoration-none"
          onClick={() => searchUsers(0, true, createSearch(defaultSortBy))}
        >
          Reset Search
        </button>
      </div>

      <div className="table-responsive">
        <Table hover size="sm" className="align-middle">
          <thead>
            <tr>
              <th style={{ width: '50%' }}>
                <button
                  type="button"
                  className="btn btn-link text-decoration-none"
                  onClick={() => handleSort('Email')}
                >
                  Email
                  {search.sortBy === 'Email' ? (
                    <i
                      className={`${search.sortDirection === sortDirections.ascending ? 'bi bi-chevron-down' : 'bi bi-chevron-up'} ms-1`}
                    />
                  ) : null}
                </button>
              </th>
              <th style={{ width: '49%' }} />
              <th style={{ width: '1%' }} />
            </tr>
          </thead>

          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>
                  <h6 className="mb-0 px-2">{item.email}</h6>
                </td>
                <td>
                  <Form.Check
                    id={`administrator-${item.id}`}
                    label="Administrator"
                    checked={Boolean(item.isAdministrator)}
                    disabled={Boolean(item.isSelf)}
                    onChange={() => toggleAdministrator(item)}
                  />
                </td>
                <td>
                  <Button variant="danger" size="sm" onClick={() => setUserToDelete(item)}>
                    <i className="bi bi-trash" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>

      <div className="d-flex justify-content-between align-items-center mt-3 flex-wrap gap-3">
        <div className="small text-secondary">Found {totalFound.toLocaleString()}</div>
        <ul className="pagination mb-0">
          {search.page + 1 > 1 ? (
            <li className="page-item">
              <button
                type="button"
                className="page-link"
                onClick={() => searchUsers(search.page - 1, false, search)}
              >
                Previous
              </button>
            </li>
          ) : null}

          <li className="page-item disabled">
            <span className="page-link">
              Page {pageCount === 0 ? 0 : search.page + 1} of {pageCount}
            </span>
          </li>

          {search.page + 1 < pageCount ? (
            <li className="page-item">
              <button
                type="button"
                className="page-link"
                onClick={() => searchUsers(search.page + 1, false, search)}
              >
                Next
              </button>
            </li>
          ) : null}
        </ul>
      </div>

        </Card.Body>
      </Card>

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
