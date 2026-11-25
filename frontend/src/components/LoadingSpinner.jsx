function LoadingSpinner({ label = 'Đang tải', className = '' }) {
  return (
    <span
      role="status"
      aria-label={label}
      className={`inline-flex items-center gap-2 ${className}`}
    >
      <span
        aria-hidden="true"
        className="h-5 w-5 animate-spin rounded-full border-2 border-current border-r-transparent"
      />
      <span className="sr-only">{label}</span>
    </span>
  )
}

export default LoadingSpinner
