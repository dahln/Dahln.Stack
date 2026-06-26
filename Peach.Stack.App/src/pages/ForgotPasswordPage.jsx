import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { api } from '../services/apiClient'

/**
 * Starts the password-reset flow by submitting the user's email address.
 *
 * The backend sends a recovery link to the provided email.  The form is
 * disabled once the request is submitted (to prevent duplicate sends) and
 * also when the server reports that account operations are not permitted.
 */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isFormDisabled, setIsFormDisabled] = useState(false)

  // Check whether account operations are enabled on this server before
  // allowing the user to submit.
  useEffect(() => {
    async function loadOperationsStatus() {
      try {
        const isEnabled = await api.get('v1/account/operations', {
          redirectOnUnauthorized: false,
          showToast: false,
        })

        // The endpoint returns `false` when account operations are disabled.
        setIsFormDisabled(isEnabled === false)
      } catch {
        // If the status check fails, default to disabled to prevent submission errors.
        setIsFormDisabled(true)
      }
    }

    loadOperationsStatus()
  }, [])

  /** Submits the password-reset request and locks the form on success. */
  async function handleSubmit(submitEvent) {
    submitEvent.preventDefault()

    const response = await api.post(
      'forgotpassword',
      { email },
      {
        redirectOnUnauthorized: false,
        showToast: true,
      },
    )

    if (response) {
      toast.success('Done. Check your email for recovery instructions.')
      // Lock the form after a successful send to prevent duplicate submissions.
      setIsFormDisabled(true)
    }
  }

  return (
    <fieldset disabled={isFormDisabled}>
      <div className="row mt-4">
        <div className="col-md-6 col-lg-4 mx-auto">
          <div className="card feature-card">
            <div className="card-header">
              <h2 className="h4 mb-0">Forgot Password</h2>
            </div>

            <div className="card-body">
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label" htmlFor="forgotPasswordEmail">Email</label>
                  <input
                    id="forgotPasswordEmail"
                    className="form-control"
                    type="email"
                    value={email}
                    onChange={(changeEvent) => setEmail(changeEvent.target.value)}
                  />
                </div>

                <div className="text-end">
                  <button type="submit" className="btn btn-primary">Submit</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </fieldset>
  )
}
