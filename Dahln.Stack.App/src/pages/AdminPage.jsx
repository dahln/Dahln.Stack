import { useEffect, useState } from 'react'
import { Button, Form, Table } from 'react-bootstrap'
import { toast } from 'react-toastify'
import ConfirmDialog from '../components/ConfirmDialog'
import { api } from '../services/apiClient'
import { createSearch, formatPageCount, sortDirections, toApiSearch } from '../utils/models'

const searchStorageKey = 'Usersearch'
const defaultSortBy = 'Email'

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

  useEffect(() => {
    getSettings()

    const cachedSearch = localStorage.getItem(searchStorageKey)
    if (!cachedSearch) {
      searchUsers(0, true)
      return
    }

    const parsedSearch = JSON.parse(cachedSearch)
    setSearch(parsedSearch)
    searchUsers(parsedSearch.page, false, parsedSearch)
  }, [])

  async function getSettings() {
    const response = await api.get('api/v1/settings')
    if (response) {
      setSystemSettings({
        emailApiKey: response.emailApiKey ?? '',
        systemEmailAddress: response.systemEmailAddress ?? '',
        emailDomainRestriction: response.emailDomainRestriction ?? '',
        registrationEnabled: Boolean(response.registrationEnabled),
      })
    }
  }

  async function updateSettings() {
    await api.put('api/v1/settings', systemSettings)
    toast.success('Settings saved.')
  }

  async function searchUsers(page, reset = false, currentSearch = search) {
    const nextSearch = reset
      ? createSearch(defaultSortBy)
      : toApiSearch(currentSearch, page)

    setSearch(nextSearch)
    localStorage.setItem(searchStorageKey, JSON.stringify(nextSearch))

    const response = await api.post('api/v1/users', nextSearch)
    if (response) {
      setItems(response.results ?? [])
      setTotalFound(response.total ?? 0)
    }
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

  async function toggleAdministrator(user) {
    await api.get(`api/v1/user/${user.id}/role/administrator`)
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

    const response = await api.delete(`api/v1/user/${userToDelete.id}`)
    if (response) {
      setItems((currentItems) => currentItems.filter((user) => user.id !== userToDelete.id))
    }
  }

  const pageCount = formatPageCount(totalFound, search.pageSize)

  return (
    <>
      <div className="mt-3">
        <h3>Settings</h3>
        <hr />
      </div>
      <div className="settings-grid">
        <Form.Group>
          <Form.Label>Email API Key</Form.Label>
          <Form.Control value={systemSettings.emailApiKey} onChange={(event) => setSystemSettings((current) => ({ ...current, emailApiKey: event.target.value }))} />
        </Form.Group>
        <Form.Group>
          <Form.Label>System Email Address</Form.Label>
          <Form.Control value={systemSettings.systemEmailAddress} onChange={(event) => setSystemSettings((current) => ({ ...current, systemEmailAddress: event.target.value }))} />
        </Form.Group>
        <Form.Group>
          <Form.Label>Email Domain Restrictions</Form.Label>
          <Form.Control value={systemSettings.emailDomainRestriction} onChange={(event) => setSystemSettings((current) => ({ ...current, emailDomainRestriction: event.target.value }))} />
        </Form.Group>
        <Form.Check
          className="mt-2"
          label="Registration Enabled"
          checked={systemSettings.registrationEnabled}
          onChange={(event) => setSystemSettings((current) => ({ ...current, registrationEnabled: event.target.checked }))}
        />
        <div>
          <Button onClick={updateSettings}>Save Settings</Button>
        </div>
      </div>
      <div className="mt-5">
        <h3>Users</h3>
        <hr />
      </div>
      <div className="d-flex flex-wrap justify-content-end gap-2 align-items-center mb-2">
        <Form className="search-form" onSubmit={(event) => {
          event.preventDefault()
          searchUsers(0, false)
        }} autoComplete="off">
          <div className="input-group">
            <Form.Control
              type="text"
              value={search.filterText}
              onChange={(event) => setSearch((currentSearch) => ({ ...currentSearch, filterText: event.target.value }))}
            />
            <Button type="submit" variant="outline-secondary">
              <i className="bi bi-search me-2" />Search
            </Button>
          </div>
        </Form>
      </div>
      <div className="text-end mb-3">
        <button type="button" className="btn btn-link btn-sm text-decoration-none" onClick={() => searchUsers(0, true)}>
          Reset Search
        </button>
      </div>
      <div className="table-responsive">
        <Table hover size="sm" className="align-middle">
          <thead>
            <tr>
              <th style={{ width: '50%' }}>
                <button type="button" className="btn btn-link table-sort" onClick={() => handleSort('Email')}>
                  Email
                  {search.sortBy === 'Email' ? (
                    <i className={`${search.sortDirection === sortDirections.ascending ? 'bi bi-chevron-down' : 'bi bi-chevron-up'} ms-1`} />
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
        <div className="search-found">Found {totalFound.toLocaleString()}</div>
        <ul className="pagination mb-0">
          {search.page + 1 > 1 ? (
            <li className="page-item">
              <button type="button" className="page-link" onClick={() => searchUsers(search.page - 1, false)}>
                Previous
              </button>
            </li>
          ) : null}
          <li className="page-item disabled">
            <span className="page-link">Page {pageCount === 0 ? 0 : search.page + 1} of {pageCount}</span>
          </li>
          {search.page + 1 < pageCount ? (
            <li className="page-item">
              <button type="button" className="page-link" onClick={() => searchUsers(search.page + 1, false)}>
                Next
              </button>
            </li>
          ) : null}
        </ul>
      </div>
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
