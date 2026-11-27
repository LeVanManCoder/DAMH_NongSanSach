import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import batchApi from '../../api/batchApi.js'
import orderApi from '../../api/orderApi.js'
import Button from '../../components/Button.jsx'
import LoadingSpinner from '../../components/LoadingSpinner.jsx'
import ToastNotification from '../../components/ToastNotification.jsx'
import useAuth from '../../contexts/useAuth.js'

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

function nextAction(order) {
  if (['da_thanh_toan', 'da_xac_nhan'].includes(order.trang_thai)) {
    return { status: 'dang_giao', label: 'Bắt đầu giao' }
  }
  if (['dang_giao', 'giao_bu'].includes(order.trang_thai)) {
    return { status: 'da_giao', label: 'Xác nhận đã giao' }
  }

  return null
}

function hasPendingVietQrPayment(order) {
  return order.trang_thai === 'cho_duyet'
    && order.payments?.some(
      (payment) => payment.phuong_thuc === 'vietqr' && payment.trang_thai === 'cho_xu_ly',
    )
}

function daysUntilExpiry(dateString) {
  if (!dateString) return null
  const [year, month, day] = dateString.split('-').map(Number)
  if (![year, month, day].every(Number.isFinite)) return null
  const expiryDay = Date.UTC(year, month - 1, day)
  const now = new Date()
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round((expiryDay - today) / 86400000)
}

function StaffOrdersPage() {
  const { user } = useAuth()
  const [orders, setOrders] = useState([])
  const [expiringBatches, setExpiringBatches] = useState([])
  const [isLoadingExpiring, setIsLoadingExpiring] = useState(true)
  const [expiringError, setExpiringError] = useState('')
  const [expandedOrderId, setExpandedOrderId] = useState(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [updatingOrderId, setUpdatingOrderId] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [toast, setToast] = useState(null)
  const dismissToast = useCallback(() => setToast(null), [])

  const loadOrders = useCallback(async (pageNumber = 1, append = false) => {
    if (!['sales', 'admin'].includes(user?.role)) {
      return
    }

    if (append) {
      setIsLoadingMore(true)
    } else {
      setIsLoading(true)
    }
    setErrorMessage('')

    try {
      const response = await orderApi.getOrders({ page: pageNumber })
      const records = response.data.data
      setOrders((current) => (append ? [...current, ...records] : records))
      setPage(pageNumber)
      setHasMore(Boolean(response.data.links?.next))
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message ?? 'Không tải được danh sách đơn hàng.',
      )
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
    }
  }, [user?.role])

  useEffect(() => {
    if (!['sales', 'admin'].includes(user?.role)) {
      return undefined
    }

    const controller = new AbortController()
    async function initialLoad() {
      try {
        const response = await orderApi.getOrders(
          { page: 1 },
          { signal: controller.signal },
        )
        if (controller.signal.aborted) {
          return
        }

        setOrders(response.data.data)
        setHasMore(Boolean(response.data.links?.next))
      } catch (error) {
        if (!controller.signal.aborted) {
          setErrorMessage(
            error.response?.data?.message ?? 'Không tải được danh sách đơn hàng.',
          )
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    initialLoad()

    return () => controller.abort()
  }, [user?.role])

  useEffect(() => {
    if (user?.role !== 'sales') return undefined

    const controller = new AbortController()
    async function loadExpiringBatches() {
      try {
        const response = await batchApi.getBatches(
          { per_page: 100, trang_thai: 'con_hang' },
          { signal: controller.signal },
        )
        if (controller.signal.aborted) return
        setExpiringBatches(
          response.data.data
            .map((batch) => ({ ...batch, daysRemaining: daysUntilExpiry(batch.ngay_het_han) }))
            .filter((batch) => batch.daysRemaining !== null && batch.daysRemaining >= 0 && batch.daysRemaining <= 2),
        )
      } catch (error) {
        if (!controller.signal.aborted) {
          setExpiringError(
            error.response?.data?.message ?? 'Không tải được cảnh báo lô cận hạn.',
          )
        }
      } finally {
        if (!controller.signal.aborted) setIsLoadingExpiring(false)
      }
    }

    loadExpiringBatches()
    return () => controller.abort()
  }, [user?.role])

  async function approveOrder(order) {
    setUpdatingOrderId(order.id)
    setErrorMessage('')

    try {
      const response = await orderApi.approve(order.id)
      setOrders((current) => current.map((item) =>
        item.id === order.id ? { ...item, ...response.data.data } : item,
      ))
      setToast({
        message: 'Đã duyệt đơn và phân bổ tồn kho theo FEFO.',
        type: 'success',
      })
    } catch (error) {
      setToast({
        message: error.response?.data?.message ?? 'Không thể duyệt đơn. Vui lòng kiểm tra tồn kho.',
        type: 'error',
      })
    } finally {
      setUpdatingOrderId(null)
    }
  }

  async function changeOrderStatus(order, action) {
    setUpdatingOrderId(order.id)
    setErrorMessage('')

    try {
      const response = await orderApi.updateStatus(order.id, action.status)
      setOrders((current) =>
        current.map((item) =>
          item.id === order.id ? { ...item, ...response.data.data } : item,
        ),
      )
      setToast({
        message: action.status === 'da_giao'
          ? 'Đã xác nhận đơn hàng giao thành công.'
          : 'Đơn hàng đã được chuyển sang trạng thái đang giao.',
        type: 'success',
      })
    } catch (error) {
      setToast({
        message:
          error.response?.data?.message ??
          'Không cập nhật được trạng thái đơn hàng. Vui lòng thử lại.',
        type: 'error',
      })
    } finally {
      setUpdatingOrderId(null)
    }
  }

  async function confirmVietQrPayment(order) {
    setUpdatingOrderId(order.id)
    setErrorMessage('')

    try {
      const response = await orderApi.confirmVietQrPayment(order.id)
      setOrders((current) =>
        current.map((item) =>
          item.id === order.id ? { ...item, ...response.data.data } : item,
        ),
      )
      setToast({
        message: 'Đã xác nhận nhận tiền VietQR và phân bổ tồn kho theo FEFO.',
        type: 'success',
      })
    } catch (error) {
      setToast({
        message:
          error.response?.data?.message ??
          'Không xác nhận được giao dịch VietQR. Vui lòng kiểm tra lại.',
        type: 'error',
      })
    } finally {
      setUpdatingOrderId(null)
    }
  }

  if (!['sales', 'admin'].includes(user?.role)) {
    return (
      <section className="rounded-2xl bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Quản lý đơn hàng</h1>
        <p className="mt-3 text-slate-600">
          Trang này dành cho nhân viên bán hàng.
        </p>
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
    <section>
      {toast && (
        <ToastNotification
          message={toast.message}
          type={toast.type}
          onClose={dismissToast}
        />
      )}
      <header className="page-heading mb-6 flex flex-col gap-4 py-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="section-kicker">
            Khu vực nhân viên bán hàng
          </p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
            Quản lý đơn hàng
          </h1>
        </div>
        <Button
          variant="secondary"
          onClick={() => loadOrders()}
          disabled={isLoading}
        >
          Làm mới danh sách
        </Button>
      </header>

      {errorMessage && (
        <p className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-800" role="alert">
          {errorMessage}
        </p>
      )}

      {user?.role === 'sales' && (
        <section className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-5" aria-labelledby="expiry-warning-title">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="section-kicker">Theo dõi tồn kho</p>
              <h2 id="expiry-warning-title" className="mt-1 text-lg font-bold text-amber-950">
                Cảnh báo lô cận hạn
              </h2>
              <p className="mt-1 text-sm text-amber-900">Các lô còn hàng hết hạn trong 2 ngày tới.</p>
            </div>
            {isLoadingExpiring && <LoadingSpinner label="Đang tải lô cận hạn" className="text-amber-800" />}
          </div>
          {expiringError && <p className="mt-3 text-sm text-red-800" role="alert">{expiringError}</p>}
          {!isLoadingExpiring && !expiringError && expiringBatches.length === 0 && (
            <p className="mt-3 text-sm text-amber-900">Hiện không có lô nào trong ngưỡng cảnh báo.</p>
          )}
          {expiringBatches.length > 0 && (
            <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {expiringBatches.map((batch) => (
                <li key={batch.id} className="rounded-xl border border-amber-200 bg-white p-4">
                  <p className="font-semibold text-slate-900">{batch.product?.ten_san_pham ?? 'Sản phẩm'}</p>
                  <p className="mt-1 text-sm text-slate-700">Lô {batch.ma_lo} · còn {batch.so_luong_ton} {batch.product?.don_vi_tinh}</p>
                  <p className="mt-1 text-sm font-semibold text-amber-900">
                    {batch.daysRemaining === 0 ? 'Hết hạn hôm nay' : `Còn ${batch.daysRemaining} ngày`}
                    {' · '}{batch.ngay_het_han}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {isLoading ? (
        <div className="flex min-h-48 items-center justify-center">
          <LoadingSpinner label="Đang tải đơn hàng" className="text-green-700" />
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl bg-white p-8 text-center text-slate-600 shadow-sm">
          Chưa có đơn hàng nào.
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const action = nextAction(order)
            const awaitingVietQr = hasPendingVietQrPayment(order)
            const hasPendingPayment = (order.payments ?? []).some(
              (payment) => payment.trang_thai === 'cho_xu_ly',
            )
            const canApprove = order.trang_thai === 'cho_duyet' && !hasPendingPayment
            const isUpdating = updatingOrderId === order.id

            return (
              <article
                key={order.id}
                className="dashboard-panel rounded-2xl bg-white p-5 sm:flex sm:items-center sm:justify-between sm:gap-6"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="font-bold text-slate-900">{order.ma_don}</h2>
                    <span className="status-pill rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                      {awaitingVietQr ? 'Chờ thanh toán VietQR' : ORDER_STATUSES[order.trang_thai] ?? order.trang_thai}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">
                    Khách hàng: {order.user?.ho_ten ?? order.ten_nguoi_nhan}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    Tổng tiền: {Number(order.tong_thanh_toan ?? 0).toLocaleString('vi-VN')} đ
                  </p>
                  <button
                    type="button"
                    className="mt-2 min-h-11 rounded-lg px-3 text-sm font-semibold text-green-800 hover:bg-green-50"
                    aria-expanded={expandedOrderId === order.id}
                    onClick={() => setExpandedOrderId((current) =>
                      current === order.id ? null : order.id,
                    )}
                  >
                    {expandedOrderId === order.id ? 'Ẩn chi tiết' : 'Chi tiết sản phẩm & lô'}
                  </button>
                  {expandedOrderId === order.id && (
                    <div className="mt-3 rounded-xl bg-slate-50 p-4">
                      <h3 className="font-semibold text-slate-900">Sản phẩm và lô được phân bổ</h3>
                      <ul className="mt-2 divide-y divide-slate-200">
                        {(order.details ?? []).map((detail) => (
                          <li key={detail.id} className="py-2 text-sm">
                            <p className="font-medium text-slate-800">
                              {detail.product?.ten_san_pham ?? 'Sản phẩm'} × {detail.so_luong}
                            </p>
                            <p className="mt-1 text-slate-600">
                              Lô {detail.batch?.ma_lo ?? 'Chưa phân bổ'}
                              {detail.batch?.ngay_het_han ? ` · Hạn ${detail.batch.ngay_het_han}` : ''}
                            </p>
                          </li>
                        ))}
                      </ul>
                      {(order.payments ?? []).length > 0 && (
                        <div className="mt-3 border-t border-slate-200 pt-3">
                          <h4 className="text-sm font-semibold text-slate-900">Giao dịch</h4>
                          {order.payments.map((payment) => (
                            <p key={payment.id} className="mt-1 text-sm text-slate-700">
                              {payment.phuong_thuc.toUpperCase()} · {payment.trang_thai} · {Number(payment.so_tien).toLocaleString('vi-VN')} đ
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {(action || awaitingVietQr || canApprove) && (
                  <div className="mt-4 flex flex-col gap-2 sm:mt-0">
                    {awaitingVietQr && (
                      <Button
                        className="w-full sm:w-auto"
                        onClick={() => confirmVietQrPayment(order)}
                        disabled={updatingOrderId !== null}
                      >
                        {isUpdating ? (
                          <>
                            <LoadingSpinner label="Đang xác nhận thanh toán" className="mr-2" />
                            Đang xác nhận...
                          </>
                        ) : 'Xác nhận đã nhận tiền (VietQR)'}
                      </Button>
                    )}
                    {canApprove && (
                        <Button
                          className="w-full sm:w-auto"
                          onClick={() => approveOrder(order)}
                          disabled={updatingOrderId !== null}
                        >
                          {isUpdating ? (
                            <><LoadingSpinner label="Đang duyệt đơn" className="mr-2" />Đang duyệt...</>
                          ) : 'Duyệt đơn (phân bổ FEFO)'}
                        </Button>
                      )}
                    {action && (
                  <Button
                    className="w-full sm:w-auto"
                    onClick={() => changeOrderStatus(order, action)}
                    disabled={updatingOrderId !== null}
                  >
                    {isUpdating ? (
                      <>
                        <LoadingSpinner label="Đang cập nhật trạng thái" className="mr-2" />
                        Đang cập nhật...
                      </>
                    ) : action.label}
                  </Button>
                    )}
                  </div>
                )}
                {order.trang_thai === 'cho_duyet'
                  && hasPendingPayment
                  && !awaitingVietQr
                  && (
                    <p className="mt-4 text-sm text-amber-800">
                      Đơn đang chờ xác nhận từ cổng thanh toán.
                    </p>
                  )}
              </article>
            )
          })}
          {hasMore && (
            <div className="text-center">
              <Button
                variant="secondary"
                onClick={() => loadOrders(page + 1, true)}
                disabled={isLoadingMore}
              >
                {isLoadingMore ? (
                  <>
                    <LoadingSpinner label="Đang tải thêm đơn hàng" className="mr-2" />
                    Đang tải...
                  </>
                ) : 'Tải thêm đơn hàng'}
              </Button>
            </div>
          )}
        </div>
      )}
    </section>
  )
}

export default StaffOrdersPage
