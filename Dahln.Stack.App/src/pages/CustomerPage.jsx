import { useEffect, useState } from 'react'
import { Button, Col, Form, Row } from 'react-bootstrap'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import ConfirmDialog from '../components/ConfirmDialog'
import { api } from '../services/apiClient'
import {
  createEmptyCustomer,
  genderOptions,
  normalizeCustomerForApi,
  toDateInputValue,
} from '../utils/models'
import { createResizedImageDataUrl } from '../utils/image'

export default function CustomerPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [customer, setCustomer] = useState(createEmptyCustomer())
  const [isLocked, setIsLocked] = useState(Boolean(id))
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  useEffect(() => {
    if (!id) {
      setCustomer(createEmptyCustomer())
      setIsLocked(false)
      return
    }

    loadCustomer(id)
  }, [id])

  async function loadCustomer(customerId) {
    const response = await api.get(`api/v1/customer/${customerId}`)
    if (!response) {
      toast.error('Customer failed to load.')
      return
    }

    setCustomer({
      ...createEmptyCustomer(),
      ...response,
      birthDate: toDateInputValue(response.birthDate),
      active: Boolean(response.active),
      gender: response.gender ?? 0,
    })
    setIsLocked(true)
  }

  function updateField(field, value) {
    setCustomer((currentCustomer) => ({
      ...currentCustomer,
      [field]: value,
    }))
  }

  async function saveCustomer() {
    const payload = normalizeCustomerForApi(customer)

    if (!id) {
      const response = await api.post('api/v1/customer', payload)
      if (response) {
        navigate(`/customer/${response}`)
      }
      return
    }

    await api.put(`api/v1/customer/${id}`, payload)
    setIsLocked(true)
  }

  async function cancelChanges() {
    if (!id) {
      setCustomer(createEmptyCustomer())
      return
    }

    await loadCustomer(id)
  }

  async function deleteCustomer() {
    const response = await api.delete(`api/v1/customer/${id}`)
    if (response) {
      navigate('/customers')
    }
  }

  async function handleImageChange(event) {
    const [file] = event.target.files ?? []
    if (!file) {
      return
    }

    try {
      const imageBase64 = await createResizedImageDataUrl(file)
      updateField('imageBase64', imageBase64)
    } catch (error) {
      toast.error(error.message)
    }
  }

  return (
    <>
      <div className="mb-3">
        <Link to="/customers">
          <i className="bi bi-arrow-left-short" /> Back to Search
        </Link>
      </div>
      <Row>
        <Col>
          <h3>
            Customer{' '}
            {isLocked ? (
              <button type="button" className="btn btn-link" onClick={() => setIsLocked(false)}>
                Edit
              </button>
            ) : null}
          </h3>
        </Col>
      </Row>
      <fieldset disabled={isLocked}>
        <Row>
          <Col lg={6}>
            <Row>
              <Col md={6} className="text-center">
                <div className="image-frame mb-3">
                  {customer.imageBase64 ? (
                    <img src={customer.imageBase64} alt="Customer" className="img-fluid rounded-4" />
                  ) : (
                    <i className="bi bi-person-square business-logo-placeholder mt-md-5 mb-2" />
                  )}
                </div>
                {!isLocked ? (
                  <>
                    <label className="btn btn-outline-primary w-100 mb-2">
                      <input type="file" hidden accept="image/*" onChange={handleImageChange} />
                      Upload File (32 MB size limit)
                    </label>
                    {customer.imageBase64 ? (
                      <Button variant="outline-danger" className="w-100" onClick={() => updateField('imageBase64', null)}>
                        Remove Image
                      </Button>
                    ) : null}
                  </>
                ) : null}
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3" controlId="customerName">
                  <Form.Label>Name</Form.Label>
                  <Form.Control value={customer.name ?? ''} onChange={(event) => updateField('name', event.target.value)} />
                </Form.Group>
                <Form.Group className="mb-3" controlId="customerBirthDate">
                  <Form.Label>Birth Date</Form.Label>
                  <Form.Control type="date" value={customer.birthDate ?? ''} onChange={(event) => updateField('birthDate', event.target.value)} />
                </Form.Group>
                <Form.Group className="mb-3" controlId="customerGender">
                  <Form.Label>Gender</Form.Label>
                  <Form.Select value={customer.gender ?? 0} onChange={(event) => updateField('gender', Number(event.target.value))}>
                    {genderOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
                <Form.Check
                  id="customerActive"
                  label="Active"
                  checked={Boolean(customer.active)}
                  onChange={(event) => updateField('active', event.target.checked)}
                />
              </Col>
            </Row>
          </Col>
          <Col lg={6}>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3" controlId="customerEmail">
                  <Form.Label>Email</Form.Label>
                  <Form.Control value={customer.email ?? ''} onChange={(event) => updateField('email', event.target.value)} />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3" controlId="customerPhone">
                  <Form.Label>Phone</Form.Label>
                  <Form.Control value={customer.phone ?? ''} onChange={(event) => updateField('phone', event.target.value)} />
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-3" controlId="customerAddress">
              <Form.Label>Address</Form.Label>
              <Form.Control value={customer.address ?? ''} onChange={(event) => updateField('address', event.target.value)} />
            </Form.Group>
            <Row>
              <Col md={4}>
                <Form.Group className="mb-3" controlId="customerCity">
                  <Form.Label>City</Form.Label>
                  <Form.Control value={customer.city ?? ''} onChange={(event) => updateField('city', event.target.value)} />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3" controlId="customerState">
                  <Form.Label>State</Form.Label>
                  <Form.Control value={customer.state ?? ''} onChange={(event) => updateField('state', event.target.value)} />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3" controlId="customerPostal">
                  <Form.Label>Postal</Form.Label>
                  <Form.Control value={customer.postal ?? ''} onChange={(event) => updateField('postal', event.target.value)} />
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-3" controlId="customerNotes">
              <Form.Label>Notes</Form.Label>
              <Form.Control as="textarea" rows={7} value={customer.notes ?? ''} onChange={(event) => updateField('notes', event.target.value)} />
            </Form.Group>
          </Col>
        </Row>
      </fieldset>
      <hr />
      {!isLocked ? (
        <Row>
          <Col md={6}>
            {id ? (
              <Button variant="warning" onClick={() => setIsDeleteDialogOpen(true)}>
                Delete
              </Button>
            ) : null}
          </Col>
          <Col md={6} className="text-md-end d-flex justify-content-md-end gap-2 flex-wrap">
            {id ? (
              <Button variant="outline-danger" onClick={cancelChanges}>
                Cancel Changes
              </Button>
            ) : null}
            <Button onClick={saveCustomer}>Save</Button>
          </Col>
        </Row>
      ) : null}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        title="Delete Customer"
        message="Are you sure you want to delete this customer?"
        confirmLabel="Delete"
        onCancel={() => setIsDeleteDialogOpen(false)}
        onConfirm={async () => {
          setIsDeleteDialogOpen(false)
          await deleteCustomer()
        }}
      />
    </>
  )
}
