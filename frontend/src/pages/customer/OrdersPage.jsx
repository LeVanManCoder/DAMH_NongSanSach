import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import orderApi from '../../api/orderApi.js'
import Button from '../../components/Button.jsx'
import LoadingSpinner from '../../components/LoadingSpinner.jsx'
import ToastNotification from '../../components/ToastNotification.jsx'
import useAuth from '../../contexts/useAuth.js'

const MAX_FILE_SIZE = 5 * 1024 * 1024
const COMPLAINT_REASONS = [
  ['dap_nat', 'Sản phẩm bị dập nát'],
  ['hu_hong', 'Sản phẩm hư hỏng'],
  ['thieu_hang', 'Thiếu hàng'],
  ['sai_san_pham', 'Giao sai sản phẩm'],
  ['khac', 'Lý do khác'],
]
const ORDER_STATUSES = {
  cho_duyet: 'Chờ xác nhận',
  da_thanh_toan: 'Đã thanh toán',
  da_xac_nhan: 'Đã xác nhận',
  dang_giao: 'Đang giao',
  da_giao: 'Đã giao',
  da_huy: 'Đã hủy',
  hoan_tien: 'Đã hoàn tiền',
  giao_bu: 'Đang giao bù',
}
const COMPLAINT_STATUSES = {
  cho_xu_ly: 'Chờ xử lý',
  hoan_tien: 'Hoàn tiền',
  giao_bu: 'Giao bù',
  tu_choi: 'Từ chối',
}

function isWithinComplaintWindow(order) {
  if (order.trang_thai !== 'da_giao' || !order.ngay_giao_thuc_te) {
    return false
  }

  const deliveredAt = Date.parse(order.ngay_giao_thuc_te)
  const elapsed = Date.now() - deliveredAt

  return Number.isFinite(deliveredAt) && elapsed >= 0 && elapsed <= 24 * 60 * 60 * 1000
}

function validateEvidence(file) {
  if (!file) {
    return 'Vui lòng chọn ảnh minh chứng.'
  }

  const extension = file.name.split('.').pop()?.toLowerCase()
  if (!['jpg', 'png'].includes(extension)) {
    return 'Chỉ chấp nhận ảnh có đuôi .jpg hoặc .png.'
  }

  if (file.size >= MAX_FILE_SIZE) {
    return 'Ảnh phải có dung lượng nhỏ hơn 5 MB.'
  }

  return ''
}

function OrdersPage() {
  const { user } = useAuth()
  const [orders, setOrders] = useState([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [openComplaintOrderId, setOpenComplaintOrderId] = useState(null)
  const [reason, setReason] = useState('hu_hong')
  const [description, setDescription] = useState('')
  const [evidence, setEvidence] = useState(null)
  const [evidenceError, setEvidenceError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [toast, setToast] = useState(null)
  const dismissToast = useCallback(() => setToast(null), [])

  useEffect(() => {
    const controller = new AbortController()

    async function loadOrders() {
      try {
        const response = await orderApi.getMyOrders(
          { page: 1 },
          { signal: controller.signal },
        )
        setOrders(response.data.data)
        setHasMore(Boolean(response.data.links?.next))
      } catch (error) {
        if (!controller.signal.aborted) {
          setErrorMessage(
            error.response?.data?.message ?? 'Không tải được lịch sử đơn hàng.',
          )
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    loadOrders()

    return () => controller.abort()
  }, [])

  async function loadMoreOrders() {
    const nextPage = page + 1
    setIsLoadingMore(true)
    setErrorMessage('')

    try {
      const response = await orderApi.getMyOrders({ page: nextPage })
      setOrders((current) => [...current, ...response.data.data])
      setPage(nextPage)
      setHasMore(Boolean(response.data.links?.next))
    } catch (error) {
      setErrorMessage(error.response?.data?.message ?? 'Không tải thêm được đơn hàng.')
    } finally {
      setIsLoadingMore(false)
    }
  }

  function openComplaintForm(orderId) {
    setOpenComplaintOrderId(orderId)
    setReason('hu_hong')
    setDescription('')
    setEvidence(null)
    setEvidenceError('')
  }

  async function submitComplaint(event, order) {
    event.preventDefault()
    const validationMessage = validateEvidence(evidence)
    setEvidenceError(validationMessage)
    if (validationMessage) {
      return
    }

    const formData = new FormData()
    formData.append('ly_do', reason)
    formData.append('mo_ta', description)
    formData.append('anh_minh_chung', evidence)
    setIsSubmitting(true)

    try {
      const response = await orderApi.submitComplaint(order.id, formData)
      const complaint = response.data.data
      setOrders((current) =>
        current.map((item) =>
          item.id === order.id ? { ...item, complaint } : item,
        ),
      )
      setOpenComplaintOrderId(null)
      setEvidence(null)
      setToast({ message: 'Đã gửi yêu cầu khiếu nại kèm ảnh minh chứng.', type: 'success' })
    } catch (error) {
      const serverEvidenceError = error.response?.data?.errors?.anh_minh_chung?.[0]
      if (serverEvidenceError) {
        setEvidenceError(serverEvidenceError)
      }
      setToast({
        message:
          error.response?.data?.errors?.order?.[0] ??
          error.response?.data?.message ??
          'Không gửi được khiếu nại. Vui lòng thử lại.',
        type: 'error',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (user?.role !== 'customer') {
    return (
      <section className="rounded-2xl bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Đơn hàng của tôi</h1>
        <p className="mt-3 text-slate-600">Đăng nhập bằng tài khoản khách hàng để xem đơn hàng.</p>
        <Link
          to="/login"
          className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800"
        >
          Đăng nhập
        </Link>
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-4xl">
      {toast && (
        <ToastNotification message={toast.message} type={toast.type} onClose={dismissToast} />
      )}
      <header className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-green-700">
          Tài khoản khách hàng
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">Đơn hàng của tôi</h1>
      </header>

      {errorMessage && (
        <p className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-800" role="alert">
          {errorMessage}
        </p>
      )}

      {isLoading ? (
        <div className="flex min-h-48 items-center justify-center">
          <LoadingSpinner label="Đang tải đơn hàng" className="text-green-700" />
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
          <p className="text-slate-600">Bạn chưa có đơn hàng nào.</p>
          <Link className="mt-4 inline-flex font-semibold text-green-800 hover:underline" to="/products">
            Khám phá sản phẩm
          </Link>
        </div>
      ) : (
        <div className="space-y-5">
          {orders.map((order) => {
            const complaintWindowOpen = isWithinComplaintWindow(order)
            const complaint = order.complaint

            return (
              <article key={order.id} className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
                <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Mã đơn
                    </p>
                    <h2 className="mt-1 font-bold text-slate-900">{order.ma_don}</h2>
                  </div>
                  <span className="rounded-full bg-green-50 px-3 py-1 text-sm font-semibold text-green-800">
                    {ORDER_STATUSES[order.trang_thai] ?? order.trang_thai}
                  </span>
                </header>

                <ul className="divide-y divide-slate-100">
                  {(order.details ?? []).map((detail) => (
                    <li key={detail.id} className="flex justify-between gap-4 py-3 text-sm">
                      <span className="text-slate-700">
                        {detail.product?.ten_san_pham ?? 'Sản phẩm'} × {detail.so_luong}
                      </span>
                      <span className="shrink-0 font-medium text-slate-900">
                        {Number(detail.thanh_tien ?? 0).toLocaleString('vi-VN')} đ
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="flex flex-wrap justify-between gap-2 border-t border-slate-100 pt-4 text-sm">
                  <span className="text-slate-600">
                    Đặt lúc {order.ngay_tao ? new Date(order.ngay_tao).toLocaleString('vi-VN') : '—'}
                  </span>
                  <span className="font-bold text-slate-900">
                    Tổng cộng: {Number(order.tong_thanh_toan ?? 0).toLocaleString('vi-VN')} đ
                  </span>
                </div>

                {complaint ? (
                  <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
                    <p className="font-semibold text-amber-900">
                      Khiếu nại: {COMPLAINT_STATUSES[complaint.trang_thai] ?? complaint.trang_thai}
                    </p>
                    <p className="mt-1 text-amber-900">
                      {COMPLAINT_REASONS.find(([value]) => value === complaint.ly_do)?.[1] ??
                        complaint.ly_do}
                    </p>
                    {complaint.mo_ta && <p className="mt-1 text-amber-900">{complaint.mo_ta}</p>}
                    <p className="mt-1 text-amber-800">Đã gửi yêu cầu kèm ảnh minh chứng.</p>
                  </div>
                ) : complaintWindowOpen ? (
                  <div className="mt-5">
                    {openComplaintOrderId === order.id ? (
                      <form
                        noValidate
                        onSubmit={(event) => submitComplaint(event, order)}
                        className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4"
                      >
                        <h3 className="font-bold text-slate-900">Gửi yêu cầu khiếu nại</h3>
                        <label className="block text-sm font-medium text-slate-700">
                          Lý do
                          <select
                            value={reason}
                            onChange={(event) => setReason(event.target.value)}
                            className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3"
                          >
                            {COMPLAINT_REASONS.map(([value, label]) => (
                              <option key={value} value={value}>{label}</option>
                            ))}
                          </select>
                        </label>
                        <label className="block text-sm font-medium text-slate-700">
                          Mô tả (không bắt buộc)
                          <textarea
                            value={description}
                            onChange={(event) => setDescription(event.target.value)}
                            maxLength={2000}
                            rows={3}
                            className="mt-2 w-full rounded-lg border border-slate-300 bg-white p-3"
                          />
                        </label>
                        <label className="block text-sm font-medium text-slate-700">
                          Ảnh minh chứng (bắt buộc, .jpg hoặc .png, nhỏ hơn 5 MB)
                          <input
                            type="file"
                            accept=".jpg,.png"
                            aria-describedby={`evidence-error-${order.id}`}
                            onChange={(event) => {
                              const file = event.target.files?.[0] ?? null
                              setEvidence(file)
                              setEvidenceError(file ? validateEvidence(file) : '')
                            }}
                            className="mt-2 block w-full rounded-lg border border-slate-300 bg-white p-2 text-sm"
                          />
                        </label>
                        <p
                          id={`evidence-error-${order.id}`}
                          className="text-sm text-red-700"
                          role={evidenceError ? 'alert' : undefined}
                        >
                          {evidenceError}
                        </p>
                        <div className="flex flex-wrap gap-3">
                          <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? (
                              <>
                                <LoadingSpinner label="Đang gửi khiếu nại" className="mr-2" />
                                Đang gửi...
                              </>
                            ) : 'Gửi khiếu nại'}
                          </Button>
                          <button
                            type="button"
                            onClick={() => setOpenComplaintOrderId(null)}
                            disabled={isSubmitting}
                            className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-white"
                          >
                            Hủy
                          </button>
                        </div>
                      </form>
                    ) : (
                      <button
                        type="button"
                        onClick={() => openComplaintForm(order.id)}
                        className="font-semibold text-green-800 hover:underline"
                      >
                        Gửi yêu cầu khiếu nại
                      </button>
                    )}
                  </div>
                ) : order.trang_thai === 'da_giao' ? (
                  <p className="mt-4 text-sm text-slate-500">
                    Đã hết thời hạn gửi khiếu nại 24 giờ kể từ lúc giao.
                  </p>
                ) : null}
              </article>
            )
          })}
          {hasMore && (
            <div className="text-center">
              <button
                type="button"
                onClick={loadMoreOrders}
                disabled={isLoadingMore}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-green-700 px-5 py-2 font-semibold text-green-800 hover:bg-green-50 disabled:opacity-60"
              >
                {isLoadingMore && <LoadingSpinner label="Đang tải thêm" />}
                {isLoadingMore ? 'Đang tải...' : 'Tải thêm đơn hàng'}
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  )
}

export default OrdersPage
