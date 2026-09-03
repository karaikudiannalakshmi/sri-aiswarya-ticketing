import { useEffect, useMemo, useState } from 'react'
import { fetchAllSales } from '../lib/tickets'
import { formatCurrency } from '../lib/currency'

const DONATION_THRESHOLD = 100000
const POOJA_THRESHOLD = 20000

function normalizePhone(phone) {
  return String(phone || '').replace(/\D/g, '')
}

export default function Letters() {
  const [sales, setSales] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchAllSales()
      .then(setSales)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const { topDonors, specialPoojas } = useMemo(() => {
    if (!sales) return { topDonors: [], specialPoojas: [] }

    const donorMap = {}
    for (const s of sales) {
      if (s.kind !== 'donation') continue
      const key = normalizePhone(s.phone) || `name:${(s.name || '').toLowerCase()}`
      if (!donorMap[key]) {
        donorMap[key] = {
          name: s.name || 'Unknown',
          phone: s.phone || '',
          address: s.donorAddress || '',
          total: 0,
          count: 0,
          receipts: []
        }
      }
      donorMap[key].total += Number(s.price || 0)
      donorMap[key].count += 1
      donorMap[key].receipts.push(s.receiptNo)
      if (s.donorAddress && !donorMap[key].address) donorMap[key].address = s.donorAddress
    }
    const topDonors = Object.values(donorMap)
      .filter((d) => d.total > DONATION_THRESHOLD)
      .sort((a, b) => b.total - a.total)

    const specialPoojas = sales
      .filter((s) => s.kind !== 'donation' && Number(s.price || 0) > POOJA_THRESHOLD)
      .sort((a, b) => Number(b.price || 0) - Number(a.price || 0))

    return { topDonors, specialPoojas }
  }, [sales])

  if (loading) {
    return <div className="min-h-screen bg-temple-cream p-6 text-gray-400">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-temple-cream p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-temple-maroon mb-1">Recognition Letters</h1>
        <p className="text-gray-500 mb-6">
          Everyone below qualifies for a letter - donors whose total giving exceeds{' '}
          {formatCurrency(DONATION_THRESHOLD)}, and anyone who has done a single puja over{' '}
          {formatCurrency(POOJA_THRESHOLD)}. This list updates automatically as new sales come
          in. Once the letter wording is ready, this page will generate a printable letter for
          each person here.
        </p>

        {error && <p className="text-red-600 mb-4">{error}</p>}

        <div className="bg-white rounded-2xl shadow p-6 mb-6">
          <h2 className="font-semibold text-gray-700 mb-1">
            Donors over {formatCurrency(DONATION_THRESHOLD)} (lifetime total)
          </h2>
          <p className="text-xs text-gray-400 mb-4">{topDonors.length} qualify</p>
          {topDonors.length === 0 ? (
            <p className="text-sm text-gray-400">No donors have crossed this total yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b">
                  <th className="pb-2">Name</th>
                  <th className="pb-2">Phone</th>
                  <th className="pb-2">Address</th>
                  <th className="pb-2 text-right">Donations</th>
                  <th className="pb-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {topDonors.map((d, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-2 font-medium">{d.name}</td>
                    <td className="py-2">{d.phone || '-'}</td>
                    <td className="py-2 text-gray-500">{d.address || '-'}</td>
                    <td className="py-2 text-right">{d.count}</td>
                    <td className="py-2 text-right font-semibold text-temple-maroon">
                      {formatCurrency(d.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="font-semibold text-gray-700 mb-1">
            Special poojas over {formatCurrency(POOJA_THRESHOLD)}
          </h2>
          <p className="text-xs text-gray-400 mb-4">{specialPoojas.length} qualify</p>
          {specialPoojas.length === 0 ? (
            <p className="text-sm text-gray-400">No single pooja has crossed this amount yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b">
                  <th className="pb-2">Name</th>
                  <th className="pb-2">Phone</th>
                  <th className="pb-2">Pooja</th>
                  <th className="pb-2">Receipt No</th>
                  <th className="pb-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {specialPoojas.map((s) => (
                  <tr key={s.id} className="border-b last:border-0">
                    <td className="py-2 font-medium">{s.name || '-'}</td>
                    <td className="py-2">{s.phone || '-'}</td>
                    <td className="py-2 text-gray-500">{s.ticketNameTamil || s.ticketName}</td>
                    <td className="py-2 text-gray-500">{s.receiptNo}</td>
                    <td className="py-2 text-right font-semibold text-temple-maroon">
                      {formatCurrency(s.price)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
