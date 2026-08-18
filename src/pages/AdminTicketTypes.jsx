import { useEffect, useState } from 'react'
import {
  fetchTicketTypes,
  addTicketType,
  updateTicketType,
  deleteTicketType
} from '../lib/tickets'
import { formatCurrency, CURRENCY } from '../lib/currency'

const emptyForm = {
  name: '',
  nameTamil: '',
  category: '',
  categoryTamil: '',
  kind: 'puja',
  price: '',
  order: 0
}

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
      nameTamil: form.nameTamil.trim(),
      category: form.category.trim(),
      categoryTamil: form.categoryTamil.trim(),
      kind: form.kind,
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
    setForm({
      name: t.name,
      nameTamil: t.nameTamil || '',
      category: t.category,
      categoryTamil: t.categoryTamil || '',
      kind: t.kind || 'puja',
      price: t.price,
      order: t.order || 0
    })
    setEditingId(t.id)
  }

  async function handleDelete(id) {
    if (!confirm('Delete this ticket type?')) return
    await deleteTicketType(id)
    load()
  }

  return (
    <div className="min-h-screen bg-temple-cream p-4 md:p-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-temple-maroon mb-1">Manage Ticket Types</h1>
        <p className="text-gray-500 mb-6">Add, edit, or remove tickets, pujas, and donation types.</p>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow p-6 mb-8 space-y-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setForm({ ...form, kind: 'puja' })}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border-2 ${
                form.kind === 'puja'
                  ? 'bg-temple-maroon text-white border-temple-maroon'
                  : 'bg-white text-gray-500 border-gray-200'
              }`}
            >
              Puja / Ticket
            </button>
            <button
              type="button"
              onClick={() => setForm({ ...form, kind: 'donation' })}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border-2 ${
                form.kind === 'donation'
                  ? 'bg-temple-maroon text-white border-temple-maroon'
                  : 'bg-white text-gray-500 border-gray-200'
              }`}
            >
              Donation
            </button>
          </div>
          <p className="text-xs text-gray-400">
            {form.kind === 'puja'
              ? 'Fixed-price ticket. Operator just selects it and issues - no extra details needed.'
              : "Operator will be asked for the donor's name when issuing this, and can enter the actual amount given (the price below is just a suggested default)."}
          </p>

          <div className="grid grid-cols-2 gap-3">
            <input
              placeholder={
                form.kind === 'donation'
                  ? 'Donation name - English (e.g. General Donation)'
                  : 'Ticket name - English (e.g. Agal Vilaku)'
              }
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="border rounded-lg px-3 py-2"
            />
            <input
              placeholder="Name - Tamil (e.g. அகல் விளக்கு)"
              value={form.nameTamil}
              onChange={(e) => setForm({ ...form, nameTamil: e.target.value })}
              className="border rounded-lg px-3 py-2"
            />
            <input
              placeholder="Category - English (e.g. Puja, Annadhanam)"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="border rounded-lg px-3 py-2"
            />
            <input
              placeholder="Category - Tamil (e.g. பூஜை, அன்னதானம்)"
              value={form.categoryTamil}
              onChange={(e) => setForm({ ...form, categoryTamil: e.target.value })}
              className="border rounded-lg px-3 py-2"
            />
            <input
              type="number"
              placeholder={form.kind === 'donation' ? `Suggested amount (${CURRENCY})` : `Price (${CURRENCY})`}
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
                <p className="font-medium flex items-center gap-2">
                  {t.name}
                  {t.nameTamil && <span className="text-gray-400 font-normal"> · {t.nameTamil}</span>}
                  {t.kind === 'donation' && (
                    <span className="text-[10px] uppercase tracking-wide bg-temple-gold/20 text-temple-maroon px-2 py-0.5 rounded-full">
                      Donation
                    </span>
                  )}
                </p>
                <p className="text-xs text-gray-400">
                  {t.category} · {formatCurrency(t.price)}
                  {t.kind === 'donation' ? ' (suggested)' : ''}
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
