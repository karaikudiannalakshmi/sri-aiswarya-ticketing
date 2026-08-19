import { useEffect, useState } from 'react'
import { fetchTicketTypes, recordSale, markSalePrinted, lookupDevoteesByPhone } from '../lib/tickets'
import {
  connect as connectPrinter,
  disconnect as disconnectPrinter,
  isConnected,
  availableTransports,
  getTransport,
  printBytes
} from '../lib/printer'
import { buildBilingualTicketReceipt } from '../lib/receiptImage'
import { formatCurrency } from '../lib/currency'
import TicketButton from '../components/TicketButton'

export default function TicketIssue() {
  const [tickets, setTickets] = useState([])
  const [selected, setSelected] = useState(null)
  const [operator, setOperator] = useState(localStorage.getItem('temple_operator') || '')
  const [name, setName] = useState('')
  const [nakshatra, setNakshatra] = useState('')
  const [phone, setPhone] = useState('')
  const [phoneMatches, setPhoneMatches] = useState([])
  const [donorAddress, setDonorAddress] = useState('')
  const [donationAmount, setDonationAmount] = useState('')
  const [quickCode, setQuickCode] = useState('')
  const [showBrowseAll, setShowBrowseAll] = useState(false)
  const [printerName, setPrinterName] = useState(null)
  const [transports] = useState(availableTransports())
  const [busy, setBusy] = useState(false)
  const [lastSale, setLastSale] = useState(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetchTicketTypes().then(setTickets).catch((e) => setMessage('Could not load tickets: ' + e.message))
    if (isConnected()) setPrinterName(getTransport() === 'usb' ? 'USB Printer' : 'Bluetooth Printer')
  }, [])

  useEffect(() => {
    localStorage.setItem('temple_operator', operator)
  }, [operator])

  // Look up known devotees by phone number as the operator types, so they
  // can pick an existing name instead of retyping it. Debounced and only
  // fires once there are enough digits to be a real number - no point
  // querying on "9" or "98".
  useEffect(() => {
    const digits = phone.replace(/\D/g, '')
    if (digits.length < 7) {
      setPhoneMatches([])
      return
    }
    const timer = setTimeout(() => {
      lookupDevoteesByPhone(phone).then(setPhoneMatches)
    }, 400)
    return () => clearTimeout(timer)
  }, [phone])

  function selectPhoneMatch(entry) {
    setName(entry.name)
    if (entry.nakshatra) setNakshatra(entry.nakshatra)
    if (entry.address) setDonorAddress(entry.address)
    setPhoneMatches([])
  }

  function resetDetails(ticket) {
    setName('')
    setNakshatra('')
    setPhone('')
    setPhoneMatches([])
    setDonorAddress('')
    setDonationAmount(ticket.kind === 'donation' ? String(ticket.price) : '')
  }

  function handleSelectTicket(ticket) {
    setSelected(ticket)
    resetDetails(ticket)
    setQuickCode('')
  }

  function handleQuickCodeSubmit(e) {
    e.preventDefault()
    const code = quickCode.trim().toLowerCase()
    if (!code) return
    const match = tickets.find((t) => (t.serialNo || '').toLowerCase() === code)
    if (match) {
      handleSelectTicket(match)
      setMessage('')
    } else {
      setMessage(`No ticket found with serial number "${quickCode.trim()}".`)
    }
  }

  // Live suggestions as the operator types - matches on serial number
  // (from the start, since that's how a printed tariff sheet works) or
  // anywhere in the English/Tamil name (for when the number is forgotten).
  // Sorted so an exact serial number match always comes first, then
  // other serial-prefix matches in numeric order, then name matches -
  // otherwise typing "1" would show 1, 10, 11, 12...121 in whatever
  // arbitrary order they happen to be in, with "1" itself easy to miss.
  const quickMatches = (() => {
    const q = quickCode.trim().toLowerCase()
    if (!q) return []
    const matches = tickets.filter(
      (t) =>
        (t.serialNo || '').toLowerCase().startsWith(q) ||
        (t.name || '').toLowerCase().includes(q) ||
        (t.nameTamil || '').includes(quickCode.trim())
    )
    matches.sort((a, b) => {
      const aExact = (a.serialNo || '').toLowerCase() === q
      const bExact = (b.serialNo || '').toLowerCase() === q
      if (aExact !== bExact) return aExact ? -1 : 1
      const aSerial = (a.serialNo || '').toLowerCase().startsWith(q)
      const bSerial = (b.serialNo || '').toLowerCase().startsWith(q)
      if (aSerial !== bSerial) return aSerial ? -1 : 1
      const aNum = Number(a.serialNo)
      const bNum = Number(b.serialNo)
      if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum
      return (a.serialNo || '').localeCompare(b.serialNo || '')
    })
    return matches.slice(0, 8)
  })()

  async function handleConnectPrinter(transport) {
    try {
      setMessage('')
      const printerNameResult = await connectPrinter(transport)
      setPrinterName(printerNameResult)
    } catch (e) {
      setMessage(e.message)
    }
  }

  async function handleDisconnect() {
    await disconnectPrinter()
    setPrinterName(null)
  }

  const isDonation = selected?.kind === 'donation'

  async function handleIssue() {
    if (!selected) {
      setMessage('Select a ticket first.')
      return
    }
    if (!operator.trim()) {
      setMessage('Enter operator name first.')
      return
    }
    if (!phone.trim()) {
      setMessage('Enter a phone number first.')
      return
    }
    if (!name.trim()) {
      setMessage(isDonation ? "Enter the donor's name first." : "Enter the devotee's name first.")
      return
    }
    if (isDonation && !donorAddress.trim()) {
      setMessage("Enter the donor's address first.")
      return
    }
    const finalAmount = isDonation ? Number(donationAmount) : selected.price
    if (isDonation && (!finalAmount || finalAmount <= 0)) {
      setMessage('Enter a valid donation amount.')
      return
    }
    setBusy(true)
    setMessage('')
    try {
      const sale = await recordSale({
        ticketTypeId: selected.id,
        ticketName: selected.name,
        ticketNameTamil: selected.nameTamil,
        kind: selected.kind || 'puja',
        price: finalAmount,
        operator: operator.trim(),
        name: name.trim(),
        nakshatra: !isDonation ? nakshatra.trim() : '',
        phone: phone.trim(),
        donorAddress: isDonation ? donorAddress.trim() : ''
      })
      setLastSale({
        ...sale,
        ticket: { ...selected, price: finalAmount },
        name: name.trim(),
        nakshatra: nakshatra.trim(),
        phone: phone.trim(),
        donorAddress: donorAddress.trim()
      })
      setMessage(`Issued: ${sale.receiptNo}`)
    } catch (e) {
      setMessage('Error issuing ticket: ' + e.message)
    } finally {
      setBusy(false)
    }
  }

  async function handlePrint() {
    if (!lastSale) {
      setMessage('Issue a ticket before printing.')
      return
    }
    setBusy(true)
    setMessage('')
    try {
      if (!isConnected()) {
        throw new Error('Connect a printer first (Bluetooth or USB, above).')
      }
      const bytes = await buildBilingualTicketReceipt({
        ticketName: lastSale.ticket.name,
        ticketNameTamil: lastSale.ticket.nameTamil,
        kind: lastSale.ticket.kind || 'puja',
        price: lastSale.ticket.price,
        receiptNo: lastSale.receiptNo,
        dateStr: lastSale.createdAt.toLocaleDateString(),
        timeStr: lastSale.createdAt.toLocaleTimeString(),
        operator,
        name: lastSale.name,
        nakshatra: lastSale.nakshatra,
        phone: lastSale.phone,
        donorAddress: lastSale.donorAddress
      })
      await printBytes(bytes)
      await markSalePrinted(lastSale.id)
      setMessage('Printed ' + lastSale.receiptNo)
    } catch (e) {
      setMessage('Print failed: ' + e.message)
    } finally {
      setBusy(false)
    }
  }

  const categories = [...new Set(tickets.map((t) => t.category))]

  return (
    <div className="min-h-screen bg-temple-cream pb-40">
      <div className="p-4 md:p-6 pb-4 border-b border-black/5">
        <h1 className="font-bold text-xl text-temple-maroon">Issue Ticket</h1>
        <p className="text-sm text-gray-500">Select a ticket, issue it, then print the receipt.</p>
      </div>

      <div className="p-4 md:p-6 space-y-4 max-w-3xl">
        <input
          value={operator}
          onChange={(e) => setOperator(e.target.value)}
          placeholder="Operator name"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white"
        />

        <div className="bg-white rounded-lg px-3 py-2 border border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-sm">
              {printerName ? `Printer: ${printerName}` : 'Printer not connected'}
            </span>
            {printerName && (
              <button onClick={handleDisconnect} className="text-sm text-red-600 font-medium">
                Disconnect
              </button>
            )}
          </div>
          {!printerName && (
            <div className="flex gap-3 mt-2">
              <button
                onClick={() => handleConnectPrinter('bluetooth')}
                disabled={!transports.includes('bluetooth')}
                className="text-sm text-temple-maroon font-medium disabled:text-gray-300"
              >
                Connect Printer (Bluetooth)
              </button>
              <button
                onClick={() => handleConnectPrinter('usb')}
                disabled={!transports.includes('usb')}
                className="text-sm text-temple-maroon font-medium disabled:text-gray-300"
              >
                Connect Printer (USB)
              </button>
            </div>
          )}
        </div>
        {transports.length === 0 && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
            This browser supports neither Bluetooth nor USB printing. Use Chrome on
            Android (Bluetooth) or Chrome/Edge on a PC (USB).
          </p>
        )}

        <form onSubmit={handleQuickCodeSubmit} className="relative">
          <div className="flex gap-2">
            <input
              value={quickCode}
              onChange={(e) => setQuickCode(e.target.value)}
              placeholder="Enter serial no. or name (e.g. A-101)"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 bg-white"
              autoComplete="off"
            />
            <button
              type="submit"
              className="bg-temple-maroon text-white px-4 py-2 rounded-lg text-sm font-medium shrink-0"
            >
              Find
            </button>
          </div>
          {quickMatches.length > 0 && (
            <div className="mt-2 bg-white border border-gray-200 rounded-lg shadow divide-y overflow-hidden">
              {quickMatches.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleSelectTicket(t)}
                  className="w-full text-left px-3 py-2 flex items-center justify-between gap-3 active:bg-temple-cream"
                >
                  <span className="text-sm">
                    {t.serialNo && (
                      <span className="font-mono text-gray-400 mr-2">#{t.serialNo}</span>
                    )}
                    <span className="font-medium">{t.nameTamil || t.name}</span>
                    {t.nameTamil && (
                      <span className="text-gray-400"> · {t.name}</span>
                    )}
                  </span>
                  <span className="text-sm font-semibold text-temple-maroon shrink-0">
                    {formatCurrency(t.price)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </form>

        {selected && (
          <div className="bg-temple-maroon/5 border border-temple-maroon/20 rounded-lg px-3 py-2 text-sm">
            Selected:{' '}
            <span className="font-semibold text-base">
              {selected.nameTamil || selected.name}
            </span>
            {selected.nameTamil && (
              <span className="text-gray-500"> · {selected.name}</span>
            )}
            {' — '}
            <span className="font-semibold">{formatCurrency(selected.price)}</span>
          </div>
        )}

        {selected && (
          <div
            className={`bg-white rounded-xl p-4 border-2 space-y-3 ${
              isDonation ? 'border-temple-gold' : 'border-temple-maroon/30'
            }`}
          >
            <p className="text-sm font-semibold text-temple-maroon">
              {isDonation ? 'Donation details' : 'Devotee details'}
            </p>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone number"
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
            {phoneMatches.length > 0 && (
              <div className="border border-temple-gold/50 bg-temple-cream rounded-lg p-2 space-y-1">
                <p className="text-xs text-gray-500 px-1">
                  Found under this number - tap to fill in:
                </p>
                {phoneMatches.map((entry, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => selectPhoneMatch(entry)}
                    className="w-full text-left bg-white rounded-lg px-3 py-2 text-sm border border-gray-200 active:scale-95 transition"
                  >
                    <span className="font-medium">{entry.name}</span>
                    {entry.nakshatra && (
                      <span className="text-gray-400"> · {entry.nakshatra}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isDonation ? "Donor's name" : "Devotee's name"}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
            {!isDonation && (
              <input
                value={nakshatra}
                onChange={(e) => setNakshatra(e.target.value)}
                placeholder="Nakshatra (birth star) - optional"
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            )}
            {isDonation && (
              <textarea
                value={donorAddress}
                onChange={(e) => setDonorAddress(e.target.value)}
                placeholder="Donor's address"
                rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 resize-none"
              />
            )}
            {isDonation && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Amount</span>
                <input
                  type="number"
                  value={donationAmount}
                  onChange={(e) => setDonationAmount(e.target.value)}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={() => setShowBrowseAll((v) => !v)}
          className="text-sm text-temple-maroon font-medium underline"
        >
          {showBrowseAll ? 'Hide full list' : `Browse all tickets (${tickets.length})`}
        </button>

        {showBrowseAll &&
          categories.map((cat) => (
            <div key={cat}>
              <h2 className="text-sm font-semibold text-gray-500 uppercase mb-2">{cat}</h2>
              <div className="grid grid-cols-2 gap-3">
                {tickets
                  .filter((t) => t.category === cat)
                  .map((t) => (
                    <TicketButton
                      key={t.id}
                      ticket={t}
                      selected={selected?.id === t.id}
                      onClick={handleSelectTicket}
                    />
                  ))}
              </div>
            </div>
          ))}

        {message && (
          <div className="text-sm bg-white border border-gray-200 rounded-lg p-3 text-gray-700">
            {message}
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 md:left-64 right-0 bg-white border-t border-gray-200 p-4 flex gap-3 max-w-3xl">
        <button
          onClick={handleIssue}
          disabled={busy || !selected}
          className="flex-1 bg-temple-gold text-temple-maroon font-bold rounded-xl py-4 text-lg active:scale-95 transition disabled:opacity-40"
        >
          Issue
        </button>
        <button
          onClick={handlePrint}
          disabled={busy || !lastSale}
          className="flex-1 bg-temple-maroon text-white font-bold rounded-xl py-4 text-lg active:scale-95 transition disabled:opacity-40"
        >
          Print
        </button>
      </div>
    </div>
  )
}
