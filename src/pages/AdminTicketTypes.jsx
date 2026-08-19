import { useEffect, useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import {
  fetchTicketTypes,
  addTicketType,
  updateTicketType,
  deleteTicketType,
  bulkUpsertTicketTypes
} from '../lib/tickets'
import { formatCurrency, CURRENCY } from '../lib/currency'

const emptyForm = {
  serialNo: '',
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
  const [importBusy, setImportBusy] = useState(false)
  const [importMessage, setImportMessage] = useState('')
  const fileInputRef = useRef(null)

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
      serialNo: form.serialNo.trim(),
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
      serialNo: t.serialNo || '',
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

  async function handleFileImport(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setImportBusy(true)
    setImportMessage('')
    try {
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf)
      const sheet = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' })

      const mapped = rows
        .map((r) => ({
          serialNo: r['Serial No'],
          name: r['Name (English)'],
          nameTamil: r['Name (Tamil)'],
          category: r['Category (English)'],
          categoryTamil: r['Category (Tamil)'],
          kind: String(r['Kind (puja or donation)'] || '').toLowerCase().includes('donation')
            ? 'donation'
            : 'puja',
          price: r['Price (LKR)']
        }))
        .filter((r) => r.name && String(r.name).trim())

      if (mapped.length === 0) {
        setImportMessage('No usable rows found - check the file matches the template headers.')
        return
      }

      const result = await bulkUpsertTicketTypes(mapped)
      setImportMessage(
        `Done: ${result.created} added, ${result.updated} updated` +
          (result.skipped ? `, ${result.skipped} skipped (missing name)` : '') +
          '.'
      )
      load()
    } catch (err) {
      setImportMessage('Import failed: ' + err.message)
    } finally {
      setImportBusy(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function downloadTemplate() {
    const wb = XLSX.utils.book_new()
    const headers = [
      'Serial No',
      'Name (English)',
      'Name (Tamil)',
      'Category (English)',
      'Category (Tamil)',
      'Kind (puja or donation)',
      'Price (LKR)'
    ]
    const example = ['A-101', 'Special Archanai', 'விசேட அர்ச்சனை', 'Puja', 'பூஜை', 'puja', 350]
    const sheet = XLSX.utils.aoa_to_sheet([headers, example])
    sheet['!cols'] = [
      { wch: 12 },
      { wch: 26 },
      { wch: 26 },
      { wch: 18 },
      { wch: 18 },
      { wch: 20 },
      { wch: 14 }
    ]
    XLSX.utils.book_append_sheet(wb, sheet, 'Ticket Types')
    XLSX.writeFile(wb, 'ticket-types-import-template.xlsx')
  }

  return (
    <div className="min-h-screen bg-temple-cream p-4 md:p-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-temple-maroon mb-1">Manage Ticket Types</h1>
        <p className="text-gray-500 mb-6">Add, edit, or remove tickets, pujas, and donation types.</p>

        <div className="bg-white rounded-2xl shadow p-6 mb-8">
          <h2 className="font-semibold text-gray-700 mb-1">Import from Excel</h2>
          <p className="text-xs text-gray-400 mb-4">
            For a large price list (e.g. your full tariff sheet), fill in the template and
            upload it here instead of adding items one by one. Re-uploading with the same Serial
            No updates that item instead of duplicating it.
          </p>
          <div className="flex flex-wrap gap-3 items-center">
            <button
              onClick={downloadTemplate}
              className="text-sm text-temple-maroon font-medium border border-temple-maroon rounded-lg px-4 py-2"
            >
              Download Template
            </button>
            <label className="text-sm bg-temple-maroon text-white rounded-lg px-4 py-2 font-medium cursor-pointer">
              {importBusy ? 'Importing...' : 'Upload Filled Template'}
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileImport}
                disabled={importBusy}
                className="hidden"
              />
            </label>
          </div>
          {importMessage && <p className="text-sm text-gray-600 mt-3">{importMessage}</p>}
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow p-6 mb-8 space-y-3">
          <p className="text-xs text-gray-400 -mb-1">Or add a single item manually:</p>
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
              placeholder="Serial No (e.g. A-101) - optional"
              value={form.serialNo}
              onChange={(e) => setForm({ ...form, serialNo: e.target.value })}
              className="border rounded-lg px-3 py-2"
            />
            <div />
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
                  {t.serialNo && (
                    <span className="text-xs font-mono bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                      {t.serialNo}
                    </span>
                  )}
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
