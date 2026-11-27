import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ArrowRight,
  Camera,
  ChevronDown,
  CircleUserRound,
  Leaf,
  LogOut,
  Search,
  ShoppingBasket,
  X,
} from 'lucide-react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import authApi from '../api/authApi.js'
import cartApi from '../api/cartApi.js'
import ToastNotification from './ToastNotification.jsx'
import useAuth from '../contexts/useAuth.js'

const roleLabels = {
  customer: 'Khách hàng',
  farm_staff: 'Nhân viên nông trại',
  sales: 'Nhân viên bán hàng',
  admin: 'Quản trị viên',
}

function getTraceCode(scannedValue) {
  try {
    const url = new URL(scannedValue)
    const traceMatch = url.pathname.match(/\/trace\/([^/]+)\/?$/)
    if (traceMatch) return decodeURIComponent(traceMatch[1])
  } catch {
    // QR labels can contain the raw code rather than a URL.
  }

  return scannedValue.trim()
}

function Header() {
  const { user, clearSession } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const videoRef = useRef(null)
  const closeScannerRef = useRef(null)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isAccountOpen, setIsAccountOpen] = useState(false)
  const [isScannerOpen, setIsScannerOpen] = useState(false)
  const [scannerMessage, setScannerMessage] = useState('')
  const [manualQrCode, setManualQrCode] = useState('')
  const [search, setSearch] = useState('')
  const [cartCount, setCartCount] = useState(null)
  const [cartError, setCartError] = useState('')
  const dismissCartError = useCallback(() => setCartError(''), [])

  useEffect(() => {
    if (user?.role !== 'customer') return undefined

    const controller = new AbortController()
    async function loadCartCount() {
      try {
        const response = await cartApi.getCart({ signal: controller.signal })
        if (!controller.signal.aborted) {
          setCartError('')
          setCartCount(response.data.data.reduce(
            (total, item) => total + Number(item.so_luong || 0),
            0,
          ))
        }
      } catch {
        if (!controller.signal.aborted) {
          setCartCount(null)
          setCartError('Không thể cập nhật số lượng giỏ hàng. Hãy mở giỏ hàng để thử lại.')
        }
      }
    }

    loadCartCount()
    return () => controller.abort()
  }, [user?.role, location.pathname])

  useEffect(() => {
    if (!isScannerOpen) return undefined

    const previousFocus = document.activeElement
    closeScannerRef.current?.focus()
    function handleEscape(event) {
      if (event.key === 'Escape') setIsScannerOpen(false)
    }
    window.addEventListener('keydown', handleEscape)
    let cancelled = false
    let controls
    async function startScanner() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setScannerMessage('Trình duyệt này không hỗ trợ truy cập camera.')
        return
      }

      try {
        const { BrowserQRCodeReader } = await import('@zxing/browser')
        const reader = new BrowserQRCodeReader(undefined, {
          delayBetweenScanAttempts: 180,
          delayBetweenScanSuccess: 250,
        })
        const scannerControls = await reader.decodeFromVideoDevice(
          undefined,
          videoRef.current,
          (result, error) => {
            if (cancelled) return
            if (result) {
              const qrCode = getTraceCode(result.getText())
              if (!qrCode) {
                setScannerMessage('Mã QR không chứa mã truy xuất hợp lệ.')
                return
              }
              setIsScannerOpen(false)
              navigate(`/trace/${encodeURIComponent(qrCode)}`)
            } else if (error && !String(error.name || error.constructor?.name || '').includes('NotFoundException')) {
              setScannerMessage('Không đọc được mã QR. Hãy thử lại hoặc nhập mã thủ công.')
            }
          },
        )
        controls = scannerControls
        if (cancelled) scannerControls.stop()
      } catch (error) {
        if (cancelled) return
        const messages = {
          NotAllowedError: 'Bạn chưa cấp quyền sử dụng camera cho trang này.',
          NotFoundError: 'Không tìm thấy camera trên thiết bị.',
          NotReadableError: 'Camera đang được ứng dụng khác sử dụng.',
        }
        setScannerMessage(messages[error?.name] || 'Không thể khởi động camera. Vui lòng nhập mã truy xuất thủ công.')
      }
    }

    startScanner()
    return () => {
      cancelled = true
      controls?.stop()
      window.removeEventListener('keydown', handleEscape)
      previousFocus?.focus?.()
    }
  }, [isScannerOpen, navigate])

  async function handleLogout() {
    setIsLoggingOut(true)
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
      setIsLoggingOut(false)
      setIsAccountOpen(false)
    }
  }

  function submitSearch(event) {
    event.preventDefault()
    const query = search.trim()
    navigate(query ? `/products?search=${encodeURIComponent(query)}` : '/products')
  }

  return (
    <>
      <header className="site-header">
        <div className="site-nav">
          <div className="site-topline">
            <Link className="site-brand" to="/" aria-label="Nông Lành - Trang chủ">
              <span className="site-brand-mark" aria-hidden="true"><Leaf size={21} strokeWidth={2.2} /></span>
              <span>Nông Lành</span>
            </Link>

            <form className="site-search" role="search" onSubmit={submitSearch}>
              <Search size={18} aria-hidden="true" />
              <label className="sr-only" htmlFor="header-product-search">Tìm nông sản</label>
              <input
                id="header-product-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm nông sản tươi..."
              />
              <button type="submit" aria-label="Tìm kiếm"><ArrowRight size={17} /></button>
            </form>

            <div className="site-actions">
              <button
                type="button"
                className="site-icon-button"
                onClick={() => {
                  setScannerMessage('')
                  setIsScannerOpen(true)
                }}
                aria-label="Quét mã QR truy xuất nguồn gốc"
                title="Quét mã QR"
              >
                <Camera size={19} />
                <span className="site-action-label">Quét QR</span>
              </button>
              <Link
                className="site-icon-button site-cart-link"
                to="/cart"
                aria-label={cartCount === null ? 'Giỏ hàng' : `Giỏ hàng, ${cartCount} sản phẩm`}
              >
                <ShoppingBasket size={20} />
                <span className="site-action-label">Giỏ hàng</span>
                {cartCount > 0 && <span className="site-cart-badge">{cartCount > 99 ? '99+' : cartCount}</span>}
              </Link>

              {user ? (
                <div className="site-account">
                  <button
                    type="button"
                    className="site-account-trigger"
                    aria-expanded={isAccountOpen}
                    aria-haspopup="menu"
                    onClick={() => setIsAccountOpen((current) => !current)}
                  >
                    <CircleUserRound size={20} />
                    <span className="site-account-name">{user.ho_ten}</span>
                    <ChevronDown size={15} aria-hidden="true" />
                  </button>
                  {isAccountOpen && (
                    <div className="site-account-menu" role="menu">
                      <p className="site-account-meta">{roleLabels[user.role] ?? user.role}</p>
                      {user.role === 'customer' && (
                        <>
                          <Link to="/orders" role="menuitem" onClick={() => setIsAccountOpen(false)}>Đơn hàng của tôi</Link>
                          <Link to="/profile" role="menuitem" onClick={() => setIsAccountOpen(false)}>Sổ địa chỉ</Link>
                          <Link to="/subscriptions" role="menuitem" onClick={() => setIsAccountOpen(false)}>Gói định kỳ</Link>
                        </>
                      )}
                      {user.role === 'farm_staff' && (
                        <Link to="/staff/batches" role="menuitem" onClick={() => setIsAccountOpen(false)}>Không gian nông trại</Link>
                      )}
                      {user.role === 'sales' && (
                        <Link to="/staff/orders" role="menuitem" onClick={() => setIsAccountOpen(false)}>Không gian bán hàng</Link>
                      )}
                      {user.role === 'admin' && (
                        <Link to="/admin/dashboard" role="menuitem" onClick={() => setIsAccountOpen(false)}>Không gian quản trị</Link>
                      )}
                      <button
                        type="button"
                        role="menuitem"
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                      >
                        <LogOut size={16} aria-hidden="true" />
                        {isLoggingOut ? 'Đang đăng xuất...' : 'Đăng xuất'}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link className="site-login" to="/login">Đăng nhập</Link>
              )}
            </div>
          </div>

          <nav className="site-links" aria-label="Điều hướng chính">
            <NavLink to="/" end>Trang chủ</NavLink>
            <NavLink to="/products">Sản phẩm</NavLink>
            <NavLink to="/about">Giới thiệu</NavLink>
            <NavLink to="/contact">Liên hệ</NavLink>
          </nav>
        </div>
      </header>

      {cartError && user?.role === 'customer' && (
        <ToastNotification
          message={cartError}
          type="error"
          onClose={dismissCartError}
        />
      )}

      {isScannerOpen && (
        <div
          className="qr-dialog-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsScannerOpen(false)
          }}
        >
          <section
            className="qr-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="qr-dialog-title"
          >
            <header>
              <div>
                <p className="section-kicker">Truy xuất nguồn gốc</p>
                <h2 id="qr-dialog-title">Quét mã QR sản phẩm</h2>
              </div>
              <button
                type="button"
                className="qr-dialog-close"
                ref={closeScannerRef}
                onClick={() => setIsScannerOpen(false)}
                aria-label="Đóng camera"
              >
                <X size={20} />
              </button>
            </header>
            <div className="qr-video-frame">
              <video ref={videoRef} muted playsInline aria-label="Hình ảnh camera đang quét mã QR" />
              <span className="qr-scan-guide" aria-hidden="true" />
            </div>
            <p className="qr-scanner-message" role="status">
              {scannerMessage || 'Đưa mã QR vào khung hình để mở hồ sơ truy xuất.'}
            </p>
            <form
              className="qr-manual-form"
              onSubmit={(event) => {
                event.preventDefault()
                const qrCode = manualQrCode.trim()
                if (!qrCode) return
                setIsScannerOpen(false)
                navigate(`/trace/${encodeURIComponent(qrCode)}`)
              }}
            >
              <label htmlFor="manual-qr-code">Hoặc nhập mã truy xuất</label>
              <div>
                <input
                  id="manual-qr-code"
                  value={manualQrCode}
                  onChange={(event) => setManualQrCode(event.target.value)}
                  placeholder="Nhập mã trên tem QR"
                />
                <button type="submit" aria-label="Tra cứu mã QR" disabled={!manualQrCode.trim()}>
                  <ArrowRight size={18} />
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  )
}

export default Header
