import { useState } from 'react'
import {
  ClipboardList,
  MessageSquareText,
  Sprout,
  Store,
} from 'lucide-react'
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom'
import WorkspaceTopbar from '../components/WorkspaceTopbar.jsx'
import useAuth from '../contexts/useAuth.js'

const staffNavigation = {
  farm_staff: [
    { to: '/staff/batches', label: 'Lô hàng & mùa vụ', icon: Sprout },
  ],
  sales: [
    { to: '/staff/orders', label: 'Quản lý đơn hàng', icon: ClipboardList },
    { to: '/staff/complaints', label: 'Khiếu nại', icon: MessageSquareText },
  ],
}

function StaffLayout() {
  const { user } = useAuth()
  const location = useLocation()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (user.role === 'admin') {
    return <Navigate to="/admin/dashboard" replace />
  }

  const links = staffNavigation[user.role]
  if (!links) return <Navigate to="/" replace />

  const defaultPath = user.role === 'farm_staff' ? '/staff/batches' : '/staff/orders'
  const allowedPaths = user.role === 'farm_staff'
    ? ['/staff', '/staff/batches', '/staff/batches/waste']
    : ['/staff', '/staff/orders', '/staff/complaints']

  if (!allowedPaths.includes(location.pathname)) {
    return <Navigate to={defaultPath} replace />
  }

  if (location.pathname === '/staff') {
    return <Navigate to={defaultPath} replace />
  }

  const pageTitle = links.find((item) => item.to === location.pathname)?.label
    ?? (user.role === 'farm_staff' ? 'Lô hàng & mùa vụ' : 'Quản lý đơn hàng')

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
      <aside className={`workspace-sidebar${isMenuOpen ? ' is-open' : ''}`} aria-label="Điều hướng nhân viên">
        <Link className="workspace-brand" to={defaultPath} onClick={() => setIsMenuOpen(false)}>
          <span className="workspace-brand-icon" aria-hidden="true"><Sprout size={21} /></span>
          <span><strong>Nông Lành</strong><small>Không gian vận hành</small></span>
        </Link>
        <p className="workspace-nav-caption">CÔNG VIỆC</p>
        <nav className="workspace-navigation">
          {links.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              aria-current={location.pathname === to ? 'page' : undefined}
              className={`workspace-nav-link${location.pathname === to ? ' is-active' : ''}`}
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
          <p>Truy xuất minh bạch · Vận hành có trách nhiệm</p>
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

export default StaffLayout
