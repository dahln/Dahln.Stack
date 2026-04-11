import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, ApiError } from '../services/apiClient'

const AuthContext = createContext(null)

function createUnauthenticatedState() {
  return {
    isAuthenticated: false,
    isAdmin: false,
    roles: [],
    user: null,
  }
}

/**
 * Provides authentication state and account actions for the entire app.
 */
export function AuthProvider({ children }) {
  const [authState, setAuthState] = useState(createUnauthenticatedState)
  const [isLoading, setIsLoading] = useState(true)

  const refreshAuth = useCallback(async () => {
    setIsLoading(true)

    try {
      const [userInfo, roles] = await Promise.all([
        api.get('api/manage/info', {
          redirectOnUnauthorized: false,
          showToast: false,
        }),
        api.get('api/v1/account/roles', {
          redirectOnUnauthorized: false,
          showToast: false,
        }),
      ])

      if (!userInfo) {
        const unauthenticatedState = createUnauthenticatedState()
        setAuthState(unauthenticatedState)
        return unauthenticatedState
      }

      const nextState = {
        isAuthenticated: true,
        isAdmin: Array.isArray(roles) && roles.includes('Administrator'),
        roles: Array.isArray(roles) ? roles : [],
        user: {
          email: userInfo.email,
          claims: userInfo.claims ?? {},
        },
      }

      setAuthState(nextState)
      return nextState
    } catch {
      const unauthenticatedState = createUnauthenticatedState()
      setAuthState(unauthenticatedState)
      return unauthenticatedState
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshAuth()
  }, [refreshAuth])

  const register = useCallback(async (email, password) => {
    try {
      await api.post(
        'api/v1/account/register',
        { email, password },
        {
          redirectOnUnauthorized: false,
          showToast: false,
        },
      )

      return { succeeded: true, errorList: [] }
    } catch (error) {
      const messages = error instanceof ApiError ? error.messages : ['Registration failed.']
      return { succeeded: false, errorList: messages }
    }
  }, [])

  const login = useCallback(async (email, password, twoFactorCode, twoFactorRecoveryCode) => {
    try {
      const response = await api.request(
        {
          method: 'post',
          url: 'api/login?useCookies=true',
          data: {
            email,
            password,
            twoFactorCode,
            twoFactorRecoveryCode,
          },
        },
        {
          redirectOnUnauthorized: false,
          showToast: false,
        },
      )

      if (!response) {
        return {
          succeeded: false,
          prompt2FA: false,
          errorList: ['Invalid email and/or password.'],
        }
      }

      await refreshAuth()
      return { succeeded: true, prompt2FA: false, errorList: [] }
    } catch (error) {
      if (error instanceof ApiError && error.detail === 'RequiresTwoFactor') {
        return {
          succeeded: false,
          prompt2FA: true,
          errorList: [],
        }
      }

      const messages = error instanceof ApiError ? error.messages : ['Invalid email and/or password.']
      return {
        succeeded: false,
        prompt2FA: false,
        errorList: messages,
      }
    }
  }, [refreshAuth])

  const logout = useCallback(async () => {
    try {
      await api.get('api/v1/account/logout', {
        redirectOnUnauthorized: false,
        showToast: false,
      })
    } finally {
      setAuthState(createUnauthenticatedState())
    }
  }, [])

  const value = useMemo(
    () => ({
      ...authState,
      isLoading,
      login,
      logout,
      refreshAuth,
      register,
    }),
    [authState, isLoading, login, logout, refreshAuth, register],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.')
  }

  return context
}
