import { formatCurrency } from '../lib/currency'

export default function TicketButton({ ticket, selected, onClick }) {
  const isDonation = ticket.kind === 'donation'
  return (
    <button
      onClick={() => onClick(ticket)}
      className={`rounded-xl p-4 text-left border-2 transition active:scale-95 ${
        selected
          ? 'bg-temple-maroon text-white border-temple-maroon shadow-lg'
          : 'bg-white text-gray-800 border-gray-200'
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs uppercase tracking-wide opacity-70">{ticket.category}</span>
        {isDonation && (
          <span
            className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full ${
              selected ? 'bg-white/20 text-white' : 'bg-temple-gold/20 text-temple-maroon'
            }`}
          >
            Donation
          </span>
        )}
      </div>
      <div className="font-semibold text-base leading-tight">{ticket.name}</div>
      {ticket.nameTamil && (
        <div className={`text-sm leading-tight mb-2 ${selected ? 'text-white/85' : 'text-gray-500'}`}>
          {ticket.nameTamil}
        </div>
      )}
      <div className={`text-lg font-bold mt-2 ${selected ? 'text-temple-gold' : 'text-temple-maroon'}`}>
        {formatCurrency(ticket.price)}
        {isDonation && <span className="text-xs font-normal ml-1">(suggested)</span>}
      </div>
    </button>
  )
}
