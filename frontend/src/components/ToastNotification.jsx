import { useEffect } from 'react'
import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from 'lucide-react'

const variants = {
  success: {
    className: 'toast-success',
    icon: CircleCheck,
  },
  error: {
    className: 'toast-error',
    icon: CircleAlert,
  },
  warning: {
    className: 'toast-warning',
    icon: TriangleAlert,
  },
  info: {
    className: 'toast-info',
    icon: Info,
  },
}

function ToastNotification({ message, type = 'success', onClose, duration = 4500 }) {
  useEffect(() => {
    if (!message || !duration) return undefined
    const timeoutId = window.setTimeout(onClose, duration)

    return () => window.clearTimeout(timeoutId)
  }, [duration, message, onClose])

  if (!message) {
    return null
  }

  const variant = variants[type] ?? variants.success
  const Icon = variant.icon

  return (
    <div
      role={type === 'error' ? 'alert' : 'status'}
      aria-live={type === 'error' ? 'assertive' : 'polite'}
      className={`toast-notification ${variant.className}`}
    >
      <Icon className="mt-0.5 shrink-0" size={19} aria-hidden="true" />
      <p className="min-w-0 flex-1 text-sm font-medium">{message}</p>
      <button
        type="button"
        className="toast-dismiss"
        aria-label="Đóng thông báo"
        onClick={onClose}
      >
        <X size={17} aria-hidden="true" />
      </button>
    </div>
  )
}

export default ToastNotification
