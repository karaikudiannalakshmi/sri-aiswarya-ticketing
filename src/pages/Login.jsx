import { useState } from 'react'

export default function Login({ onSuccess }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    const correct = import.meta.env.VITE_APP_PASSWORD
    if (password === correct) {
      localStorage.setItem('temple_authed', 'true')
      onSuccess()
    } else {
      setError('Incorrect password')
    }
  }

  return (
    <div className="min-h-screen bg-temple-cream flex items-center justify-center p-6">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm border-t-4 border-temple-maroon"
      >
        <h1 className="text-xl font-bold text-temple-maroon mb-1 text-center">
          Sri Aishwarya Lakshmi Temple
        </h1>
        <p className="text-sm text-gray-500 mb-6 text-center">Ticketing System</p>
        <input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter password"
          className="w-full border border-gray-300 rounded-lg px-4 py-3 text-lg mb-3 focus:outline-none focus:ring-2 focus:ring-temple-gold"
        />
        {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
        <button
          type="submit"
          className="w-full bg-temple-maroon text-white rounded-lg py-3 text-lg font-semibold active:scale-95 transition"
        >
          Enter
        </button>
      </form>
    </div>
  )
}
