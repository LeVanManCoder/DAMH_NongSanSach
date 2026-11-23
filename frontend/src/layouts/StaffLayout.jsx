import { Link, Outlet } from 'react-router-dom'

function StaffLayout() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-green-900 text-white">
        <nav className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span className="font-semibold">Quản lý nông sản</span>
          <Link className="text-sm text-green-100 hover:text-white" to="/">
            Về trang khách hàng
          </Link>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <Outlet />
      </main>
    </div>
  )
}

export default StaffLayout
