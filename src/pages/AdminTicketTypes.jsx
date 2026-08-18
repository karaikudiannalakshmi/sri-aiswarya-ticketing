import { useEffect, useState } from 'react'
import {
  fetchTicketTypes,
  addTicketType,
  updateTicketType,
  deleteTicketType
} from '../lib/tickets'

const emptyForm = { name: '', category: '', price: '', order: 0 }

export default function AdminTicketTypes() {
  const [tickets, setTickets] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [message, setMessage] = useState('')

  async function load() {
    const data = await fetchTicketTypes()
    setTickets(data)
  }

  useEffect(() => {
    load()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim() || !form.category.trim() || form.price === '') {
      setMessage('Fill in name, category, and price.')
      return
    }
    const payload = {
      name: form.name.trim(),
      category: form.category.trim(),
      price: Number(form.price),
      order: Number(form.order) || 0
    }
    if (editingId) {
      await updateTicketType(editingId, payload)
      setMessage('Updated.')
    } else {
      await addTicketType(payload)
      setMessage('Added.')
    }
    setForm(emptyForm)
    setEditingId(null)
    load()
  }

  function startEdit(t) {
    setForm({ name: t.name, category: t.category, price: t.price, order: t.order || 0 })
    setEditingId(t.id)
  }

  async function handleDelete(id) {
    if (!confirm('Delete this ticket type?')) return
    await deleteTicketType(id)
    load()
  }

  return (
    <div className="min-h-screen bg-temple-cream p-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-temple-maroon mb-6">Manage Ticket Types</h1>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow p-6 mb-8 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input
              placeholder="Ticket name (e.g. Agal Vilaku)"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="border rounded-lg px-3 py-2"
            />
            <input
              placeholder="Category (e.g. Puja, Donation)"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="border rounded-lg px-3 py-2"
            />
            <input
              type="number"
              placeholder="Price (Rs.)"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              className="border rounded-lg px-3 py-2"
            />
            <input
              type="number"
              placeholder="Display order"
              value={form.order}
              onChange={(e) => setForm({ ...form, order: e.target.value })}
              className="border rounded-lg px-3 py-2"
            />
          </div>
          {message && <p className="text-sm text-gray-500">{message}</p>}
          <div className="flex gap-3">
            <button
              type="submit"
              className="bg-temple-maroon text-white px-4 py-2 rounded-lg font-medium"
            >
              {editingId ? 'Update' : 'Add Ticket Type'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={() => {
                  setForm(emptyForm)
                  setEditingId(null)
                }}
                className="text-gray-500 px-4 py-2"
              >
                Cancel
              </button>
            )}
          </div>
        </form>

        <div className="bg-white rounded-2xl shadow divide-y">
          {tickets.map((t) => (
            <div key={t.id} className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium">{t.name}</p>
                <p className="text-xs text-gray-400">
                  {t.category} · Rs. {Number(t.price).toFixed(2)}
                </p>
              </div>
              <div className="flex gap-3 text-sm">
                <button onClick={() => startEdit(t)} className="text-temple-maroon font-medium">
                  Edit
                </button>
                <button onClick={() => handleDelete(t.id)} className="text-red-600 font-medium">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
