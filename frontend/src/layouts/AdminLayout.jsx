import { useState } from 'react'
import {
  ClipboardList,
  LayoutDashboard,
  PackageSearch,
  Sprout,
  UsersRound,
  Store,
} from 'lucide-react'
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom'
import WorkspaceTopbar from '../components/WorkspaceTopbar.jsx'
import useAuth from '../contexts/useAuth.js'

const links = [
  ['/admin/dashboard', 'Tổng quan', LayoutDashboard],
  ['/admin/products', 'Sản phẩm & danh mục', PackageSearch],
  ['/admin/users', 'Tài khoản', UsersRound],
  ['/admin/audit-logs', 'Nhật ký hệ thống', ClipboardList],
]

function AdminLayout() {
  const { user } = useAuth()
  const location = useLocation()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  if (user?.role !== 'admin') {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  const pageTitle = links.find(([href]) => location.pathname === href)?.[1] ?? 'Tổng quan'

  return (
    <div className="workspace-shell">
      {isMenuOpen && (
        <button
          type="button"
          className="workspace-scrim"
          aria-label="Đóng điều hướng"
          onClick={() => setIsMenuOpen(false)}
        />
      )}
      <aside className={`workspace-sidebar${isMenuOpen ? ' is-open' : ''}`} aria-label="Điều hướng quản trị">
        <Link className="workspace-brand" to="/admin/dashboard" onClick={() => setIsMenuOpen(false)}>
          <span className="workspace-brand-icon" aria-hidden="true"><Sprout size={21} /></span>
          <span><strong>Nông Lành</strong><small>Quản trị hệ thống</small></span>
        </Link>
        <p className="workspace-nav-caption">QUẢN LÝ</p>
        <nav className="workspace-navigation">
          {links.map(([href, label, Icon]) => (
            <Link
              key={href}
              to={href}
              aria-current={location.pathname === href ? 'page' : undefined}
              className={`workspace-nav-link${location.pathname === href ? ' is-active' : ''}`}
              onClick={() => setIsMenuOpen(false)}
            >
              <Icon size={19} strokeWidth={1.9} aria-hidden="true" />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="workspace-sidebar-bottom">
          <Link className="workspace-nav-link" to="/">
            <Store size={19} aria-hidden="true" />
            <span>Về cửa hàng</span>
          </Link>
          <p>Quản trị minh bạch · Dữ liệu có trách nhiệm</p>
        </div>
      </aside>
      <div className="workspace-main">
        <WorkspaceTopbar
          title={pageTitle}
          isMenuOpen={isMenuOpen}
          onMenuToggle={() => setIsMenuOpen((current) => !current)}
        />
        <main className="workspace-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default AdminLayout
