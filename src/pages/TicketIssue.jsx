import { useEffect, useState } from 'react'
import { fetchTicketTypes, recordSale, markSalePrinted } from '../lib/tickets'
import {
  connect as connectPrinter,
  disconnect as disconnectPrinter,
  isConnected,
  availableTransports,
  getTransport,
  printBytes
} from '../lib/printer'
import { buildTicketReceipt } from '../lib/escpos'
import TicketButton from '../components/TicketButton'
import { Link } from 'react-router-dom'

export default function TicketIssue() {
  const [tickets, setTickets] = useState([])
  const [selected, setSelected] = useState(null)
  const [operator, setOperator] = useState(localStorage.getItem('temple_operator') || '')
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

  async function handleConnectPrinter(transport) {
    try {
      setMessage('')
      const name = await connectPrinter(transport)
      setPrinterName(name)
    } catch (e) {
      setMessage(e.message)
    }
  }

  async function handleDisconnect() {
    await disconnectPrinter()
    setPrinterName(null)
  }

  async function handleIssue() {
    if (!selected) {
      setMessage('Select a ticket first.')
      return
    }
    if (!operator.trim()) {
      setMessage('Enter operator name first.')
      return
    }
    setBusy(true)
    setMessage('')
    try {
      const sale = await recordSale({
        ticketTypeId: selected.id,
        ticketName: selected.name,
        price: selected.price,
        operator: operator.trim()
      })
      setLastSale({ ...sale, ticket: selected })
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
      const bytes = buildTicketReceipt({
        ticketName: lastSale.ticket.name,
        price: lastSale.ticket.price,
        receiptNo: lastSale.receiptNo,
        dateStr: lastSale.createdAt.toLocaleDateString(),
        timeStr: lastSale.createdAt.toLocaleTimeString(),
        operator
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
    <div className="min-h-screen bg-temple-cream pb-32">
      <div className="bg-temple-maroon text-white p-4 sticky top-0 z-10 shadow">
        <h1 className="font-bold text-lg leading-tight">Sri Aishwarya Lakshmi Temple</h1>
        <p className="text-xs opacity-80">Ticket Issue</p>
      </div>

      <div className="p-4 space-y-4">
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

        {categories.map((cat) => (
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
                    onClick={setSelected}
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

        <div className="flex gap-4 text-xs text-gray-400 justify-center pt-4">
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/admin">Manage Ticket Types</Link>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 flex gap-3">
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
