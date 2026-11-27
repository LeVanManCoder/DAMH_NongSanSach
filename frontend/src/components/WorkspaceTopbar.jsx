import { ArrowUpRight, LogOut, Menu, X } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import authApi from '../api/authApi.js'
import useAuth from '../contexts/useAuth.js'

const roleLabels = {
  farm_staff: 'Nhân viên nông trại',
  sales: 'Nhân viên bán hàng',
  admin: 'Quản trị viên',
}

function WorkspaceTopbar({ title, isMenuOpen, onMenuToggle }) {
  const { user, clearSession } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    let notice = ''
    try {
      await authApi.logout()
    } catch (error) {
      if (error.response?.status !== 401) {
        notice = 'Đã xóa phiên trên thiết bị nhưng chưa xác nhận được đăng xuất với máy chủ.'
      }
    } finally {
      clearSession()
      navigate('/login', {
        replace: true,
        state: notice ? { notice } : undefined,
      })
    }
  }

  return (
    <header className="workspace-topbar">
      <div className="workspace-topbar-title">
        <button
          type="button"
          className="workspace-menu-toggle"
          onClick={onMenuToggle}
          aria-label={isMenuOpen ? 'Đóng điều hướng' : 'Mở điều hướng'}
          aria-expanded={isMenuOpen}
        >
          {isMenuOpen ? <X size={21} /> : <Menu size={21} />}
        </button>
        <div>
          <p>Không gian làm việc</p>
          <h1>{title}</h1>
        </div>
      </div>
      <div className="workspace-topbar-actions">
        <div className="workspace-user">
          <span className="workspace-avatar" aria-hidden="true">
            {user?.ho_ten?.trim()?.charAt(0)?.toLocaleUpperCase('vi') || 'N'}
          </span>
          <span>
            <strong>{user?.ho_ten}</strong>
            <small>{roleLabels[user?.role] ?? user?.role}</small>
          </span>
        </div>
        <Link to="/" className="workspace-store-link">
          <span>Cửa hàng</span><ArrowUpRight size={16} aria-hidden="true" />
        </Link>
        <button type="button" className="workspace-logout" onClick={handleLogout} aria-label="Đăng xuất">
          <LogOut size={18} aria-hidden="true" />
        </button>
      </div>
    </header>
  )
}

export default WorkspaceTopbar
