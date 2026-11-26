import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import cartApi from '../../api/cartApi.js'
import addressApi from '../../api/addressApi.js'
import orderApi from '../../api/orderApi.js'
import paymentApi from '../../api/paymentApi.js'
import shippingApi from '../../api/shippingApi.js'
import Button from '../../components/Button.jsx'
import LoadingSpinner from '../../components/LoadingSpinner.jsx'
import ToastNotification from '../../components/ToastNotification.jsx'
import useAuth from '../../contexts/useAuth.js'

const currencyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
})

function CheckoutPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [addresses, setAddresses] = useState([])
  const [savedAddressId, setSavedAddressId] = useState('')
  const addressEdited = useRef(false)
  const [recipientName, setRecipientName] = useState(user?.ho_ten ?? '')
  const [phone, setPhone] = useState(user?.so_dien_thoai ?? '')
  const [address, setAddress] = useState('')
  const [note, setNote] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('momo')
  const [shippingQuote, setShippingQuote] = useState(null)
  const [isLoadingCart, setIsLoadingCart] = useState(true)
  const [isQuoteLoading, setIsQuoteLoading] = useState(false)
  const [isPlacingOrder, setIsPlacingOrder] = useState(false)
  const [isCreatingPayment, setIsCreatingPayment] = useState(false)
  const [isConfirmingPayment, setIsConfirmingPayment] = useState(false)
  const [order, setOrder] = useState(null)
  const [payment, setPayment] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [toast, setToast] = useState(null)
  const dismissToast = useCallback(() => setToast(null), [])

  useEffect(() => {
    const controller = new AbortController()

    async function loadCart() {
      try {
        const response = await cartApi.getCart({ signal: controller.signal })
        setItems(response.data.data)
      } catch (error) {
        if (controller.signal.aborted) {
          return
        }

        if (error.response?.status === 401) {
          navigate('/login', {
            replace: true,
            state: { from: { pathname: '/checkout' } },
          })
          return
        }

        setErrorMessage(
          error.response?.data?.message ?? 'Không tải được giỏ hàng. Vui lòng thử lại.',
        )
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingCart(false)
        }
      }
    }

    loadCart()

    return () => controller.abort()
  }, [navigate])

  useEffect(() => {
    const controller = new AbortController()
    async function loadAddresses() {
      try {
        const response = await addressApi.getAddresses({ signal: controller.signal })
        if (controller.signal.aborted) return
        const savedAddresses = response.data.data
        setAddresses(savedAddresses)
        const defaultAddress = savedAddresses.find((savedAddress) => savedAddress.la_mac_dinh)
        if (defaultAddress && !addressEdited.current) {
          setSavedAddressId(String(defaultAddress.id))
          setRecipientName(defaultAddress.ten_nguoi_nhan)
          setPhone(defaultAddress.so_dien_thoai)
          setAddress(defaultAddress.dia_chi)
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setErrorMessage(
            error.response?.data?.message ?? 'Không tải được sổ địa chỉ đã lưu.',
          )
        }
      }
    }

    loadAddresses()
    return () => controller.abort()
  }, [])

  const selectedAddress = useMemo(
    () => addresses.find((savedAddress) => String(savedAddress.id) === savedAddressId),
    [addresses, savedAddressId],
  )

  useEffect(() => {
    const normalizedAddress = address.trim()
    if (normalizedAddress.length < 5 || order) {
      return undefined
    }

    const controller = new AbortController()
    const timeoutId = window.setTimeout(async () => {
      setIsQuoteLoading(true)
      setErrorMessage('')

      try {
        const response = await shippingApi.calculate(
          {
            dia_chi_giao: normalizedAddress,
            ...(selectedAddress?.vi_do != null && selectedAddress?.kinh_do != null
              ? {
                  vi_do: Number(selectedAddress.vi_do),
                  kinh_do: Number(selectedAddress.kinh_do),
                }
              : {}),
          },
          { signal: controller.signal },
        )
        setShippingQuote(response.data.data)
      } catch (error) {
        if (!controller.signal.aborted) {
          setShippingQuote(null)
          setErrorMessage(
            error.response?.data?.message ??
              'Không tính được phí giao hàng. Vui lòng kiểm tra địa chỉ.',
          )
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsQuoteLoading(false)
        }
      }
    }, 450)

    return () => {
      window.clearTimeout(timeoutId)
      controller.abort()
    }
  }, [address, order, selectedAddress?.vi_do, selectedAddress?.kinh_do])

  const subtotal = useMemo(
    () =>
      items.reduce(
        (total, item) =>
          total + Number(item.so_luong) * Number(item.product?.gia_ban_co_ban ?? 0),
        0,
      ),
    [items],
  )
  const shippingFee = Number(shippingQuote?.phi_van_chuyen ?? 0)
  const total = subtotal + shippingFee

  function updateAddress(value) {
    addressEdited.current = true
    setSavedAddressId('')
    setAddress(value)
    setShippingQuote(null)
    setIsQuoteLoading(false)
    setErrorMessage('')
  }

  async function createPayment(orderId) {
    setIsCreatingPayment(true)
    setErrorMessage('')

    try {
      const response = await paymentApi.create({
        order_id: orderId,
        phuong_thuc: paymentMethod,
      })
      setPayment(response.data.data)
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message ??
          'Đơn hàng đã được tạo nhưng chưa tạo được mã thanh toán. Vui lòng thử lại.',
      )
    } finally {
      setIsCreatingPayment(false)
    }
  }

  async function placeOrder(event) {
    event.preventDefault()
    if (!shippingQuote || items.length === 0) {
      return
    }

    setIsPlacingOrder(true)
    setErrorMessage('')

    try {
      const response = await orderApi.create({
        ten_nguoi_nhan: recipientName,
        sdt_nguoi_nhan: phone,
        dia_chi_giao: address.trim(),
        ...(selectedAddress?.vi_do != null && selectedAddress?.kinh_do != null
          ? {
              vi_do: Number(selectedAddress.vi_do),
              kinh_do: Number(selectedAddress.kinh_do),
            }
          : {}),
        ghi_chu: note || null,
      })
      const createdOrder = response.data.data
      setOrder(createdOrder)
      setItems([])
      await createPayment(createdOrder.id)
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message ??
          'Không thể tạo đơn hàng. Vui lòng kiểm tra giỏ hàng và thử lại.',
      )
    } finally {
      setIsPlacingOrder(false)
    }
  }

  async function confirmPayment() {
    if (!payment?.payment) {
      return
    }

    setIsConfirmingPayment(true)
    setErrorMessage('')

    try {
      const response = await paymentApi.sendIpn({
        ma_giao_dich: payment.payment.ma_giao_dich,
        so_tien: Number(payment.payment.so_tien),
        trang_thai: 'thanh_cong',
      })
      setPayment((current) => ({
        ...current,
        payment: response.data.data.payment,
      }))
      setOrder(response.data.data.order)
      setToast({
        message: 'Đặt hàng và thanh toán thành công. Kho đã được cập nhật theo FEFO.',
        type: 'success',
      })
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message ??
          'Chưa thể xác nhận thanh toán. Vui lòng thử lại.',
      )
    } finally {
      setIsConfirmingPayment(false)
    }
  }

  if (isLoadingCart) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <LoadingSpinner label="Đang tải thông tin thanh toán" className="text-green-700" />
      </div>
    )
  }

  if (user?.role !== 'customer') {
    return (
      <section className="rounded-2xl bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Thanh toán</h1>
        <p className="mt-3 text-slate-600">
          Vui lòng đăng nhập bằng tài khoản khách hàng để tiếp tục.
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
    <section className="mx-auto max-w-5xl">
      {toast && (
        <ToastNotification
          message={toast.message}
          type={toast.type}
          onClose={dismissToast}
        />
      )}
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-green-700">
          Hoàn tất đơn hàng
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">Thanh toán</h1>
      </div>

      {errorMessage && (
        <p className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-800" role="alert">
          {errorMessage}
        </p>
      )}

      {order ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-wide text-green-700">
              Đơn hàng {order.ma_don}
            </p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900">
              {order.trang_thai === 'da_thanh_toan'
                ? 'Thanh toán thành công'
                : 'Hoàn tất thanh toán'}
            </h2>
            <p className="mt-2 text-slate-600">
              Tổng thanh toán: {currencyFormatter.format(Number(order.tong_thanh_toan))}
            </p>

            {payment?.payment?.trang_thai === 'thanh_cong' ? (
              <div className="mt-6 rounded-xl bg-green-50 p-4 text-green-900">
                Đã nhận xác nhận thanh toán. Tồn kho được trừ theo lô FEFO.
              </div>
            ) : payment ? (
              <div className="mt-6 flex flex-col items-center rounded-2xl border border-slate-100 p-5">
                <p className="font-semibold text-slate-900">
                  {payment.qr_image_url || payment.qr_payload
                    ? `Quét QR thanh toán ${payment.payment.phuong_thuc.toUpperCase()}`
                    : `Thanh toán qua ${payment.payment.phuong_thuc.toUpperCase()}`}
                </p>
                {payment.qr_image_url ? (
                  <img
                    src={payment.qr_image_url}
                    alt="Mã QR chuyển khoản VietQR"
                    className="mt-4 h-56 w-56 rounded-xl border border-slate-100 object-contain p-2"
                  />
                ) : payment.qr_payload ? (
                  <div className="mt-4 rounded-xl bg-white p-3">
                  <QRCodeSVG
                    value={payment.qr_payload}
                    size={220}
                    level="H"
                    includeMargin
                    title="Mã QR thanh toán"
                  />
                  </div>
                ) : null}
                {payment.transfer && (
                  <dl className="mt-4 grid w-full gap-2 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-2">
                    <div><dt className="text-slate-500">Ngân hàng</dt><dd className="font-semibold">{payment.transfer.bank_id}</dd></div>
                    <div><dt className="text-slate-500">Số tài khoản</dt><dd className="font-semibold">{payment.transfer.account_no}</dd></div>
                    {payment.transfer.account_name && <div><dt className="text-slate-500">Chủ tài khoản</dt><dd className="font-semibold">{payment.transfer.account_name}</dd></div>}
                    <div><dt className="text-slate-500">Số tiền</dt><dd className="font-semibold">{currencyFormatter.format(Number(payment.transfer.amount))}</dd></div>
                    <div className="sm:col-span-2"><dt className="text-slate-500">Nội dung chuyển khoản</dt><dd className="break-all font-semibold">{payment.transfer.transfer_content}</dd></div>
                  </dl>
                )}
                <p className="mt-3 break-all text-center text-xs text-slate-500">
                  Mã giao dịch: {payment.payment.ma_giao_dich}
                </p>
                {payment.payment_url && payment.payment.phuong_thuc !== 'vietqr' && (
                  <a
                    href={payment.payment_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex min-h-11 items-center rounded-lg border border-green-700 px-4 py-2 text-sm font-semibold text-green-800 hover:bg-green-50"
                  >
                    Mở trang thanh toán
                  </a>
                )}
                {payment.can_simulate ? (
                  <Button
                    className="mt-5 w-full sm:w-auto"
                    onClick={confirmPayment}
                    disabled={isConfirmingPayment}
                  >
                    {isConfirmingPayment ? (
                      <>
                        <LoadingSpinner label="Đang xác nhận" className="mr-2" />
                        Đang xác nhận...
                      </>
                    ) : (
                      'Xác nhận đã thanh toán (Mô phỏng IPN)'
                    )}
                  </Button>
                ) : (
                  <p className="mt-4 text-center text-xs text-slate-500">
                    Đơn hàng chỉ được xác nhận sau khi cổng thanh toán gửi callback hợp lệ.
                  </p>
                )}
              </div>
            ) : (
              <Button
                className="mt-6"
                onClick={() => createPayment(order.id)}
                disabled={isCreatingPayment}
              >
                {isCreatingPayment ? 'Đang tạo mã...' : 'Tạo mã thanh toán'}
              </Button>
            )}
          </section>

          <aside className="h-fit rounded-2xl bg-white p-5 shadow-sm">
            <h3 className="font-bold text-slate-900">Thông tin giao hàng</h3>
            <p className="mt-3 text-sm text-slate-700">{order.ten_nguoi_nhan}</p>
            <p className="mt-1 text-sm text-slate-600">{order.sdt_nguoi_nhan}</p>
            <p className="mt-1 text-sm text-slate-600">{order.dia_chi_giao}</p>
            <Link
              to="/products"
              className="mt-5 inline-flex text-sm font-semibold text-green-800 hover:underline"
            >
              Tiếp tục mua sắm
            </Link>
          </aside>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
          <p className="text-slate-600">Giỏ hàng đang trống.</p>
          <Link
            to="/cart"
            className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800"
          >
            Quay lại giỏ hàng
          </Link>
        </div>
      ) : (
        <form onSubmit={placeOrder} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="space-y-6">
            <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-7">
              <h2 className="text-lg font-bold text-slate-900">Địa chỉ nhận hàng</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium text-slate-700 sm:col-span-2">
                  Chọn từ sổ địa chỉ
                  <select
                    value={savedAddressId}
                    disabled={Boolean(order) || addresses.length === 0}
                    onChange={(event) => {
                      const nextId = event.target.value
                      const savedAddress = addresses.find(
                        (candidate) => String(candidate.id) === nextId,
                      )
                      setSavedAddressId(nextId)
                      addressEdited.current = false
                      if (savedAddress) {
                        setRecipientName(savedAddress.ten_nguoi_nhan)
                        setPhone(savedAddress.so_dien_thoai)
                        setAddress(savedAddress.dia_chi)
                        setShippingQuote(null)
                      } else {
                        setAddress('')
                        setShippingQuote(null)
                      }
                    }}
                    className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3"
                  >
                    <option value="">Nhập địa chỉ mới</option>
                    {addresses.map((savedAddress) => (
                      <option key={savedAddress.id} value={savedAddress.id}>
                        {savedAddress.ten_nguoi_nhan} · {savedAddress.dia_chi}
                        {savedAddress.la_mac_dinh ? ' (mặc định)' : ''}
                      </option>
                    ))}
                  </select>
                  {addresses.length === 0 && (
                    <Link to="/profile" className="mt-1 inline-block text-xs font-semibold text-green-800 hover:underline">
                      Thêm địa chỉ vào sổ địa chỉ
                    </Link>
                  )}
                </label>
                <label className="text-sm font-medium text-slate-700">
                  Người nhận
                  <input
                    required
                    maxLength={100}
                    value={recipientName}
                    disabled={Boolean(order)}
                    onChange={(event) => setRecipientName(event.target.value)}
                    className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 px-3"
                  />
                </label>
                <label className="text-sm font-medium text-slate-700">
                  Số điện thoại
                  <input
                    required
                    maxLength={15}
                    value={phone}
                    disabled={Boolean(order)}
                    onChange={(event) => setPhone(event.target.value)}
                    className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 px-3"
                  />
                </label>
                <label className="text-sm font-medium text-slate-700 sm:col-span-2">
                  Địa chỉ giao hàng
                  <input
                    required
                    maxLength={255}
                    value={address}
                    disabled={Boolean(order)}
                    onChange={(event) => updateAddress(event.target.value)}
                    placeholder="Nhập số nhà, đường, phường/xã, tỉnh/thành"
                    className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 px-3"
                  />
                </label>
                <label className="text-sm font-medium text-slate-700 sm:col-span-2">
                  Ghi chú (không bắt buộc)
                  <textarea
                    maxLength={255}
                    value={note}
                    disabled={Boolean(order)}
                    onChange={(event) => setNote(event.target.value)}
                    rows={3}
                    className="mt-2 w-full rounded-lg border border-slate-300 p-3"
                  />
                </label>
              </div>
              <div className="mt-4 rounded-xl bg-green-50 p-4">
                <p className="font-semibold text-green-900">Phí giao hàng</p>
                {isQuoteLoading ? (
                  <LoadingSpinner label="Đang tính phí giao hàng" className="mt-2 text-green-700" />
                ) : shippingQuote ? (
                  <>
                    <p className="mt-1 text-sm text-green-900">
                      Ước tính {shippingQuote.khoang_cach_km} km ·{' '}
                      {currencyFormatter.format(Number(shippingQuote.phi_van_chuyen))}
                    </p>
                    {shippingQuote.ghi_chu && (
                      <p className="mt-1 text-xs text-green-800">{shippingQuote.ghi_chu}</p>
                    )}
                  </>
                ) : (
                  <p className="mt-1 text-sm text-slate-600">
                    Nhập địa chỉ để tự động tính phí giao hàng.
                  </p>
                )}
              </div>
            </section>

            <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-7">
              <h2 className="text-lg font-bold text-slate-900">Phương thức thanh toán</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {[
                  ['vietqr', 'Chuyển khoản VietQR (QR ngân hàng)'],
                  ['payos', 'PayOS'],
                  ['vnpay', 'VNPay Sandbox'],
                  ['momo', 'MoMo (mô phỏng)'],
                ].map(([value, label]) => (
                  <label
                    key={value}
                    className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border p-4 ${
                      paymentMethod === value
                        ? 'border-green-700 bg-green-50'
                        : 'border-slate-200'
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment_method"
                      value={value}
                      checked={paymentMethod === value}
                      onChange={() => setPaymentMethod(value)}
                    />
                    <span className="text-sm font-semibold text-slate-800">{label}</span>
                  </label>
                ))}
              </div>
            </section>
          </div>

          <aside className="h-fit rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Tóm tắt đơn hàng</h2>
            <ul className="mt-4 space-y-3">
              {items.map((item) => (
                <li key={item.id} className="flex justify-between gap-3 text-sm">
                  <span className="text-slate-600">
                    {item.product?.ten_san_pham} × {item.so_luong}
                  </span>
                  <span className="shrink-0 font-medium text-slate-800">
                    {currencyFormatter.format(
                      Number(item.so_luong) * Number(item.product?.gia_ban_co_ban ?? 0),
                    )}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-sm">
              <p className="flex justify-between text-slate-600">
                <span>Tiền hàng</span>
                <span>{currencyFormatter.format(subtotal)}</span>
              </p>
              <p className="flex justify-between text-slate-600">
                <span>Phí giao hàng</span>
                <span>{currencyFormatter.format(shippingFee)}</span>
              </p>
              <p className="flex justify-between pt-2 text-base font-bold text-slate-900">
                <span>Tổng cộng</span>
                <span>{currencyFormatter.format(total)}</span>
              </p>
            </div>
            <Button
              type="submit"
              className="mt-5 w-full"
              disabled={!shippingQuote || isQuoteLoading || isPlacingOrder}
            >
              {isPlacingOrder ? (
                <>
                  <LoadingSpinner label="Đang tạo đơn hàng" className="mr-2" />
                  Đang tạo đơn...
                </>
              ) : (
                'Đặt hàng và tạo mã thanh toán'
              )}
            </Button>
          </aside>
        </form>
      )}
    </section>
  )
}

export default CheckoutPage
