import { useEffect, useState } from 'react'
import { fetchTicketTypes, getSeriesSettings, setSeriesSettings } from '../lib/tickets'
import { AlertTriangle } from 'lucide-react'

export default function ReceiptNumbering() {
  const [ticketTypes, setTicketTypes] = useState([])
  const [settings, setSettings] = useState({}) // { [ticketTypeId]: {prefix,padding,count} }
  const [forms, setForms] = useState({})
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const types = await fetchTicketTypes()
    setTicketTypes(types)
    const entries = await Promise.all(
      types.map(async (t) => [t.id, await getSeriesSettings(t.id)])
    )
    const settingsMap = Object.fromEntries(entries)
    setSettings(settingsMap)
    const formsMap = {}
    for (const t of types) {
      formsMap[t.id] = {
        prefix: settingsMap[t.id].prefix ?? '',
        padding: settingsMap[t.id].padding ?? 6,
        nextNumber: (settingsMap[t.id].count ?? 0) + 1
      }
    }
    setForms(formsMap)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function handleSave(ticketTypeId) {
    const f = forms[ticketTypeId]
    const currentNext = (settings[ticketTypeId]?.count ?? 0) + 1
    if (Number(f.nextNumber) !== currentNext) {
      const ok = confirm(
        `You're changing the next number for this ticket type from ${currentNext} to ${f.nextNumber}. ` +
          `This directly affects your audit trail - only do this for initial setup or a correction you're sure about. Continue?`
      )
      if (!ok) return
    }
    await setSeriesSettings(ticketTypeId, f)
    setMessage(
      `Saved. Next number for this ticket type is ${f.prefix}${String(f.nextNumber).padStart(
        f.padding,
        '0'
      )}.`
    )
    load()
  }

  if (loading) {
    return <div className="min-h-screen bg-temple-cream p-6 text-gray-400">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-temple-cream p-4 md:p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-temple-maroon mb-1">Receipt Numbering</h1>
        <p className="text-gray-500 mb-6">
          Every ticket type has its own continuous receipt number series for your audit trail -
          just like a separate paper ticket book for each one. Numbers never reset by day or
          month.
        </p>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex gap-3">
          <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={20} />
          <p className="text-sm text-amber-800">
            A brand-new ticket type needs its numbering set up here <strong>before</strong>{' '}
            operators can issue it - continuing from your paper books, or starting at 1. Only
            change "Next number" again later to fix a genuine mistake; an auditor will ask about
            any gap or repeat.
          </p>
        </div>

        {message && (
          <div className="text-sm bg-white border border-gray-200 rounded-lg p-3 text-gray-700 mb-6">
            {message}
          </div>
        )}

        {ticketTypes.length === 0 && (
          <p className="text-sm text-gray-400">
            No ticket types yet - add some under Manage Ticket Types first.
          </p>
        )}

        <div className="space-y-6">
          {ticketTypes.map((t) => (
            <div key={t.id} className="bg-white rounded-2xl shadow p-6">
              <h2 className="font-semibold text-gray-700 mb-1">
                {t.name}
                {t.nameTamil && <span className="text-gray-400 font-normal"> · {t.nameTamil}</span>}
              </h2>
              <p className="text-xs text-gray-400 mb-4">
                {t.category} · {t.kind === 'donation' ? 'Donation' : 'Puja/Ticket'} · Last issued:{' '}
                {settings[t.id]?.count > 0
                  ? `${forms[t.id].prefix}${String(settings[t.id].count).padStart(
                      forms[t.id].padding,
                      '0'
                    )}`
                  : 'None yet'}
              </p>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <label className="text-xs text-gray-500">
                  Prefix
                  <input
                    value={forms[t.id].prefix}
                    onChange={(e) =>
                      setForms({ ...forms, [t.id]: { ...forms[t.id], prefix: e.target.value } })
                    }
                    className="block w-full border rounded-lg px-3 py-2 mt-1 text-sm"
                  />
                </label>
                <label className="text-xs text-gray-500">
                  Digits (padding)
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={forms[t.id].padding}
                    onChange={(e) =>
                      setForms({ ...forms, [t.id]: { ...forms[t.id], padding: e.target.value } })
                    }
                    className="block w-full border rounded-lg px-3 py-2 mt-1 text-sm"
                  />
                </label>
                <label className="text-xs text-gray-500">
                  Next number
                  <input
                    type="number"
                    min={1}
                    value={forms[t.id].nextNumber}
                    onChange={(e) =>
                      setForms({
                        ...forms,
                        [t.id]: { ...forms[t.id], nextNumber: e.target.value }
                      })
                    }
                    className="block w-full border rounded-lg px-3 py-2 mt-1 text-sm"
                  />
                </label>
              </div>
              <p className="text-xs text-gray-400 mb-3">
                Preview: {forms[t.id].prefix}
                {String(forms[t.id].nextNumber || 0).padStart(forms[t.id].padding, '0')}
              </p>
              <button
                onClick={() => handleSave(t.id)}
                className="bg-temple-maroon text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                Save
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
