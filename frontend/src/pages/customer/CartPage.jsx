import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import cartApi from '../../api/cartApi.js'
import Button from '../../components/Button.jsx'
import LoadingSpinner from '../../components/LoadingSpinner.jsx'
import ToastNotification from '../../components/ToastNotification.jsx'
import useAuth from '../../contexts/useAuth.js'

const currencyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
})

function CartPage() {
  const [items, setItems] = useState([])
  const [quantities, setQuantities] = useState({})
  const [isLoading, setIsLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [toast, setToast] = useState(null)
  const navigate = useNavigate()
  const { user } = useAuth()
  const dismissToast = useCallback(() => setToast(null), [])

  useEffect(() => {
    const controller = new AbortController()

    async function loadCart() {
      try {
        const response = await cartApi.getCart({ signal: controller.signal })
        const cartItems = response.data.data
        setItems(cartItems)
        setQuantities(
          Object.fromEntries(cartItems.map((item) => [item.id, item.so_luong])),
        )
      } catch (error) {
        if (controller.signal.aborted) {
          return
        }

        if (error.response?.status === 401) {
          navigate('/login', { replace: true, state: { from: { pathname: '/cart' } } })
          return
        }

        setErrorMessage(
          error.response?.data?.message ?? 'Không tải được giỏ hàng. Vui lòng thử lại.',
        )
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    loadCart()

    return () => controller.abort()
  }, [navigate])

  const subtotal = useMemo(
    () =>
      items.reduce(
        (total, item) =>
          total + Number(item.so_luong) * Number(item.product?.gia_ban_co_ban ?? 0),
        0,
      ),
    [items],
  )

  async function saveQuantity(item) {
    const quantity = Number(quantities[item.id])
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setToast({ message: 'Số lượng phải lớn hơn 0.', type: 'error' })
      return
    }

    setUpdatingId(item.id)
    try {
      const response = await cartApi.updateItem(item.id, {
        so_luong: quantity,
      })
      setItems((current) =>
        current.map((cartItem) =>
          cartItem.id === item.id ? response.data.data : cartItem,
        ),
      )
      setToast({ message: 'Đã cập nhật số lượng trong giỏ hàng.', type: 'success' })
    } catch (error) {
      const validationMessage = Object.values(error.response?.data?.errors ?? {})
        .flat()
        .find(Boolean)
      setToast({
        message:
          validationMessage ??
          error.response?.data?.message ??
          'Không thể cập nhật giỏ hàng. Vui lòng thử lại.',
        type: 'error',
      })
    } finally {
      setUpdatingId(null)
    }
  }

  async function removeItem(itemId) {
    setUpdatingId(itemId)
    try {
      await cartApi.removeItem(itemId)
      setItems((current) => current.filter((item) => item.id !== itemId))
      setToast({ message: 'Đã xóa sản phẩm khỏi giỏ hàng.', type: 'success' })
    } catch (error) {
      setToast({
        message:
          error.response?.data?.message ??
          'Không thể xóa sản phẩm khỏi giỏ hàng. Vui lòng thử lại.',
        type: 'error',
      })
    } finally {
      setUpdatingId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <LoadingSpinner label="Đang tải giỏ hàng" className="text-green-700" />
      </div>
    )
  }

  if (user?.role !== 'customer') {
    return (
      <section className="rounded-2xl bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Giỏ hàng của bạn</h1>
        <p className="mt-3 text-slate-600">
          {errorMessage || 'Vui lòng đăng nhập bằng tài khoản khách hàng để xem giỏ hàng.'}
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
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-green-700">
          Mua sắm
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">Giỏ hàng của bạn</h1>
      </div>

      {errorMessage ? (
        <p className="rounded-xl bg-red-50 p-4 text-red-800" role="alert">
          {errorMessage}
        </p>
      ) : items.length === 0 ? (
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
          <p className="text-slate-600">Giỏ hàng đang trống.</p>
          <Link
            to="/products"
            className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800"
          >
            Khám phá sản phẩm
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="space-y-4">
            {items.map((item) => (
              <article
                key={item.id}
                className="flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-sm sm:flex-row sm:items-center"
              >
                {item.product?.hinh_anh_dai_dien ? (
                  <img
                    src={item.product.hinh_anh_dai_dien}
                    alt={item.product.ten_san_pham}
                    className="h-24 w-full rounded-xl object-cover sm:w-28"
                  />
                ) : (
                  <div
                    aria-hidden="true"
                    className="flex h-24 w-full items-center justify-center rounded-xl bg-green-50 text-3xl sm:w-28"
                  >
                    🌱
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <Link
                    to={`/products/${item.product?.slug}`}
                    className="font-bold text-slate-900 hover:text-green-800"
                  >
                    {item.product?.ten_san_pham ?? 'Sản phẩm'}
                  </Link>
                  <p className="mt-1 text-sm text-slate-600">
                    {currencyFormatter.format(Number(item.product?.gia_ban_co_ban ?? 0))}
                    {' / '}
                    {item.product?.don_vi_tinh}
                  </p>
                  <p className="mt-2 font-semibold text-green-800">
                    Tạm tính:{' '}
                    {currencyFormatter.format(
                      Number(item.so_luong) * Number(item.product?.gia_ban_co_ban ?? 0),
                    )}
                  </p>
                </div>
                <div className="flex items-end gap-2 sm:flex-col sm:items-stretch">
                  <label htmlFor={`quantity-${item.id}`} className="sr-only">
                    Số lượng
                  </label>
                  <input
                    id={`quantity-${item.id}`}
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={quantities[item.id] ?? item.so_luong}
                    onChange={(event) =>
                      setQuantities((current) => ({
                        ...current,
                        [item.id]: event.target.value,
                      }))
                    }
                    className="min-h-11 w-28 rounded-lg border border-slate-300 px-3"
                  />
                  <Button
                    variant="secondary"
                    className="min-h-10"
                    disabled={updatingId === item.id}
                    onClick={() => saveQuantity(item)}
                  >
                    Cập nhật
                  </Button>
                  <button
                    type="button"
                    disabled={updatingId === item.id}
                    onClick={() => removeItem(item.id)}
                    className="min-h-10 text-sm font-semibold text-red-700 hover:underline disabled:opacity-50"
                  >
                    Xóa
                  </button>
                </div>
              </article>
            ))}
          </div>

          <aside className="h-fit rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Tóm tắt đơn hàng</h2>
            <div className="mt-4 flex justify-between text-sm text-slate-600">
              <span>Tạm tính</span>
              <span>{currencyFormatter.format(subtotal)}</span>
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              Phí giao hàng sẽ được tính tại bước thanh toán theo địa chỉ nhận hàng.
            </p>
            <div className="mt-4 border-t border-slate-100 pt-4">
              <Link
                to="/checkout"
                className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800"
              >
                Tiến hành thanh toán
              </Link>
            </div>
          </aside>
        </div>
      )}
    </section>
  )
}

export default CartPage
