import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
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

function StaffOrdersPage() {
  const { user } = useAuth()
  const [orders, setOrders] = useState([])
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
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-green-700">
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
            const isUpdating = updatingOrderId === order.id

            return (
              <article
                key={order.id}
                className="rounded-2xl bg-white p-5 shadow-sm sm:flex sm:items-center sm:justify-between sm:gap-6"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="font-bold text-slate-900">{order.ma_don}</h2>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                      {awaitingVietQr ? 'Chờ thanh toán VietQR' : ORDER_STATUSES[order.trang_thai] ?? order.trang_thai}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">
                    Khách hàng: {order.user?.ho_ten ?? order.ten_nguoi_nhan}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    Tổng tiền: {Number(order.tong_thanh_toan ?? 0).toLocaleString('vi-VN')} đ
                  </p>
                </div>
                {(action || awaitingVietQr) && (
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
