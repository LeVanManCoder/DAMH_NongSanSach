import { Link } from 'react-router-dom'

function Header() {
  return (
    <header className="border-b border-green-100 bg-white">
      <nav
        aria-label="Điều hướng chính"
        className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
      >
        <Link className="text-lg font-bold text-green-800" to="/products">
          Nông sản sạch
        </Link>
        <div className="flex items-center gap-4 text-sm font-medium text-slate-700">
          <Link className="hover:text-green-800" to="/products">
            Sản phẩm
          </Link>
          <Link className="hover:text-green-800" to="/staff">
            Khu vực nhân viên
          </Link>
        </div>
      </nav>
    </header>
  )
}

export default Header
