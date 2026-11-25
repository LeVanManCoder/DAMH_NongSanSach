import { useEffect } from 'react'

const variants = {
  success: 'border-green-200 bg-green-50 text-green-900',
  error: 'border-red-200 bg-red-50 text-red-900',
}

function ToastNotification({ message, type = 'success', onClose, duration = 4500 }) {
  useEffect(() => {
    const timeoutId = window.setTimeout(onClose, duration)

    return () => window.clearTimeout(timeoutId)
  }, [duration, onClose])

  if (!message) {
    return null
  }

  return (
    <div
      role={type === 'error' ? 'alert' : 'status'}
      aria-live={type === 'error' ? 'assertive' : 'polite'}
      className={`fixed right-4 top-4 z-50 flex max-w-sm items-start gap-4 rounded-xl border px-4 py-3 shadow-lg ${variants[type] ?? variants.success}`}
    >
      <p className="text-sm font-medium">{message}</p>
      <button
        type="button"
        aria-label="Đóng thông báo"
        className="rounded px-1 text-lg leading-5 opacity-70 hover:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        onClick={onClose}
      >
        ×
      </button>
    </div>
  )
}

export default ToastNotification
