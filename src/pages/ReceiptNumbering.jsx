import { useEffect, useState } from 'react'
import { getAllSeriesSettings, setSeriesSettings } from '../lib/tickets'
import { AlertTriangle } from 'lucide-react'

const SERIES_META = [
  { id: 'ticketSeries', label: 'Puja / Ticket Receipts' },
  { id: 'donationSeries', label: 'Donation Receipts' }
]

export default function ReceiptNumbering() {
  const [settings, setSettings] = useState(null)
  const [forms, setForms] = useState({})
  const [message, setMessage] = useState('')

  async function load() {
    const data = await getAllSeriesSettings()
    setSettings(data)
    setForms({
      ticketSeries: {
        prefix: data.ticketSeries.prefix ?? '',
        padding: data.ticketSeries.padding ?? 6,
        nextNumber: (data.ticketSeries.count ?? 0) + 1
      },
      donationSeries: {
        prefix: data.donationSeries.prefix ?? '',
        padding: data.donationSeries.padding ?? 6,
        nextNumber: (data.donationSeries.count ?? 0) + 1
      }
    })
  }

  useEffect(() => {
    load()
  }, [])

  async function handleSave(seriesId) {
    const f = forms[seriesId]
    const currentNext = (settings[seriesId].count ?? 0) + 1
    if (Number(f.nextNumber) !== currentNext) {
      const ok = confirm(
        `You're changing the next number for this series from ${currentNext} to ${f.nextNumber}. ` +
          `This directly affects your audit trail - only do this for initial setup or a correction you're sure about. Continue?`
      )
      if (!ok) return
    }
    await setSeriesSettings(seriesId, f)
    setMessage(
      `Saved. Next ${seriesId === 'donationSeries' ? 'donation receipt' : 'ticket'} number is ${f.prefix}${String(
        f.nextNumber
      ).padStart(f.padding, '0')}.`
    )
    load()
  }

  if (!settings) {
    return <div className="min-h-screen bg-temple-cream p-6 text-gray-400">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-temple-cream p-4 md:p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-temple-maroon mb-1">Receipt Numbering</h1>
        <p className="text-gray-500 mb-6">
          Ticket and donation receipts run on two separate, continuous numbers for your audit
          trail - they never reset by day or month. Set the starting number once here; after
          that, leave it alone and let it run.
        </p>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex gap-3">
          <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={20} />
          <p className="text-sm text-amber-800">
            Only change "Next number" when first setting this up (e.g. continuing from your
            existing printed ticket books) or to fix a genuine mistake. Changing it later can
            create a gap or overlap in your numbering, which an auditor will ask about.
          </p>
        </div>

        {message && (
          <div className="text-sm bg-white border border-gray-200 rounded-lg p-3 text-gray-700 mb-6">
            {message}
          </div>
        )}

        <div className="space-y-6">
          {SERIES_META.map(({ id, label }) => (
            <div key={id} className="bg-white rounded-2xl shadow p-6">
              <h2 className="font-semibold text-gray-700 mb-1">{label}</h2>
              <p className="text-xs text-gray-400 mb-4">
                Last issued:{' '}
                {settings[id].count > 0
                  ? `${forms[id].prefix}${String(settings[id].count).padStart(forms[id].padding, '0')}`
                  : 'None yet'}
              </p>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <label className="text-xs text-gray-500">
                  Prefix
                  <input
                    value={forms[id].prefix}
                    onChange={(e) =>
                      setForms({ ...forms, [id]: { ...forms[id], prefix: e.target.value } })
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
                    value={forms[id].padding}
                    onChange={(e) =>
                      setForms({ ...forms, [id]: { ...forms[id], padding: e.target.value } })
                    }
                    className="block w-full border rounded-lg px-3 py-2 mt-1 text-sm"
                  />
                </label>
                <label className="text-xs text-gray-500">
                  Next number
                  <input
                    type="number"
                    min={1}
                    value={forms[id].nextNumber}
                    onChange={(e) =>
                      setForms({ ...forms, [id]: { ...forms[id], nextNumber: e.target.value } })
                    }
                    className="block w-full border rounded-lg px-3 py-2 mt-1 text-sm"
                  />
                </label>
              </div>
              <p className="text-xs text-gray-400 mb-3">
                Preview: {forms[id].prefix}
                {String(forms[id].nextNumber || 0).padStart(forms[id].padding, '0')}
              </p>
              <button
                onClick={() => handleSave(id)}
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
