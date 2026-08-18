export default function TicketButton({ ticket, selected, onClick }) {
  return (
    <button
      onClick={() => onClick(ticket)}
      className={`rounded-xl p-4 text-left border-2 transition active:scale-95 ${
        selected
          ? 'bg-temple-maroon text-white border-temple-maroon shadow-lg'
          : 'bg-white text-gray-800 border-gray-200'
      }`}
    >
      <div className="text-xs uppercase tracking-wide opacity-70 mb-1">{ticket.category}</div>
      <div className="font-semibold text-base leading-tight mb-2">{ticket.name}</div>
      <div className={`text-lg font-bold ${selected ? 'text-temple-gold' : 'text-temple-maroon'}`}>
        Rs. {Number(ticket.price).toFixed(2)}
      </div>
    </button>
  )
}
