import { Link } from 'react-router-dom'
import { Sprout } from 'lucide-react'

function EmptyState({
  icon: Icon = Sprout,
  title,
  description,
  actionLabel,
  actionTo,
  onAction,
}) {
  return (
    <section className="empty-state" aria-labelledby="empty-state-title">
      <span className="empty-state-icon" aria-hidden="true">
        <Icon size={28} strokeWidth={1.8} />
      </span>
      <h2 id="empty-state-title">{title}</h2>
      {description && <p>{description}</p>}
      {actionLabel && actionTo && (
        <Link className="empty-state-action" to={actionTo}>{actionLabel}</Link>
      )}
      {actionLabel && onAction && (
        <button type="button" className="empty-state-action" onClick={onAction}>{actionLabel}</button>
      )}
    </section>
  )
}

export default EmptyState
