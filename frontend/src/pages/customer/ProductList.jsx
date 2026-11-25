import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import LoadingSpinner from '../../components/LoadingSpinner.jsx'
import ToastNotification from '../../components/ToastNotification.jsx'
import productApi from '../../api/productApi.js'

const currencyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
})

function ProductList() {
  const [products, setProducts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const dismissToast = useCallback(() => setToast(null), [])

  useEffect(() => {
    const controller = new AbortController()

    async function loadProducts() {
      try {
        const response = await productApi.getProducts(
          { per_page: 24 },
          { signal: controller.signal },
        )
        setProducts(response.data.data)
      } catch (error) {
        if (!controller.signal.aborted) {
          setToast({
            message:
              error.response?.data?.message ??
              'Không tải được danh sách sản phẩm. Vui lòng thử lại.',
            type: 'error',
          })
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    loadProducts()

    return () => controller.abort()
  }, [])

  return (
    <section>
      {toast && (
        <ToastNotification
          message={toast.message}
          type={toast.type}
          onClose={dismissToast}
        />
      )}
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-green-700">
          Nông sản sạch theo mùa
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">
          Sản phẩm từ nông trại
        </h1>
        <p className="mt-3 max-w-2xl text-slate-600">
          Chọn nông sản tươi ngon, minh bạch lô hàng và thông tin canh tác.
        </p>
      </div>

      {isLoading ? (
        <div className="flex min-h-48 items-center justify-center">
          <LoadingSpinner label="Đang tải sản phẩm" className="text-green-700" />
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600">
          Hiện chưa có sản phẩm nào đang mở bán.
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => {
            const availableQuantity = product.batches.reduce(
              (total, batch) => total + Number(batch.so_luong_kha_dung),
              0,
            )

            return (
              <article
                key={product.id}
                className="flex flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm"
              >
                {product.hinh_anh_dai_dien ? (
                  <img
                    src={product.hinh_anh_dai_dien}
                    alt={product.ten_san_pham}
                    className="h-48 w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div
                    aria-hidden="true"
                    className="flex h-48 items-center justify-center bg-gradient-to-br from-green-100 to-lime-50 text-5xl"
                  >
                    🌱
                  </div>
                )}
                <div className="flex flex-1 flex-col p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-green-700">
                    {product.category?.ten_danh_muc ?? 'Nông sản sạch'}
                  </p>
                  <h2 className="mt-2 text-lg font-bold text-slate-900">
                    {product.ten_san_pham}
                  </h2>
                  <p className="mt-2 line-clamp-2 flex-1 text-sm text-slate-600">
                    {product.mo_ta}
                  </p>
                  <div className="mt-5 flex items-end justify-between gap-3">
                    <div>
                      <p className="font-bold text-green-800">
                        {currencyFormatter.format(Number(product.gia_ban_co_ban))}
                        <span className="ml-1 text-xs font-medium text-slate-500">
                          / {product.don_vi_tinh}
                        </span>
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Còn {availableQuantity} {product.don_vi_tinh}
                      </p>
                    </div>
                    <Link
                      to={`/products/${product.slug}`}
                      className="inline-flex min-h-11 items-center rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700 focus-visible:ring-offset-2"
                    >
                      Xem chi tiết
                    </Link>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}

export default ProductList
