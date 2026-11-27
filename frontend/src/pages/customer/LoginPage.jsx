import { useState } from 'react'
import { ArrowRight, Leaf, LockKeyhole, Mail } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import authApi from '../../api/authApi.js'
import Button from '../../components/Button.jsx'
import LoadingSpinner from '../../components/LoadingSpinner.jsx'
import useAuth from '../../contexts/useAuth.js'

function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { signIn } = useAuth()

  async function handleSubmit(event) {
    event.preventDefault()
    setErrorMessage('')
    setIsSubmitting(true)

    try {
      const response = await authApi.login({ email, password })
      signIn(response.data.access_token, response.data.user)
      const workspaceByRole = {
        admin: '/admin/dashboard',
        farm_staff: '/staff/batches',
        sales: '/staff/orders',
        customer: '/',
      }
      navigate(workspaceByRole[response.data.user.role] ?? '/', { replace: true })
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message ??
          'Không thể đăng nhập lúc này. Vui lòng kiểm tra kết nối và thử lại.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="login-shell">
      <div className="login-story">
        <Link to="/" className="login-brand">
          <span><Leaf size={21} /></span>
          Nông Lành
        </Link>
        <div className="login-story-copy">
          <p>THỰC PHẨM TỬ TẾ, NGUỒN GỐC RÕ RÀNG</p>
          <h1>Tươi lành<br />từ nông trại<br /><em>đến bàn ăn.</em></h1>
          <span>Một tài khoản cho hành trình mua sắm và vận hành nông sản minh bạch.</span>
        </div>
        <div className="login-story-footer">Nông Lành <span>·</span> Ăn sạch, sống lành</div>
      </div>
      <div className="login-form-wrap">
        <div className="login-card">
          <p className="section-kicker">Chào mừng trở lại</p>
          <h2>Đăng nhập</h2>
          <p className="login-subtitle">Đăng nhập để tiếp tục tới không gian làm việc của bạn.</p>

          {location.state?.notice && (
            <p className="login-notice" role="status">{location.state.notice}</p>
          )}
          {errorMessage && (
            <p className="login-error" role="alert">{errorMessage}</p>
          )}

          <form className="login-form" onSubmit={handleSubmit}>
            <label htmlFor="login-email">
              Email
              <span className="login-input-wrap">
                <Mail size={18} aria-hidden="true" />
                <input
                  id="login-email"
                  type="email"
                  name="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="khach@nonglanh.vn"
                />
              </span>
            </label>
            <label htmlFor="login-password">
              Mật khẩu
              <span className="login-input-wrap">
                <LockKeyhole size={18} aria-hidden="true" />
                <input
                  id="login-password"
                  type="password"
                  name="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Nhập mật khẩu"
                />
              </span>
            </label>
            <Button
              type="submit"
              className="login-submit w-full disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <LoadingSpinner label="Đang đăng nhập" className="mr-2" />
                  Đang xác thực...
                </>
              ) : (
                <>Đăng nhập <ArrowRight size={17} className="ml-2" /></>
              )}
            </Button>
          </form>

          <p className="login-continue">
            Chưa có tài khoản?{' '}
            <Link to="/register">Đăng ký khách hàng</Link>
          </p>
        </div>
      </div>
    </section>
  )
}

export default LoginPage
