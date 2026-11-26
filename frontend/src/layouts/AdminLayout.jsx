import { Link, Navigate, Outlet, useLocation } from 'react-router-dom'
import useAuth from '../contexts/useAuth.js'

const links = [
  ['/admin/dashboard', 'Tổng quan'],
  ['/admin/users', 'Tài khoản'],
  ['/admin/audit-logs', 'Nhật ký hệ thống'],
]

function AdminLayout() {
  const { user } = useAuth()
  const location = useLocation()

  if (user?.role !== 'admin') {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-slate-950 text-white">
        <nav className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <Link to="/admin/dashboard" className="text-lg font-bold">Quản trị Nông Lành</Link>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            {links.map(([href, label]) => (
              <Link
                key={href}
                to={href}
                aria-current={location.pathname === href ? 'page' : undefined}
                className={`hover:text-lime-200 ${location.pathname === href ? 'font-bold text-lime-300' : 'text-slate-200'}`}
              >
                {label}
              </Link>
            ))}
            <Link to="/" className="text-slate-200 hover:text-white">Về cửa hàng</Link>
          </div>
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-10">
        <Outlet />
      </main>
    </div>
  )
}

export default AdminLayout
