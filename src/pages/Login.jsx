import { useState } from 'react'
import { loginAs } from '../firebase'

export default function Login({ onSuccess }) {
  const [role, setRole] = useState('operator')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await loginAs(role, password)
      onSuccess()
    } catch (err) {
      setError('Incorrect password.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-temple-cream flex items-center justify-center p-6">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm border-t-4 border-temple-maroon"
      >
        <h1 className="text-xl font-bold text-temple-maroon mb-1 text-center">
          ஸ்ரீ ஐசுவர்ய லட்சுமி திருக்கோயில்
        </h1>
        <p className="text-sm text-gray-500 mb-6 text-center">Ticketing System</p>

        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => setRole('operator')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium border-2 ${
              role === 'operator'
                ? 'bg-temple-maroon text-white border-temple-maroon'
                : 'bg-white text-gray-500 border-gray-200'
            }`}
          >
            Operator
          </button>
          <button
            type="button"
            onClick={() => setRole('admin')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium border-2 ${
              role === 'admin'
                ? 'bg-temple-maroon text-white border-temple-maroon'
                : 'bg-white text-gray-500 border-gray-200'
            }`}
          >
            Admin
          </button>
        </div>

        <input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full border border-gray-300 rounded-lg px-4 py-3 text-lg mb-3 focus:outline-none focus:ring-2 focus:ring-temple-gold"
        />
        {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full bg-temple-maroon text-white rounded-lg py-3 text-lg font-semibold active:scale-95 transition disabled:opacity-50"
        >
          {busy ? 'Signing in...' : 'Enter'}
        </button>
      </form>
    </div>
  )
}
