import { useEffect, useMemo, useState } from 'react'
import { Button, Card, Col, Form, Row } from 'react-bootstrap'
import { QRCodeSVG } from 'qrcode.react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import ConfirmDialog from '../components/ConfirmDialog'
import { useAuth } from '../context/AuthContext'
import { api } from '../services/apiClient'

function createConfirmState() {
  return {
    isOpen: false,
    title: 'Please Confirm',
    message: '',
    confirmLabel: 'Confirm',
    action: null,
  }
}

/**
 * Account management page for profile, password, two-factor auth, and account deletion.
 */
export default function AccountPage() {
  const auth = useAuth()
  const navigate = useNavigate()

  const [newEmail, setNewEmail] = useState('')
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [isOperationsDisabled, setIsOperationsDisabled] = useState(false)
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(null)
  const [isTwoFactorSetupActive, setIsTwoFactorSetupActive] = useState(false)
  const [twoFactorSharedKey, setTwoFactorSharedKey] = useState('')
  const [twoFactorValidationCode, setTwoFactorValidationCode] = useState('')
  const [twoFactorRecoveryCodes, setTwoFactorRecoveryCodes] = useState([])

  const [confirmState, setConfirmState] = useState(createConfirmState)

  useEffect(() => {
    async function loadPage() {
      const [operationsEnabled, twoFactorStatus] = await Promise.all([
        api.get('api/v1/account/operations', {
          redirectOnUnauthorized: false,
          showToast: false,
        }),
        api.get('api/v1/account/2fa', {
          redirectOnUnauthorized: false,
          showToast: false,
        }),
      ])

      setIsOperationsDisabled(operationsEnabled === false)
      setTwoFactorEnabled(Boolean(twoFactorStatus))
    }

    loadPage()
  }, [])

  const qrCodeValue = useMemo(() => {
    if (!twoFactorSharedKey || !auth.user?.email) {
      return ''
    }

    return `otpauth://totp/Dahln.Stack:${auth.user.email}?secret=${twoFactorSharedKey}&issuer=Dahln.Stack&digits=6`
  }, [auth.user?.email, twoFactorSharedKey])

  function openConfirmation(title, message, action, confirmLabel = 'Confirm') {
    setConfirmState({
      isOpen: true,
      title,
      message,
      confirmLabel,
      action,
    })
  }

  async function changeEmail() {
    const normalizedEmail = newEmail.trim()

    const userAlreadyExists = await api.post(
      'api/v1/account/exists',
      { email: normalizedEmail },
      {
        redirectOnUnauthorized: false,
        showToast: false,
      },
    )

    if (userAlreadyExists) {
      toast.error('Email is unavailable.')
      return
    }

    await api.post(
      'manage/info',
      { newEmail: normalizedEmail },
      {
        redirectOnUnauthorized: false,
        showToast: true,
      },
    )

    toast.success('Email changed. Confirm the new address using the email that was sent to you.')
  }

  async function changePassword() {
    if (newPassword !== confirmPassword) {
      toast.error("Passwords don't match.")
      return
    }

    await api.post(
      'manage/info',
      { oldPassword, newPassword },
      {
        redirectOnUnauthorized: false,
        showToast: true,
      },
    )

    toast.success('Done. Use your new password on the next sign in.')
    setOldPassword('')
    setNewPassword('')
    setConfirmPassword('')
  }

  async function deleteAccount() {
    const response = await api.delete('api/v1/account')
    if (!response) {
      return
    }

    await api.get('api/v1/account/logout', {
      redirectOnUnauthorized: false,
      showToast: false,
    })

    await auth.refreshAuth()
    navigate('/', { replace: true })
  }

  async function startTwoFactorSetup() {
    const response = await api.post(
      'manage/2fa',
      {},
      {
        redirectOnUnauthorized: false,
        showToast: true,
      },
    )

    if (!response) {
      return
    }

    setTwoFactorSharedKey(response.sharedKey ?? '')
    setIsTwoFactorSetupActive(true)
  }

  async function finishTwoFactorSetup() {
    await api.post(
      'manage/2fa',
      {
        enable: true,
        twoFactorCode: twoFactorValidationCode,
      },
      {
        redirectOnUnauthorized: false,
        showToast: true,
      },
    )

    await resetRecoveryCodes()
    setTwoFactorEnabled(true)
    setIsTwoFactorSetupActive(false)
    setTwoFactorValidationCode('')
  }

  async function disableTwoFactor() {
    await api.post(
      'manage/2fa',
      {
        enable: false,
        forgetMachine: true,
        resetSharedKey: true,
      },
      {
        redirectOnUnauthorized: false,
        showToast: true,
      },
    )

    setTwoFactorEnabled(false)
    setIsTwoFactorSetupActive(false)
    setTwoFactorSharedKey('')
    setTwoFactorRecoveryCodes([])
  }

  async function resetRecoveryCodes() {
    const response = await api.post(
      'manage/2fa',
      {
        resetRecoveryCodes: true,
      },
      {
        redirectOnUnauthorized: false,
        showToast: true,
      },
    )

    if (response?.recoveryCodes?.length > 0) {
      setTwoFactorRecoveryCodes(response.recoveryCodes)
    }
  }

  async function forgetMachine() {
    await api.post(
      'manage/2fa',
      {
        forgetMachine: true,
      },
      {
        redirectOnUnauthorized: false,
        showToast: true,
      },
    )

    toast.success('PC forgotten.')
  }

  return (
    <>
      <Row>
        <Col>
          <h3>Account Settings</h3>
        </Col>
      </Row>

      <Row className="mt-3 g-3 align-items-start">
        <Col xs={12} md={6} xl={4}>
          <Card>
            <Card.Header>
              <h5 className="mb-0">Change Email</h5>
            </Card.Header>

            <Card.Body>
              <p className="mb-3">Current Email: {auth.user?.email}</p>

              <fieldset disabled={isOperationsDisabled}>
                <Form.Group className="mb-3" controlId="accountNewEmail">
                  <Form.Control
                    value={newEmail}
                    onChange={(event) => setNewEmail(event.target.value)}
                  />
                </Form.Group>

                <div className="text-end">
                  <Button
                    onClick={() =>
                      openConfirmation(
                        'Change Email',
                        'Please confirm you want to change your email.',
                        changeEmail,
                      )
                    }
                  >
                    Save Email
                  </Button>
                </div>
              </fieldset>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} md={6} xl={4}>
          <Card>
            <Card.Header>
              <h5 className="mb-0">Change Password</h5>
            </Card.Header>

            <Card.Body>
              <Form.Group className="mb-3" controlId="accountOldPassword">
                <Form.Control
                  type="password"
                  placeholder="Old Password"
                  value={oldPassword}
                  onChange={(event) => setOldPassword(event.target.value)}
                />
              </Form.Group>

              <Form.Group className="mb-3" controlId="accountNewPassword">
                <Form.Control
                  type="password"
                  placeholder="New Password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                />
              </Form.Group>

              <Form.Group className="mb-3" controlId="accountConfirmPassword">
                <Form.Control
                  type="password"
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
              </Form.Group>

              <div className="text-end">
                <Button
                  onClick={() =>
                    openConfirmation(
                      'Change Password',
                      'Please confirm you want to change your password.',
                      changePassword,
                    )
                  }
                >
                  Save Password
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} md={6} xl={4}>
          <Card>
            <Card.Header>
              <h5 className="mb-0">Two Factor Authentication</h5>
            </Card.Header>

            <Card.Body>
              {twoFactorEnabled ? (
                <>
                  <h5>
                    Two Factor Authentication is <span className="text-success">ENABLED</span>
                  </h5>

                  <div className="d-flex flex-wrap gap-2 mt-3">
                    <Button variant="danger" onClick={disableTwoFactor}>
                      Disable 2FA
                    </Button>
                    <Button variant="warning" onClick={forgetMachine}>
                      Forget this PC
                    </Button>
                  </div>

                  {twoFactorRecoveryCodes.length > 0 ? (
                    <div className="mt-4 text-center">
                      <p>Print or save these recovery keys. You cannot retrieve them after leaving this page.</p>
                      {twoFactorRecoveryCodes.map((code) => (
                        <h6 key={code}>{code}</h6>
                      ))}
                    </div>
                  ) : null}
                </>
              ) : isTwoFactorSetupActive ? (
                <div className="text-center">
                  <p>Use an authenticator app like Microsoft Authenticator to set up your 2FA profile.</p>

                  {qrCodeValue ? (
                    <div className="d-flex justify-content-center mb-3">
                      <QRCodeSVG value={qrCodeValue} size={190} level="H" includeMargin />
                    </div>
                  ) : null}

                  <p className="mb-1">Manually enter the key:</p>
                  <p className="fw-semibold">{twoFactorSharedKey}</p>

                  <Form.Group className="mb-3" controlId="twoFactorValidation">
                    <Form.Label>Code from authenticator app</Form.Label>
                    <Form.Control
                      value={twoFactorValidationCode}
                      onChange={(event) => setTwoFactorValidationCode(event.target.value)}
                    />
                  </Form.Group>

                  <Button className="w-100" onClick={finishTwoFactorSetup}>
                    Submit Code and Finish Setup
                  </Button>
                </div>
              ) : (
                <>
                  <h5>
                    Two Factor Authentication is <span className="text-danger">DISABLED</span>
                  </h5>

                  <Button className="mt-3" onClick={startTwoFactorSetup}>
                    Enable 2FA
                  </Button>

                  <p className="mt-3 mb-1">Use an authenticator app to get a security code when signing in.</p>
                  <a
                    href="https://www.microsoft.com/en-us/security/mobile-authenticator-app"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Microsoft Authenticator App
                  </a>
                </>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} md={6} xl={4}>
          <Card className="border-danger">
            <Card.Header className="text-danger">
              <h5 className="mb-0">Danger Zone</h5>
            </Card.Header>

            <Card.Body>
              <p>This will delete your account and the associated information. This operation cannot be undone.</p>
              <Button
                variant="danger"
                onClick={() =>
                  openConfirmation(
                    'Delete Account',
                    'Please confirm you want to delete your account. This cannot be undone.',
                    deleteAccount,
                    'Delete',
                  )
                }
              >
                Delete Account
              </Button>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <ConfirmDialog
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        confirmLabel={confirmState.confirmLabel}
        onCancel={() => setConfirmState(createConfirmState())}
        onConfirm={async () => {
          const action = confirmState.action
          setConfirmState(createConfirmState())

          if (action) {
            await action()
          }
        }}
      />
    </>
  )
}
