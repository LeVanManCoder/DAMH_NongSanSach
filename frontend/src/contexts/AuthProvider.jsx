import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import AuthContext from './AuthContext.js'

const TOKEN_KEY = 'access_token'
const USER_KEY = 'auth_user'

function getStoredUser() {
  if (!localStorage.getItem(TOKEN_KEY)) {
    localStorage.removeItem(USER_KEY)
    return null
  }

  try {
    const user = JSON.parse(localStorage.getItem(USER_KEY))
    return user && typeof user === 'object' ? user : null
  } catch {
    localStorage.removeItem(USER_KEY)
    return null
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser)
  const [sessionExpired, setSessionExpired] = useState(false)

  const clearSession = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    setUser(null)
  }, [])

  const signIn = useCallback((token, userData) => {
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(USER_KEY, JSON.stringify(userData))
    setUser(userData)
    setSessionExpired(false)
  }, [])

  const dismissSessionExpired = useCallback(() => {
    setSessionExpired(false)
  }, [])

  useEffect(() => {
    function handleSessionExpired() {
      clearSession()
      setSessionExpired(true)
    }

    window.addEventListener('auth:session-expired', handleSessionExpired)

    return () => {
      window.removeEventListener('auth:session-expired', handleSessionExpired)
    }
  }, [clearSession])

  const value = useMemo(
    () => ({
      user,
      signIn,
      clearSession,
      sessionExpired,
      dismissSessionExpired,
    }),
    [user, signIn, clearSession, sessionExpired, dismissSessionExpired],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
