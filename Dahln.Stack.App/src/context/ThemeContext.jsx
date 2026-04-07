import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const ThemeContext = createContext(null)
const storageKey = 'theme'

function getInitialTheme() {
  return localStorage.getItem(storageKey) || 'light'
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme)

  useEffect(() => {
    document.documentElement.setAttribute('data-bs-theme', theme)
    localStorage.setItem(storageKey, theme)
  }, [theme])

  const value = useMemo(
    () => ({
      isDarkMode: theme === 'dark',
      theme,
      toggleTheme() {
        setTheme((currentTheme) =>
          currentTheme === 'dark' ? 'light' : 'dark',
        )
      },
    }),
    [theme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)

  if (!context) {
    throw new Error('useTheme must be used inside ThemeProvider.')
  }

  return context
}
