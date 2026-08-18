import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Ticket, ListChecks, Menu, X } from 'lucide-react'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/issue', label: 'Issue Ticket', icon: Ticket },
  { to: '/admin', label: 'Manage Ticket Types', icon: ListChecks }
]

export default function Sidebar() {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden flex items-center justify-between bg-temple-maroon text-white px-4 py-3 sticky top-0 z-30 shadow">
        <div>
          <p className="font-bold leading-tight">Sri Aishwarya Lakshmi Temple</p>
          <p className="text-xs opacity-80">Ticketing</p>
        </div>
        <button onClick={() => setOpen(true)} aria-label="Open menu">
          <Menu size={26} />
        </button>
      </div>

      {/* Mobile drawer overlay */}
      {open && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/40" onClick={() => setOpen(false)}>
          <div
            className="absolute left-0 top-0 bottom-0 w-64 bg-temple-maroon text-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-8">
              <p className="font-bold">Menu</p>
              <button onClick={() => setOpen(false)} aria-label="Close menu">
                <X size={24} />
              </button>
            </div>
            <NavItems onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 bg-temple-maroon text-white min-h-screen p-5">
        <div className="mb-10">
          <p className="font-bold text-lg leading-tight">Sri Aishwarya</p>
          <p className="font-bold text-lg leading-tight">Lakshmi Temple</p>
          <p className="text-xs opacity-70 mt-1">Ticketing System</p>
        </div>
        <NavItems />
      </aside>
    </>
  )
}

function NavItems({ onNavigate }) {
  return (
    <nav className="flex flex-col gap-1">
      {navItems.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
              isActive ? 'bg-white text-temple-maroon' : 'text-white/85 hover:bg-white/10'
            }`
          }
        >
          <Icon size={18} />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
