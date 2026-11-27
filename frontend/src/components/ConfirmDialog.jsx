import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import ConfirmContext from './confirmContext.js'

function ConfirmDialog({ request, onSettle }) {
  const cancelRef = useRef(null)
  const confirmRef = useRef(null)

  useEffect(() => {
    if (!request) return undefined

    const previousFocus = document.activeElement
    cancelRef.current?.focus()

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onSettle(false)
        return
      }

      if (event.key !== 'Tab') return
      const first = cancelRef.current
      const last = confirmRef.current
      if (!first || !last) return

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      if (previousFocus instanceof HTMLElement && document.contains(previousFocus)) {
        previousFocus.focus()
      }
    }
  }, [request, onSettle])

  if (!request) return null

  const {
    title = 'Bạn có chắc chắn?',
    description = '',
    confirmLabel = 'Xác nhận',
    cancelLabel = 'Quay lại',
    tone = 'danger',
  } = request
  const titleId = 'confirm-dialog-title'
  const descriptionId = description ? 'confirm-dialog-description' : undefined

  return (
    <div
      className="dialog-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onSettle(false)
      }}
    >
      <section
        className="confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <div className={`confirm-dialog-icon ${tone === 'danger' ? 'is-danger' : 'is-warning'}`}>
          <AlertTriangle size={22} aria-hidden="true" />
        </div>
        <h2 id={titleId}>{title}</h2>
        {description && <p id={descriptionId}>{description}</p>}
        <div className="confirm-dialog-actions">
          <button ref={cancelRef} type="button" className="confirm-cancel" onClick={() => onSettle(false)}>
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            className={tone === 'danger' ? 'confirm-danger' : 'confirm-warning'}
            onClick={() => onSettle(true)}
          >
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  )
}

export function ConfirmProvider({ children }) {
  const [request, setRequest] = useState(null)
  const resolveRef = useRef(null)

  const confirm = useCallback((options) => new Promise((resolve) => {
    if (resolveRef.current) resolveRef.current(false)
    resolveRef.current = resolve
    setRequest(options ?? {})
  }), [])

  const settle = useCallback((confirmed) => {
    const resolve = resolveRef.current
    resolveRef.current = null
    setRequest(null)
    resolve?.(confirmed)
  }, [])

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <ConfirmDialog request={request} onSettle={settle} />
    </ConfirmContext.Provider>
  )
}

