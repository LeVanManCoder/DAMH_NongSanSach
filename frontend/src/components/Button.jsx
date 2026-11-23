const variants = {
  primary: 'bg-green-700 text-white hover:bg-green-800 focus-visible:ring-green-700',
  secondary:
    'border border-green-700 text-green-800 hover:bg-green-50 focus-visible:ring-green-700',
}

function Button({
  children,
  variant = 'primary',
  className = '',
  type = 'button',
  ...props
}) {
  return (
    <button
      type={type}
      className={`inline-flex min-h-11 items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${variants[variant] ?? variants.primary} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export default Button
