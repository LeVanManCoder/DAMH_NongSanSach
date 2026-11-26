import { Link, Outlet } from 'react-router-dom'
import useAuth from '../contexts/useAuth.js'

function StaffLayout() {
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-green-900 text-white">
        <nav className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span className="font-semibold">Quản lý nông sản</span>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            {['sales', 'admin'].includes(user?.role) && (
              <Link className="text-green-100 hover:text-white" to="/staff/orders">
                Quản lý đơn hàng
              </Link>
            )}
            {['sales', 'admin'].includes(user?.role) && (
              <Link className="text-green-100 hover:text-white" to="/staff/complaints">
                Khiếu nại
              </Link>
            )}
            {user?.role === 'farm_staff' && (
              <Link className="text-green-100 hover:text-white" to="/staff/batches">
                Quản lý lô hàng
              </Link>
            )}
            <Link className="text-green-100 hover:text-white" to="/">
              Về trang khách hàng
            </Link>
          </div>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <Outlet />
      </main>
    </div>
  )
}

export default StaffLayout
