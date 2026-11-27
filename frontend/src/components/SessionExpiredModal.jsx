import { useNavigate } from 'react-router-dom'
import useAuth from '../contexts/useAuth.js'

function SessionExpiredModal() {
  const navigate = useNavigate()
  const { sessionExpired, dismissSessionExpired } = useAuth()

  if (!sessionExpired) {
    return null
  }

  function goToLogin() {
    dismissSessionExpired()
    navigate('/login', { replace: true })
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4">
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="session-expired-title"
        aria-describedby="session-expired-message"
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl sm:p-8"
      >
        <div
          aria-hidden="true"
          className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-xl text-amber-800"
        >
          !
        </div>
        <h2
          id="session-expired-title"
          className="text-xl font-bold text-slate-900"
        >
          Phiên đăng nhập đã hết hạn
        </h2>
        <p id="session-expired-message" className="mt-2 text-sm leading-6 text-slate-600">
          Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.
        </p>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={dismissSessionExpired}
            className="min-h-11 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Để sau
          </button>
          <button
            type="button"
            onClick={goToLogin}
            className="min-h-11 rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800"
          >
            Đăng nhập lại
          </button>
        </div>
      </section>
    </div>
  )
}

export default SessionExpiredModal
