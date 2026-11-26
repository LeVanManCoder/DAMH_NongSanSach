import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import addressApi from '../../api/addressApi.js'
import productApi from '../../api/productApi.js'
import subscriptionApi from '../../api/subscriptionApi.js'
import Button from '../../components/Button.jsx'
import LoadingSpinner from '../../components/LoadingSpinner.jsx'
import ToastNotification from '../../components/ToastNotification.jsx'
import useAuth from '../../contexts/useAuth.js'

const SUBSCRIPTION_STATUSES = {
  cho_thanh_toan: 'Chờ thanh toán',
  dang_hoat_dong: 'Đang hoạt động',
  tam_dung: 'Đã tạm dừng',
  het_han: 'Đã hết hạn',
  da_huy: 'Đã hủy',
}
const WEEKDAYS = [
  [1, 'Thứ Hai'],
  [2, 'Thứ Ba'],
  [3, 'Thứ Tư'],
  [4, 'Thứ Năm'],
  [5, 'Thứ Sáu'],
  [6, 'Thứ Bảy'],
  [7, 'Chủ Nhật'],
]

function todayString() {
  const date = new Date()
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return localDate.toISOString().slice(0, 10)
}

function SubscriptionsPage() {
  const { user } = useAuth()
  const [plans, setPlans] = useState([])
  const [products, setProducts] = useState([])
  const [addresses, setAddresses] = useState([])
  const [subscriptions, setSubscriptions] = useState([])
  const [selectedProducts, setSelectedProducts] = useState({})
  const [planId, setPlanId] = useState('')
  const [addressId, setAddressId] = useState('')
  const [startDate, setStartDate] = useState(todayString)
  const [interval, setInterval] = useState('7')
  const [deliveryDay, setDeliveryDay] = useState('1')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [busySubscriptionId, setBusySubscriptionId] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [toast, setToast] = useState(null)

  const loadSubscriptions = useCallback(async () => {
    const response = await subscriptionApi.getSubscriptions()
    setSubscriptions(response.data.data)
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    async function loadPage() {
      try {
        const [planResponse, productResponse, addressResponse, subscriptionResponse] =
          await Promise.all([
            subscriptionApi.getPlans({ signal: controller.signal }),
            productApi.getProducts(
              { per_page: 100 },
              { signal: controller.signal },
            ),
            addressApi.getAddresses({ signal: controller.signal }),
            subscriptionApi.getSubscriptions(
              { page: 1 },
              { signal: controller.signal },
            ),
          ])
        if (controller.signal.aborted) return

        setPlans(planResponse.data.data)
        setProducts(productResponse.data.data)
        setAddresses(addressResponse.data.data)
        setSubscriptions(subscriptionResponse.data.data)
        if (planResponse.data.data[0]) setPlanId(String(planResponse.data.data[0].id))
        const defaultAddress = addressResponse.data.data.find((item) => item.la_mac_dinh)
        if (defaultAddress) setAddressId(String(defaultAddress.id))
      } catch (error) {
        if (!controller.signal.aborted) {
          setErrorMessage(error.response?.data?.message ?? 'Không tải được dữ liệu gói định kỳ.')
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }
    loadPage()
    return () => controller.abort()
  }, [])

  const chosenItems = useMemo(
    () => Object.entries(selectedProducts)
      .filter(([, value]) => value.selected)
      .map(([productId, value]) => ({
        product_id: Number(productId),
        so_luong_moi_lan: Number(value.quantity),
      })),
    [selectedProducts],
  )

  async function registerSubscription(event) {
    event.preventDefault()
    if (chosenItems.length === 0) {
      setErrorMessage('Chọn ít nhất một sản phẩm cho gói định kỳ.')
      return
    }
    setIsSubmitting(true)
    setErrorMessage('')
    try {
      await subscriptionApi.create({
        plan_id: Number(planId),
        address_id: Number(addressId),
        ngay_bat_dau: startDate,
        chu_ky_giao_ngay: Number(interval),
        thu_trong_tuan: [Number(deliveryDay)],
        items: chosenItems,
      })
      await loadSubscriptions()
      setSelectedProducts({})
      setToast({ message: 'Đăng ký gói định kỳ thành công.', type: 'success' })
    } catch (error) {
      setErrorMessage(
        Object.values(error.response?.data?.errors ?? {}).flat().find(Boolean) ??
          error.response?.data?.message ??
          'Không đăng ký được gói định kỳ.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  async function changeStatus(subscription, status) {
    setBusySubscriptionId(subscription.id)
    try {
      const response = await subscriptionApi.updateStatus(subscription.id, status)
      setSubscriptions((current) =>
        current.map((item) => item.id === subscription.id ? response.data.data : item),
      )
      setToast({
        message: status === 'da_huy'
          ? 'Đã hủy gói định kỳ.'
          : status === 'tam_dung'
            ? 'Đã tạm dừng gói định kỳ.'
            : 'Đã tiếp tục gói định kỳ.',
        type: 'success',
      })
    } catch (error) {
      setToast({
        message: error.response?.data?.message ?? 'Không cập nhật được trạng thái gói.',
        type: 'error',
      })
    } finally {
      setBusySubscriptionId(null)
    }
  }

  if (user?.role !== 'customer') {
    return (
      <section className="rounded-2xl bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Gói định kỳ của tôi</h1>
        <p className="mt-3 text-slate-600">Đăng nhập bằng tài khoản khách hàng để quản lý gói.</p>
        <Link className="mt-5 inline-flex font-semibold text-green-800 hover:underline" to="/login">Đăng nhập</Link>
      </section>
    )
  }

  if (isLoading) {
    return <div className="flex min-h-64 items-center justify-center"><LoadingSpinner label="Đang tải gói định kỳ" className="text-green-700" /></div>
  }

  return (
    <section className="mx-auto max-w-5xl space-y-8">
      {toast && (
        <ToastNotification message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-green-700">Giao hàng theo lịch</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">Gói định kỳ của tôi</h1>
        <p className="mt-2 text-slate-600">Chọn sản phẩm và nhận nông sản mỗi tuần hoặc hai tuần một lần.</p>
      </header>

      {errorMessage && <p className="rounded-xl bg-red-50 p-4 text-sm text-red-800" role="alert">{errorMessage}</p>}

      <form onSubmit={registerSubscription} className="space-y-5 rounded-2xl bg-white p-5 shadow-sm sm:p-7">
        <h2 className="text-xl font-bold text-slate-900">Đăng ký gói mới</h2>
        {addresses.length === 0 ? (
          <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
            Hãy thêm địa chỉ giao hàng trước khi đăng ký. <Link className="font-semibold underline" to="/profile">Mở sổ địa chỉ</Link>
          </p>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">
                Gói đăng ký
                <select required value={planId} onChange={(event) => setPlanId(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3">
                  {plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.ten_goi} · kỳ hạn {plan.chu_ky_ngay} ngày</option>)}
                </select>
              </label>
              <label className="text-sm font-medium text-slate-700">
                Địa chỉ giao hàng
                <select required value={addressId} onChange={(event) => setAddressId(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3">
                  {addresses.map((address) => <option key={address.id} value={address.id}>{address.ten_nguoi_nhan} · {address.dia_chi}</option>)}
                </select>
              </label>
              <label className="text-sm font-medium text-slate-700">
                Chu kỳ nhận hàng
                <select value={interval} onChange={(event) => setInterval(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3">
                  <option value="7">Hàng tuần</option>
                  <option value="14">Hai tuần một lần</option>
                </select>
              </label>
              <label className="text-sm font-medium text-slate-700">
                Ngày giao trong tuần
                <select value={deliveryDay} onChange={(event) => setDeliveryDay(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3">
                  {WEEKDAYS.map(([day, label]) => <option key={day} value={day}>{label}</option>)}
                </select>
              </label>
              <label className="text-sm font-medium text-slate-700 sm:col-span-2">
                Ngày bắt đầu
                <input required type="date" min={todayString()} value={startDate} onChange={(event) => setStartDate(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3" />
              </label>
            </div>

            <fieldset>
              <legend className="font-semibold text-slate-900">Sản phẩm và số lượng mỗi lần giao</legend>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {products.map((product) => {
                  const selection = selectedProducts[product.id] ?? { selected: false, quantity: '1' }
                  return (
                    <div key={product.id} className="rounded-xl border border-slate-200 p-4">
                      <label className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={selection.selected}
                          onChange={(event) => setSelectedProducts((current) => ({
                            ...current,
                            [product.id]: { ...selection, selected: event.target.checked },
                          }))}
                          className="mt-1 h-4 w-4 accent-green-700"
                        />
                        <span className="font-medium text-slate-800">{product.ten_san_pham}</span>
                      </label>
                      {selection.selected && (
                        <label className="mt-3 block text-sm text-slate-600">
                          Số lượng ({product.don_vi_tinh})
                          <input
                            type="number"
                            min="0.01"
                            max="1000"
                            step="0.01"
                            value={selection.quantity}
                            onChange={(event) => setSelectedProducts((current) => ({
                              ...current,
                              [product.id]: { ...selection, quantity: event.target.value },
                            }))}
                            className="mt-1 min-h-10 w-full rounded-lg border border-slate-300 px-3"
                          />
                        </label>
                      )}
                    </div>
                  )
                })}
              </div>
            </fieldset>

            <Button type="submit" disabled={isSubmitting || !planId || !addressId}>
              {isSubmitting ? <><LoadingSpinner label="Đang đăng ký gói" className="mr-2" />Đang đăng ký...</> : 'Đăng ký gói định kỳ'}
            </Button>
          </>
        )}
      </form>

      <section>
        <h2 className="mb-4 text-xl font-bold text-slate-900">Các gói đã đăng ký</h2>
        {subscriptions.length === 0 ? (
          <p className="rounded-xl bg-white p-5 text-sm text-slate-600">Bạn chưa đăng ký gói định kỳ nào.</p>
        ) : (
          <div className="space-y-4">
            {subscriptions.map((subscription) => (
              <article key={subscription.id} className="rounded-2xl bg-white p-5 shadow-sm">
                <header className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-slate-900">{subscription.plan?.ten_goi}</h3>
                    <p className="mt-1 text-sm text-slate-600">
                      {subscription.chu_ky_giao_ngay === 14 ? 'Hai tuần một lần' : 'Hàng tuần'} · bắt đầu {subscription.ngay_bat_dau}
                    </p>
                  </div>
                  <span className="rounded-full bg-green-50 px-3 py-1 text-sm font-semibold text-green-800">
                    {SUBSCRIPTION_STATUSES[subscription.trang_thai] ?? subscription.trang_thai}
                  </span>
                </header>
                <p className="mt-3 text-sm text-slate-600">
                  Giao đến: {subscription.address?.ten_nguoi_nhan} · {subscription.address?.dia_chi}
                </p>
                <ul className="mt-3 space-y-1 text-sm text-slate-700">
                  {(subscription.items ?? []).map((item) => (
                    <li key={item.id}>
                      {item.product?.ten_san_pham} × {item.so_luong_moi_lan}
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-sm font-semibold text-slate-900">
                  Giá trị mỗi lần giao: {Number(subscription.tong_tien).toLocaleString('vi-VN')} đ
                </p>
                {['dang_hoat_dong', 'tam_dung'].includes(subscription.trang_thai) && (
                  <div className="mt-4 flex flex-wrap gap-3">
                    {subscription.trang_thai === 'dang_hoat_dong' ? (
                      <Button variant="secondary" disabled={busySubscriptionId !== null} onClick={() => changeStatus(subscription, 'tam_dung')}>Tạm dừng</Button>
                    ) : (
                      <Button variant="secondary" disabled={busySubscriptionId !== null} onClick={() => changeStatus(subscription, 'dang_hoat_dong')}>Tiếp tục</Button>
                    )}
                    <button
                      type="button"
                      disabled={busySubscriptionId !== null}
                      onClick={() => changeStatus(subscription, 'da_huy')}
                      className="rounded-lg px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                    >
                      {busySubscriptionId === subscription.id ? 'Đang cập nhật...' : 'Hủy gói'}
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  )
}

export default SubscriptionsPage
