function SkeletonBlock({ className = '' }) {
  return <span aria-hidden="true" className={`skeleton-block ${className}`} />
}

export function ProductGridSkeleton({ count = 6 }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" role="status" aria-label="Đang tải sản phẩm">
      {Array.from({ length: count }, (_, index) => (
        <article key={index} className="skeleton-card">
          <SkeletonBlock className="skeleton-image" />
          <div className="space-y-3 p-5">
            <SkeletonBlock className="h-3 w-1/3" />
            <SkeletonBlock className="h-5 w-3/4" />
            <SkeletonBlock className="h-4 w-full" />
            <SkeletonBlock className="h-4 w-2/3" />
            <div className="flex items-center justify-between pt-2">
              <SkeletonBlock className="h-5 w-1/3" />
              <SkeletonBlock className="h-11 w-28 rounded-lg" />
            </div>
          </div>
        </article>
      ))}
      <span className="sr-only">Đang tải dữ liệu sản phẩm…</span>
    </div>
  )
}

export function ProductDetailSkeleton() {
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.8fr)]" role="status" aria-label="Đang tải chi tiết sản phẩm">
      <div className="skeleton-card overflow-hidden">
        <SkeletonBlock className="h-64 w-full sm:h-96" />
        <div className="space-y-4 p-6">
          <SkeletonBlock className="h-4 w-1/4" />
          <SkeletonBlock className="h-8 w-2/3" />
          <SkeletonBlock className="h-4 w-full" />
          <SkeletonBlock className="h-4 w-5/6" />
        </div>
      </div>
      <div className="skeleton-card space-y-4 p-6">
        <SkeletonBlock className="h-4 w-1/3" />
        <SkeletonBlock className="h-8 w-1/2" />
        <SkeletonBlock className="h-4 w-2/3" />
        <SkeletonBlock className="h-11 w-full rounded-lg" />
        <SkeletonBlock className="h-11 w-full rounded-lg" />
      </div>
      <span className="sr-only">Đang tải dữ liệu sản phẩm…</span>
    </div>
  )
}

export function TableSkeleton({ columns = 4, rows = 5, label = 'Đang tải dữ liệu' }) {
  return (
    <div className="skeleton-table" role="status" aria-label={label} aria-busy="true">
      {Array.from({ length: rows }, (_, row) => (
        <div className="skeleton-table-row" key={row} style={{ '--skeleton-columns': columns }}>
          {Array.from({ length: columns }, (_, column) => (
            <SkeletonBlock className="h-4 w-full" key={column} />
          ))}
        </div>
      ))}
      <span className="sr-only">{label}…</span>
    </div>
  )
}

export function TraceSkeleton() {
  return (
    <div className="mx-auto max-w-4xl space-y-6" role="status" aria-label="Đang tải thông tin truy xuất">
      <div className="skeleton-card space-y-4 p-7">
        <SkeletonBlock className="h-4 w-1/3" />
        <SkeletonBlock className="h-8 w-2/3" />
        <SkeletonBlock className="h-4 w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="skeleton-card h-40 p-5"><SkeletonBlock className="h-4 w-1/2" /></div>
        <div className="skeleton-card h-40 p-5"><SkeletonBlock className="h-4 w-1/2" /></div>
      </div>
      <div className="skeleton-card space-y-4 p-6">
        <SkeletonBlock className="h-6 w-1/3" />
        <SkeletonBlock className="h-4 w-5/6" />
        <SkeletonBlock className="h-4 w-2/3" />
      </div>
      <span className="sr-only">Đang tải dữ liệu truy xuất…</span>
    </div>
  )
}

export default SkeletonBlock
