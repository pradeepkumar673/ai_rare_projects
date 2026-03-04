import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { Navbar } from './Navbar'

export function Layout() {
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme')
    return saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
    localStorage.setItem('theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Navbar darkMode={darkMode} toggleDarkMode={() => setDarkMode((d) => !d)} />
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} RareDiag · AI-Powered Rare Disease Platform ·{' '}
        <a href="#" className="hover:text-foreground transition-colors">Privacy</a> ·{' '}
        <a href="#" className="hover:text-foreground transition-colors">Terms</a>
      </footer>
    </div>
  )
}
