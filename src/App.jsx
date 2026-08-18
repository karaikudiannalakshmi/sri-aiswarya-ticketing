import { useEffect, useState } from 'react'
import { Routes, Route, Link, useNavigate } from 'react-router-dom'
import Login from './pages/Login'
import TicketIssue from './pages/TicketIssue'
import Dashboard from './pages/Dashboard'
import AdminTicketTypes from './pages/AdminTicketTypes'
import { ensureAuth } from './firebase'

export default function App() {
  const [authed, setAuthed] = useState(localStorage.getItem('temple_authed') === 'true')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (authed) {
      ensureAuth().then(() => setReady(true))
    }
  }, [authed])

  if (!authed) {
    return <Login onSuccess={() => setAuthed(true)} />
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-temple-cream text-gray-400">
        Loading...
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/" element={<TicketIssue />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/admin" element={<AdminTicketTypes />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-temple-cream">
      <p className="text-gray-500">Page not found.</p>
      <Link to="/" className="text-temple-maroon font-medium">
        Go to Ticket Issue
      </Link>
    </div>
  )
}
