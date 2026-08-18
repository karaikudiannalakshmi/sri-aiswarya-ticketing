import { useEffect, useState } from 'react'
import { Routes, Route, Navigate, Link } from 'react-router-dom'
import Login from './pages/Login'
import TicketIssue from './pages/TicketIssue'
import Dashboard from './pages/Dashboard'
import AdminTicketTypes from './pages/AdminTicketTypes'
import ReceiptNumbering from './pages/ReceiptNumbering'
import Layout from './components/Layout'
import { auth, fetchMyRole, logout } from './firebase'
import { onAuthStateChanged } from 'firebase/auth'

export default function App() {
  const [status, setStatus] = useState('loading') // 'loading' | 'signedOut' | 'noRole' | 'ready'
  const [role, setRole] = useState(null)

  useEffect(() => {
    // Single source of truth for auth state - fires once immediately with
    // whatever Firebase already knows (signed in or not), then again on
    // every login/logout after that. No separate "check once" step needed.
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setRole(null)
        setStatus('signedOut')
        return
      }
      try {
        const r = await fetchMyRole(user.uid)
        setRole(r)
        setStatus(r ? 'ready' : 'noRole')
      } catch (e) {
        setRole(null)
        setStatus('signedOut')
      }
    })
    return unsub
  }, [])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-temple-cream text-gray-400">
        Loading...
      </div>
    )
  }

  if (status === 'signedOut') {
    return <Login onSuccess={() => {}} />
  }

  if (status === 'noRole') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-temple-cream p-6">
        <div className="bg-white rounded-2xl shadow p-8 max-w-sm text-center">
          <p className="font-semibold text-temple-maroon mb-2">Account not set up</p>
          <p className="text-sm text-gray-500 mb-4">
            Your account signed in, but has no role assigned yet. Ask the admin to add a role for
            this account in Firebase (see README).
          </p>
          <button
            onClick={() => logout()}
            className="text-sm text-temple-maroon font-medium underline"
          >
            Log Out
          </button>
        </div>
      </div>
    )
  }

  const isAdmin = role === 'admin'

  return (
    <Layout role={role}>
      <Routes>
        <Route path="/" element={isAdmin ? <Dashboard /> : <Navigate to="/issue" replace />} />
        <Route path="/issue" element={<TicketIssue />} />
        <Route
          path="/admin"
          element={isAdmin ? <AdminTicketTypes /> : <Navigate to="/issue" replace />}
        />
        <Route
          path="/receipt-numbering"
          element={isAdmin ? <ReceiptNumbering /> : <Navigate to="/issue" replace />}
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  )
}

function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-temple-cream">
      <p className="text-gray-500">Page not found.</p>
      <Link to="/" className="text-temple-maroon font-medium">
        Go back
      </Link>
    </div>
  )
}
