import { useState } from 'react'
import { ArrowRight, Leaf } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import authApi from '../../api/authApi.js'
import Button from '../../components/Button.jsx'
import LoadingSpinner from '../../components/LoadingSpinner.jsx'

function RegisterPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    ho_ten: '',
    email: '',
    so_dien_thoai: '',
    password: '',
    password_confirmation: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  async function submitRegistration(event) {
    event.preventDefault()
    setErrorMessage('')
    if (form.password !== form.password_confirmation) {
      setErrorMessage('Mật khẩu nhập lại chưa khớp.')
      return
    }
    setIsSubmitting(true)

    try {
      await authApi.register(form)
      navigate('/login', {
        replace: true,
        state: { notice: 'Tạo tài khoản thành công. Hãy đăng nhập để tiếp tục.' },
      })
    } catch (error) {
      setErrorMessage(
        Object.values(error.response?.data?.errors ?? {}).flat().find(Boolean) ??
          error.response?.data?.message ??
          'Không thể tạo tài khoản. Vui lòng kiểm tra thông tin và thử lại.',
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
          <h1>Bắt đầu<br />hành trình<br /><em>lành mạnh.</em></h1>
          <span>Tạo tài khoản khách hàng để đặt mua và theo dõi nông sản minh bạch.</span>
        </div>
        <div className="login-story-footer">Nông Lành <span>·</span> Ăn sạch, sống lành</div>
      </div>

      <div className="login-form-wrap">
        <div className="login-card">
          <p className="section-kicker">Tài khoản khách hàng</p>
          <h2>Tạo tài khoản</h2>
          <p className="login-subtitle">Thông tin của bạn được dùng để quản lý đơn hàng và địa chỉ giao nhận.</p>
          {errorMessage && <p className="login-error" role="alert">{errorMessage}</p>}

          <form className="login-form" onSubmit={submitRegistration}>
            <label htmlFor="register-name">
              Họ và tên
              <span className="login-input-wrap">
                <input
                  id="register-name"
                  name="ho_ten"
                  autoComplete="name"
                  maxLength={100}
                  required
                  value={form.ho_ten}
                  onChange={updateField}
                />
              </span>
            </label>
            <label htmlFor="register-email">
              Email
              <span className="login-input-wrap">
                <input
                  id="register-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  maxLength={150}
                  required
                  value={form.email}
                  onChange={updateField}
                />
              </span>
            </label>
            <label htmlFor="register-phone">
              Số điện thoại (không bắt buộc)
              <span className="login-input-wrap">
                <input
                  id="register-phone"
                  name="so_dien_thoai"
                  type="tel"
                  autoComplete="tel"
                  maxLength={15}
                  value={form.so_dien_thoai}
                  onChange={updateField}
                />
              </span>
            </label>
            <label htmlFor="register-password">
              Mật khẩu (ít nhất 8 ký tự, có chữ hoa, chữ thường và số)
              <span className="login-input-wrap">
                <input
                  id="register-password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  value={form.password}
                  onChange={updateField}
                />
              </span>
            </label>
            <label htmlFor="register-password-confirmation">
              Nhập lại mật khẩu
              <span className="login-input-wrap">
                <input
                  id="register-password-confirmation"
                  name="password_confirmation"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  value={form.password_confirmation}
                  onChange={updateField}
                />
              </span>
            </label>
            <Button type="submit" className="login-submit w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <><LoadingSpinner label="Đang tạo tài khoản" className="mr-2" />Đang tạo...</>
              ) : (
                <>Tạo tài khoản <ArrowRight size={17} className="ml-2" /></>
              )}
            </Button>
          </form>

          <p className="login-continue">
            Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
          </p>
        </div>
      </div>
    </section>
  )
}

export default RegisterPage
