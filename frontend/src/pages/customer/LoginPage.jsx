import { useState } from 'react'
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
      navigate(location.state?.from?.pathname ?? '/products', { replace: true })
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
    <section className="mx-auto max-w-md rounded-2xl bg-white p-6 shadow-sm sm:p-8">
      <p className="text-sm font-semibold uppercase tracking-wide text-green-700">
        Chào mừng trở lại
      </p>
      <h1 className="mt-2 text-2xl font-bold text-slate-900">Đăng nhập Nông Lành</h1>
      <p className="mt-2 text-sm text-slate-600">
        Đăng nhập để quản lý giỏ hàng và đơn hàng của bạn.
      </p>

      {location.state?.notice && (
        <p className="mt-5 rounded-lg bg-amber-50 p-3 text-sm text-amber-900" role="status">
          {location.state.notice}
        </p>
      )}
      {errorMessage && (
        <p className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-800" role="alert">
          {errorMessage}
        </p>
      )}

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="login-email" className="block text-sm font-medium text-slate-700">
            Email
          </label>
          <input
            id="login-email"
            type="email"
            name="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-slate-900 focus:border-green-700 focus:outline-none focus:ring-2 focus:ring-green-700/20"
          />
        </div>
        <div>
          <label htmlFor="login-password" className="block text-sm font-medium text-slate-700">
            Mật khẩu
          </label>
          <input
            id="login-password"
            type="password"
            name="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-slate-900 focus:border-green-700 focus:outline-none focus:ring-2 focus:ring-green-700/20"
          />
        </div>
        <Button
          type="submit"
          className="w-full disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <LoadingSpinner label="Đang đăng nhập" className="mr-2" />
              Đang đăng nhập...
            </>
          ) : (
            'Đăng nhập'
          )}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">
        Chưa muốn đăng nhập?{' '}
        <Link to="/products" className="font-semibold text-green-800 hover:underline">
          Tiếp tục xem sản phẩm
        </Link>
      </p>
    </section>
  )
}

export default LoginPage
