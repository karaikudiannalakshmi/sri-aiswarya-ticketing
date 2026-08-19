import { useEffect, useMemo, useState } from 'react'
import {
  fetchSalesBetween,
  startOfDay,
  endOfDay,
  startOfMonth
} from '../lib/tickets'
import { exportSalesToExcel } from '../lib/excelExport'
import { formatCurrency } from '../lib/currency'

function summarize(sales) {
  const total = sales.reduce((sum, s) => sum + Number(s.price || 0), 0)
  const byTicket = {}
  for (const s of sales) {
    // Group and display by the Tamil name, since that's what operators
    // and reports actually use day to day - fall back to English only if
    // a ticket type has no Tamil name set.
    const key = s.ticketNameTamil || s.ticketName
    if (!byTicket[key]) byTicket[key] = { count: 0, total: 0 }
    byTicket[key].count += 1
    byTicket[key].total += Number(s.price || 0)
  }
  return { total, count: sales.length, byTicket }
}

function toInputDate(d) {
  const x = new Date(d)
  const yyyy = x.getFullYear()
  const mm = String(x.getMonth() + 1).padStart(2, '0')
  const dd = String(x.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export default function Dashboard() {
  const [todaySales, setTodaySales] = useState([])
  const [monthSales, setMonthSales] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [rangeStart, setRangeStart] = useState(toInputDate(startOfMonth(new Date())))
  const [rangeEnd, setRangeEnd] = useState(toInputDate(new Date()))
  const [rangeSales, setRangeSales] = useState(null)
  const [rangeLoading, setRangeLoading] = useState(false)

  async function load() {
    setLoading(true)
    setError('')
    try {
      const now = new Date()
      const [today, month] = await Promise.all([
        fetchSalesBetween(startOfDay(now), endOfDay(now)),
        fetchSalesBetween(startOfMonth(now), endOfDay(now))
      ])
      setTodaySales(today)
      setMonthSales(month)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const interval = setInterval(load, 60000) // refresh every minute
    return () => clearInterval(interval)
  }, [])

  async function loadRange() {
    setRangeLoading(true)
    setError('')
    try {
      const start = startOfDay(new Date(rangeStart + 'T00:00:00'))
      const end = endOfDay(new Date(rangeEnd + 'T00:00:00'))
      const sales = await fetchSalesBetween(start, end)
      setRangeSales(sales)
    } catch (e) {
      setError(e.message)
    } finally {
      setRangeLoading(false)
    }
  }

  const todaySummary = useMemo(() => summarize(todaySales), [todaySales])
  const monthSummary = useMemo(() => summarize(monthSales), [monthSales])
  const rangeSummary = useMemo(() => (rangeSales ? summarize(rangeSales) : null), [rangeSales])

  return (
    <div className="min-h-screen bg-temple-cream p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-temple-maroon">Dashboard</h1>
            <p className="text-gray-500">Collections overview</p>
          </div>
          <button
            onClick={load}
            className="bg-temple-maroon text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            Refresh
          </button>
        </div>

        {error && <p className="text-red-600 mb-4">{error}</p>}
        {loading && <p className="text-gray-400 mb-4">Loading...</p>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow p-6 border-t-4 border-temple-gold">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500 uppercase tracking-wide">Today</p>
                <p className="text-4xl font-bold text-temple-maroon mt-1">
                  {formatCurrency(todaySummary.total)}
                </p>
                <p className="text-sm text-gray-500 mt-1">{todaySummary.count} tickets</p>
              </div>
              <ExportButton
                sales={todaySales}
                filename={`today-${toInputDate(new Date())}.xlsx`}
                disabled={todaySales.length === 0}
              />
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow p-6 border-t-4 border-temple-maroon">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500 uppercase tracking-wide">This Month</p>
                <p className="text-4xl font-bold text-temple-maroon mt-1">
                  {formatCurrency(monthSummary.total)}
                </p>
                <p className="text-sm text-gray-500 mt-1">{monthSummary.count} tickets</p>
              </div>
              <ExportButton
                sales={monthSales}
                filename={`month-${toInputDate(new Date())}.xlsx`}
                disabled={monthSales.length === 0}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <BreakdownTable title="Today by Ticket Type" byTicket={todaySummary.byTicket} />
          <BreakdownTable title="This Month by Ticket Type" byTicket={monthSummary.byTicket} />
        </div>

        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="font-semibold text-gray-700 mb-4">Custom Date Range Report</h2>
          <div className="flex flex-wrap items-end gap-3 mb-4">
            <label className="text-sm text-gray-500">
              From
              <input
                type="date"
                value={rangeStart}
                onChange={(e) => setRangeStart(e.target.value)}
                className="block border rounded-lg px-3 py-2 mt-1"
              />
            </label>
            <label className="text-sm text-gray-500">
              To
              <input
                type="date"
                value={rangeEnd}
                onChange={(e) => setRangeEnd(e.target.value)}
                className="block border rounded-lg px-3 py-2 mt-1"
              />
            </label>
            <button
              onClick={loadRange}
              disabled={rangeLoading}
              className="bg-temple-maroon text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {rangeLoading ? 'Loading...' : 'Run Report'}
            </button>
            {rangeSummary && (
              <ExportButton
                sales={rangeSales}
                filename={`report-${rangeStart}-to-${rangeEnd}.xlsx`}
                label="Export This Range"
              />
            )}
          </div>

          {rangeSummary && (
            <>
              <p className="mb-3 text-gray-700">
                <span className="font-bold text-temple-maroon">
                  {formatCurrency(rangeSummary.total)}
                </span>{' '}
                across {rangeSummary.count} tickets ({rangeStart} to {rangeEnd})
              </p>
              <BreakdownTable title="By Ticket Type" byTicket={rangeSummary.byTicket} />
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function ExportButton({ sales, filename, disabled, label = 'Export' }) {
  return (
    <button
      onClick={() => exportSalesToExcel(sales, { filename, title: filename })}
      disabled={disabled}
      className="text-xs bg-temple-cream border border-temple-gold text-temple-maroon px-3 py-1.5 rounded-lg font-medium disabled:opacity-40 whitespace-nowrap"
    >
      {label}
    </button>
  )
}

function BreakdownTable({ title, byTicket }) {
  const rows = Object.entries(byTicket).sort((a, b) => b[1].total - a[1].total)
  return (
    <div className="bg-white rounded-2xl shadow p-6">
      <h2 className="font-semibold text-gray-700 mb-3">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-gray-400">No sales yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-400 border-b">
              <th className="pb-2">Ticket</th>
              <th className="pb-2 text-right">Count</th>
              <th className="pb-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([name, data]) => (
              <tr key={name} className="border-b last:border-0">
                <td className="py-2">{name}</td>
                <td className="py-2 text-right">{data.count}</td>
                <td className="py-2 text-right">{formatCurrency(data.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
