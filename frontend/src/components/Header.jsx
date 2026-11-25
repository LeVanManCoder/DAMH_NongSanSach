import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import authApi from '../api/authApi.js'
import useAuth from '../contexts/useAuth.js'

const roleLabels = {
  customer: 'Khách hàng',
  farm_staff: 'Nhân viên nông trại',
  sales: 'Nhân viên bán hàng',
  admin: 'Quản trị viên',
}

function Header() {
  const { user, clearSession } = useAuth()
  const navigate = useNavigate()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  async function handleLogout() {
    setIsLoggingOut(true)
    let notice = ''

    try {
      await authApi.logout()
    } catch (error) {
      if (error.response?.status !== 401) {
        notice =
          'Đã xóa phiên đăng nhập trên thiết bị nhưng chưa xác nhận được đăng xuất với máy chủ.'
      }
    } finally {
      clearSession()
      navigate('/login', {
        replace: true,
        state: notice ? { notice } : undefined,
      })
      setIsLoggingOut(false)
    }
  }

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
          <Link className="hover:text-green-800" to="/cart">
            Giỏ hàng
          </Link>
          {user ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-slate-600">
                {user.ho_ten} · {roleLabels[user.role] ?? user.role}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="font-semibold text-green-800 hover:underline disabled:opacity-60"
              >
                {isLoggingOut ? 'Đang đăng xuất...' : 'Đăng xuất'}
              </button>
            </div>
          ) : (
            <Link className="font-semibold text-green-800 hover:underline" to="/login">
              Đăng nhập
            </Link>
          )}
        </div>
      </nav>
    </header>
  )
}

export default Header
