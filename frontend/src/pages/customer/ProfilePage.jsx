import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import addressApi from '../../api/addressApi.js'
import Button from '../../components/Button.jsx'
import EmptyState from '../../components/EmptyState.jsx'
import LoadingSpinner from '../../components/LoadingSpinner.jsx'
import SkeletonBlock from '../../components/Skeletons.jsx'
import ToastNotification from '../../components/ToastNotification.jsx'
import useConfirm from '../../components/useConfirm.js'
import useAuth from '../../contexts/useAuth.js'

const INITIAL_FORM = {
  ten_nguoi_nhan: '',
  so_dien_thoai: '',
  dia_chi: '',
  vi_do: '',
  kinh_do: '',
  la_mac_dinh: false,
}

function ProfilePage() {
  const { user } = useAuth()
  const confirm = useConfirm()
  const [addresses, setAddresses] = useState([])
  const [form, setForm] = useState(INITIAL_FORM)
  const [editingAddressId, setEditingAddressId] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [busyAddressId, setBusyAddressId] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [toast, setToast] = useState(null)

  useEffect(() => {
    const controller = new AbortController()
    async function initialLoad() {
      try {
        const response = await addressApi.getAddresses({ signal: controller.signal })
        if (!controller.signal.aborted) setAddresses(response.data.data)
      } catch (error) {
        if (!controller.signal.aborted) {
          setErrorMessage(error.response?.data?.message ?? 'Không tải được sổ địa chỉ.')
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }

    initialLoad()
    return () => controller.abort()
  }, [])

  function updateField(event) {
    const { name, value, checked, type } = event.target
    setForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }))
  }

  function resetAddressForm() {
    setEditingAddressId(null)
    setForm({ ...INITIAL_FORM })
  }

  function editAddress(address) {
    setEditingAddressId(address.id)
    setForm({
      ten_nguoi_nhan: address.ten_nguoi_nhan,
      so_dien_thoai: address.so_dien_thoai,
      dia_chi: address.dia_chi,
      vi_do: address.vi_do ?? '',
      kinh_do: address.kinh_do ?? '',
      la_mac_dinh: Boolean(address.la_mac_dinh),
    })
    setErrorMessage('')
  }

  async function submitAddress(event) {
    event.preventDefault()
    setIsSaving(true)
    setErrorMessage('')
    try {
      const payload = {
        ...form,
        vi_do: form.vi_do === '' ? null : Number(form.vi_do),
        kinh_do: form.kinh_do === '' ? null : Number(form.kinh_do),
      }
      if (editingAddressId) {
        const updatePayload = { ...payload }
        delete updatePayload.la_mac_dinh
        const response = await addressApi.update(editingAddressId, updatePayload)
        setAddresses((current) => current.map((item) =>
          item.id === editingAddressId ? response.data.data : item,
        ))
        setToast({ message: 'Đã cập nhật địa chỉ giao hàng.', type: 'success' })
      } else {
        const response = await addressApi.create(payload)
        setAddresses((current) => [
          ...current.map((item) =>
            response.data.data.la_mac_dinh ? { ...item, la_mac_dinh: false } : item,
          ),
          response.data.data,
        ])
        setToast({ message: 'Đã lưu địa chỉ giao hàng.', type: 'success' })
      }
      resetAddressForm()
    } catch (error) {
      setErrorMessage(
        Object.values(error.response?.data?.errors ?? {}).flat().find(Boolean) ??
          error.response?.data?.message ??
          'Không lưu được địa chỉ.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  async function setDefault(addressId) {
    setBusyAddressId(addressId)
    try {
      const response = await addressApi.setDefault(addressId)
      setAddresses((current) =>
        current.map((item) => ({
          ...item,
          la_mac_dinh: item.id === response.data.data.id,
        })),
      )
      setToast({ message: 'Đã cập nhật địa chỉ mặc định.', type: 'success' })
    } catch (error) {
      setToast({
        message: error.response?.data?.message ?? 'Không cập nhật được địa chỉ mặc định.',
        type: 'error',
      })
    } finally {
      setBusyAddressId(null)
    }
  }

  async function deleteAddress(addressId) {
    const confirmed = await confirm({
      title: 'Xóa địa chỉ giao hàng?',
      description: 'Địa chỉ đã xóa sẽ không còn dùng để điền nhanh khi thanh toán.',
      confirmLabel: 'Xóa địa chỉ',
    })
    if (!confirmed) return
    setBusyAddressId(addressId)
    try {
      await addressApi.remove(addressId)
      const response = await addressApi.getAddresses()
      setAddresses(response.data.data)
      setToast({ message: 'Đã xóa địa chỉ giao hàng.', type: 'success' })
    } catch (error) {
      setToast({
        message: error.response?.data?.message ?? 'Không xóa được địa chỉ.',
        type: 'error',
      })
    } finally {
      setBusyAddressId(null)
    }
  }

  if (user?.role !== 'customer') {
    return (
      <section className="rounded-2xl bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Tài khoản & địa chỉ</h1>
        <p className="mt-3 text-slate-600">Đăng nhập bằng tài khoản khách hàng để quản lý địa chỉ.</p>
        <Link className="mt-5 inline-flex font-semibold text-green-800 hover:underline" to="/login">
          Đăng nhập
        </Link>
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-4xl space-y-6">
      {toast && (
        <ToastNotification
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-green-700">Tài khoản khách hàng</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">Sổ địa chỉ giao hàng</h1>
        <p className="mt-2 text-sm text-slate-600">
          Địa chỉ mặc định được tự động điền khi bạn thanh toán.
        </p>
      </header>

      {errorMessage && (
        <p className="rounded-xl bg-red-50 p-4 text-sm text-red-800" role="alert">{errorMessage}</p>
      )}

      <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-7">
        <h2 className="text-lg font-bold text-slate-900">
          {editingAddressId ? 'Cập nhật địa chỉ' : 'Thêm địa chỉ mới'}
        </h2>
        <form className="mt-4 grid gap-4 sm:grid-cols-2" onSubmit={submitAddress}>
          <label className="text-sm font-medium text-slate-700">
            Tên người nhận
            <input
              name="ten_nguoi_nhan"
              required
              maxLength={100}
              value={form.ten_nguoi_nhan}
              onChange={updateField}
              className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3"
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Số điện thoại
            <input
              name="so_dien_thoai"
              required
              maxLength={15}
              value={form.so_dien_thoai}
              onChange={updateField}
              className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3"
            />
          </label>
          <label className="text-sm font-medium text-slate-700 sm:col-span-2">
            Địa chỉ giao hàng
            <input
              name="dia_chi"
              required
              maxLength={255}
              value={form.dia_chi}
              onChange={updateField}
              className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3"
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Vĩ độ (không bắt buộc)
            <input
              name="vi_do"
              type="number"
              min="-90"
              max="90"
              step="any"
              value={form.vi_do}
              onChange={updateField}
              className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3"
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Kinh độ (không bắt buộc)
            <input
              name="kinh_do"
              type="number"
              min="-180"
              max="180"
              step="any"
              value={form.kinh_do}
              onChange={updateField}
              className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3"
            />
          </label>
          {!editingAddressId && (
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 sm:col-span-2">
              <input
                name="la_mac_dinh"
                type="checkbox"
                checked={form.la_mac_dinh}
                onChange={updateField}
                className="h-4 w-4 accent-green-700"
              />
              Đặt làm địa chỉ mặc định
            </label>
          )}
          <div className="sm:col-span-2">
            <Button type="submit" disabled={isSaving}>
              {isSaving ? <><LoadingSpinner label="Đang lưu địa chỉ" className="mr-2" />Đang lưu...</> : editingAddressId ? 'Cập nhật địa chỉ' : 'Lưu địa chỉ'}
            </Button>
            {editingAddressId && (
              <Button
                type="button"
                variant="secondary"
                className="ml-2"
                onClick={resetAddressForm}
                disabled={isSaving}
              >
                Hủy sửa
              </Button>
            )}
          </div>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-slate-900">Địa chỉ đã lưu</h2>
        {isLoading ? (
          <div className="grid gap-3" role="status" aria-label="Đang tải địa chỉ">
            {[0, 1].map((item) => (
              <article className="skeleton-card space-y-3 p-5" key={item}>
                <SkeletonBlock className="h-5 w-1/3" />
                <SkeletonBlock className="h-4 w-2/3" />
              </article>
            ))}
            <span className="sr-only">Đang tải sổ địa chỉ…</span>
          </div>
        ) : addresses.length === 0 ? (
          <EmptyState
            title="Chưa có địa chỉ giao hàng"
            description="Thêm địa chỉ để thanh toán nhanh hơn ở những lần mua sau."
            actionLabel="Nhập địa chỉ đầu tiên"
            onAction={() => document.querySelector('[name="ten_nguoi_nhan"]')?.focus()}
          />
        ) : addresses.map((address) => (
          <article key={address.id} className="rounded-2xl bg-white p-5 shadow-sm sm:flex sm:items-center sm:justify-between sm:gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-bold text-slate-900">{address.ten_nguoi_nhan}</h3>
                {address.la_mac_dinh && (
                  <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-800">Mặc định</span>
                )}
              </div>
              <p className="mt-1 text-sm text-slate-600">{address.so_dien_thoai} · {address.dia_chi}</p>
              {address.vi_do !== null && address.kinh_do !== null && (
                <p className="mt-1 text-xs text-slate-500">Tọa độ: {address.vi_do}, {address.kinh_do}</p>
              )}
            </div>
            <div className="mt-4 flex shrink-0 gap-3 sm:mt-0">
              <button
                type="button"
                onClick={() => editAddress(address)}
                disabled={busyAddressId !== null || isSaving}
                className="min-h-11 rounded-lg px-3 text-sm font-semibold text-green-800 hover:bg-green-50 disabled:opacity-50"
              >
                Sửa
              </button>
              {!address.la_mac_dinh && (
                <button
                  type="button"
                  onClick={() => setDefault(address.id)}
                  disabled={busyAddressId !== null}
                  className="min-h-11 rounded-lg px-3 text-sm font-semibold text-green-800 hover:bg-green-50 disabled:opacity-50"
                >
                  Đặt mặc định
                </button>
              )}
              <button
                type="button"
                onClick={() => deleteAddress(address.id)}
                disabled={busyAddressId !== null}
                className="min-h-11 rounded-lg px-3 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                Xóa
              </button>
            </div>
          </article>
        ))}
      </section>
    </section>
  )
}

export default ProfilePage
