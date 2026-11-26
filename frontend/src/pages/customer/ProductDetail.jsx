import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import cartApi from '../../api/cartApi.js'
import productApi from '../../api/productApi.js'
import Button from '../../components/Button.jsx'
import LoadingSpinner from '../../components/LoadingSpinner.jsx'
import ToastNotification from '../../components/ToastNotification.jsx'

const currencyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
})

function ProductDetail() {
  const { slug } = useParams()
  const [product, setProduct] = useState(null)
  const [quantity, setQuantity] = useState('1')
  const [isLoading, setIsLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [reviews, setReviews] = useState([])
  const [reviewMeta, setReviewMeta] = useState(null)
  const [reviewsError, setReviewsError] = useState('')
  const [toast, setToast] = useState(null)
  const dismissToast = useCallback(() => setToast(null), [])

  useEffect(() => {
    const controller = new AbortController()

    async function loadProduct() {
      setIsLoading(true)
      setProduct(null)

      try {
        const response = await productApi.getProduct(slug, {
          signal: controller.signal,
        })
        setProduct(response.data.data)
      } catch (error) {
        if (!controller.signal.aborted) {
          setToast({
            message:
              error.response?.data?.message ??
              'Không tải được thông tin sản phẩm. Vui lòng thử lại.',
            type: 'error',
          })
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    loadProduct()

    return () => controller.abort()
  }, [slug])

  useEffect(() => {
    if (!product?.id) return undefined

    const controller = new AbortController()
    async function loadReviews() {
      setReviewsError('')
      try {
        const response = await productApi.getReviews(
          product.id,
          { page: 1 },
          { signal: controller.signal },
        )
        setReviews(response.data.data)
        setReviewMeta(response.data.meta)
      } catch (error) {
        if (!controller.signal.aborted) {
          setReviewsError(
            error.response?.data?.message ?? 'Không tải được đánh giá sản phẩm.',
          )
        }
      }
    }

    loadReviews()
    return () => controller.abort()
  }, [product?.id])

  const availableQuantity = useMemo(
    () =>
      product?.batches.reduce(
        (total, batch) => total + Number(batch.so_luong_kha_dung),
        0,
      ) ?? 0,
    [product],
  )

  async function addToCart() {
    if (!product || !Number.isFinite(Number(quantity)) || Number(quantity) <= 0) {
      return
    }

    setIsAdding(true)

    try {
      await cartApi.addItem({
        product_id: product.id,
        so_luong: Number(quantity),
      })
      setToast({
        message: `${product.ten_san_pham} đã được thêm vào giỏ hàng.`,
        type: 'success',
      })
    } catch (error) {
      const status = error.response?.status
      const validationMessage = Object.values(error.response?.data?.errors ?? {})
        .flat()
        .find(Boolean)

      setToast({
        message:
          (status === 401
            ? 'Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng.'
            : validationMessage) ??
          error.response?.data?.message ??
          'Không thể thêm sản phẩm vào giỏ hàng. Vui lòng thử lại.',
        type: 'error',
      })
    } finally {
      setIsAdding(false)
    }
  }

  const traceUrl = (qrCode) => {
    const frontendBaseUrl = (
      import.meta.env.VITE_APP_URL || window.location.origin
    ).replace(/\/+$/, '')
    return `${frontendBaseUrl}/trace/${encodeURIComponent(qrCode)}`
  }

  if (isLoading) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <LoadingSpinner label="Đang tải chi tiết sản phẩm" className="text-green-700" />
      </div>
    )
  }

  return (
    <section>
      {toast && (
        <ToastNotification
          message={toast.message}
          type={toast.type}
          onClose={dismissToast}
        />
      )}

      {!product ? (
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">
            Không tìm thấy sản phẩm
          </h1>
          <p className="mt-2 text-slate-600">
            Sản phẩm có thể đã ngừng bán hoặc không còn lô hàng khả dụng.
          </p>
          <Link
            to="/products"
            className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800"
          >
            Quay lại danh sách
          </Link>
        </div>
      ) : (
        <>
          <Link
            to="/products"
            className="mb-5 inline-flex text-sm font-semibold text-green-800 hover:underline"
          >
            ← Tất cả sản phẩm
          </Link>

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.8fr)]">
            <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
              {product.hinh_anh_dai_dien ? (
                <img
                  src={product.hinh_anh_dai_dien}
                  alt={product.ten_san_pham}
                  className="h-64 w-full object-cover sm:h-96"
                />
              ) : (
                <div
                  aria-hidden="true"
                  className="flex h-64 items-center justify-center bg-gradient-to-br from-green-100 to-lime-50 text-7xl sm:h-96"
                >
                  🌱
                </div>
              )}
              <div className="p-5 sm:p-8">
                <p className="text-sm font-semibold uppercase tracking-wide text-green-700">
                  {product.category?.ten_danh_muc ?? 'Nông sản sạch'}
                </p>
                <h1 className="mt-2 text-3xl font-bold text-slate-900">
                  {product.ten_san_pham}
                </h1>
                <p className="mt-3 whitespace-pre-line leading-7 text-slate-600">
                  {product.mo_ta || 'Nông sản sạch, được tuyển chọn từ nông trại.'}
                </p>
              </div>
            </div>

            <aside className="h-fit rounded-2xl bg-white p-5 shadow-sm sm:p-7">
              <p className="text-sm text-slate-500">Giá bán</p>
              <p className="mt-1 text-2xl font-bold text-green-800">
                {currencyFormatter.format(Number(product.gia_ban_co_ban))}
                <span className="ml-1 text-sm font-medium text-slate-500">
                  / {product.don_vi_tinh}
                </span>
              </p>
              <p className="mt-2 text-sm text-slate-600">
                Tồn khả dụng: {availableQuantity} {product.don_vi_tinh}
              </p>

              <label
                htmlFor="product-quantity"
                className="mt-5 block text-sm font-medium text-slate-700"
              >
                Số lượng ({product.don_vi_tinh})
              </label>
              <input
                id="product-quantity"
                type="number"
                min="0.01"
                max={availableQuantity}
                step="0.01"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-slate-900 focus:border-green-700 focus:outline-none focus:ring-2 focus:ring-green-700/20"
              />
              <Button
                className="mt-4 w-full disabled:cursor-not-allowed disabled:opacity-60"
                disabled={
                  isAdding ||
                  availableQuantity <= 0 ||
                  !Number.isFinite(Number(quantity)) ||
                  Number(quantity) <= 0 ||
                  Number(quantity) > availableQuantity
                }
                onClick={addToCart}
              >
                {isAdding ? (
                  <>
                    <LoadingSpinner label="Đang thêm vào giỏ" className="mr-2" />
                    Đang kiểm tra tồn kho...
                  </>
                ) : (
                  'Thêm vào giỏ hàng'
                )}
              </Button>
            </aside>
          </div>

          <section className="mt-10">
            <div className="mb-5">
              <h2 className="text-2xl font-bold text-slate-900">
                Lô hàng đang mở bán
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Xem ngày thu hoạch, hạn sử dụng và nhật ký canh tác của từng lô.
              </p>
            </div>

            <div className="space-y-5">
              {product.batches.map((batch) => (
                <article
                  key={batch.id}
                  className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6"
                >
                  <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">
                        Lô {batch.ma_lo}
                      </h3>
                      <dl className="mt-3 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
                        <div>
                          <dt className="inline text-slate-500">Ngày thu hoạch: </dt>
                          <dd className="inline font-medium text-slate-800">
                            {batch.ngay_thu_hoach ?? 'Chưa cập nhật'}
                          </dd>
                        </div>
                        <div>
                          <dt className="inline text-slate-500">Hạn sử dụng: </dt>
                          <dd className="inline font-medium text-slate-800">
                            {batch.ngay_het_han ?? 'Chưa cập nhật'}
                          </dd>
                        </div>
                        <div>
                          <dt className="inline text-slate-500">Tồn khả dụng: </dt>
                          <dd className="inline font-medium text-slate-800">
                            {batch.so_luong_kha_dung} {batch.don_vi_tinh}
                          </dd>
                        </div>
                      </dl>
                    </div>

                    {batch.qr_code ? (
                      <div className="flex shrink-0 flex-col items-center rounded-xl border border-slate-100 p-3">
                        <QRCodeSVG
                          value={traceUrl(batch.qr_code)}
                          size={176}
                          level="H"
                          includeMargin
                          bgColor="#ffffff"
                          fgColor="#14532d"
                          title={`Mã QR truy xuất lô ${batch.ma_lo}`}
                        />
                        <a
                          href={traceUrl(batch.qr_code)}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 text-xs font-semibold text-green-800 hover:underline"
                        >
                          Mở nhật ký truy xuất
                        </a>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500">
                        Lô hàng chưa có mã QR truy xuất.
                      </p>
                    )}
                  </div>

                  <div className="mt-6 border-t border-slate-100 pt-5">
                    <h4 className="font-semibold text-slate-900">
                      Nhật ký canh tác
                    </h4>
                    {batch.farming_logs.length === 0 ? (
                      <p className="mt-2 text-sm text-slate-500">
                        Chưa có nhật ký canh tác được công khai.
                      </p>
                    ) : (
                      <ol className="mt-4 space-y-4 border-l-2 border-green-100 pl-5">
                        {batch.farming_logs.map((log, index) => (
                          <li key={`${batch.id}-${index}`} className="relative">
                            <span
                              aria-hidden="true"
                              className="absolute -left-[1.65rem] top-1 h-3 w-3 rounded-full border-2 border-white bg-green-600"
                            />
                            <p className="font-medium text-slate-800">{log.hanh_dong}</p>
                            {log.ghi_chu && (
                              <p className="mt-1 text-sm text-slate-600">{log.ghi_chu}</p>
                            )}
                            {log.hinh_anh_minh_chung && (
                              <img
                                src={log.hinh_anh_minh_chung}
                                alt={`Minh chứng ${log.hanh_dong}`}
                                className="mt-3 max-h-48 rounded-lg object-cover"
                                loading="lazy"
                              />
                            )}
                            <time
                              dateTime={log.thoi_gian}
                              className="mt-1 block text-xs text-slate-500"
                            >
                              {log.thoi_gian
                                ? new Date(log.thoi_gian).toLocaleString('vi-VN')
                                : 'Thời gian chưa cập nhật'}
                            </time>
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="mt-10 rounded-2xl bg-white p-5 shadow-sm sm:p-7">
            <header className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Đánh giá sản phẩm</h2>
                <p className="mt-1 text-sm text-slate-600">
                  {reviewMeta?.total
                    ? `${Number(reviewMeta.average_rating).toFixed(1)} / 5 sao · ${reviewMeta.total} đánh giá`
                    : 'Chưa có đánh giá'}
                </p>
              </div>
            </header>
            {reviewsError ? (
              <p className="mt-4 text-sm text-red-700" role="alert">{reviewsError}</p>
            ) : reviews.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">Hãy là người đầu tiên đánh giá sản phẩm này.</p>
            ) : (
              <ul className="mt-5 divide-y divide-slate-100">
                {reviews.map((review) => (
                  <li key={review.id} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-slate-900">
                        {review.user?.ho_ten ?? 'Khách hàng'}
                      </p>
                      <p className="text-sm font-semibold text-amber-600" aria-label={`${review.so_sao} trên 5 sao`}>
                        {'★'.repeat(review.so_sao)}{'☆'.repeat(5 - review.so_sao)}
                        <span className="ml-2 text-slate-600">{review.so_sao}/5</span>
                      </p>
                    </div>
                    {review.noi_dung && <p className="mt-2 text-sm leading-6 text-slate-700">{review.noi_dung}</p>}
                    <time className="mt-2 block text-xs text-slate-500">
                      {review.created_at ? new Date(review.created_at).toLocaleDateString('vi-VN') : ''}
                    </time>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </section>
  )
}

export default ProductDetail
