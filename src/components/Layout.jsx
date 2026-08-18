import Sidebar from './Sidebar'

export default function Layout({ role, children }) {
  return (
    <div className="min-h-screen flex bg-temple-cream">
      <Sidebar role={role} />
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  )
}
