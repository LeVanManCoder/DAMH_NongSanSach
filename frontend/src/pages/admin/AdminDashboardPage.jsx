import { useEffect, useState } from 'react'
import adminApi from '../../api/adminApi.js'
import LoadingSpinner from '../../components/LoadingSpinner.jsx'

const currency = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
})

const orderLabels = {
  cho_duyet: 'Chờ duyệt',
  da_thanh_toan: 'Đã thanh toán',
  da_xac_nhan: 'Đã xác nhận',
  dang_giao: 'Đang giao',
  da_giao: 'Đã giao',
  da_huy: 'Đã hủy',
  hoan_tien: 'Hoàn tiền',
  giao_bu: 'Giao bù',
}

const orderColors = [
  'bg-amber-500',
  'bg-emerald-500',
  'bg-green-600',
  'bg-blue-500',
  'bg-teal-600',
  'bg-slate-400',
  'bg-rose-500',
  'bg-violet-500',
]

function KpiCard({ label, value, detail, accent }) {
  return (
    <article className="rounded-2xl bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className={`mt-3 text-2xl font-bold ${accent ?? 'text-slate-900'}`}>{value}</p>
      {detail && <p className="mt-2 text-xs text-slate-500">{detail}</p>}
    </article>
  )
}

function AdminDashboardPage() {
  const [dashboard, setDashboard] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    async function loadDashboard() {
      try {
        const response = await adminApi.getDashboard({ signal: controller.signal })
        if (!controller.signal.aborted) setDashboard(response.data.data)
      } catch (error) {
        if (!controller.signal.aborted) {
          setErrorMessage(error.response?.data?.message ?? 'Không tải được thống kê quản trị.')
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }
    loadDashboard()
    return () => controller.abort()
  }, [])

  if (isLoading) {
    return <div className="flex min-h-64 items-center justify-center"><LoadingSpinner label="Đang tải thống kê" className="text-green-700" /></div>
  }

  if (errorMessage) {
    return <p className="rounded-xl bg-red-50 p-4 text-sm text-red-800" role="alert">{errorMessage}</p>
  }

  const statusCounts = dashboard.don_hang.theo_trang_thai ?? {}
  const statusEntries = Object.entries(orderLabels).map(([status, label], index) => ({
    status,
    label,
    count: Number(statusCounts[status] ?? 0),
    color: orderColors[index],
  }))
  const largestStatusCount = Math.max(1, ...statusEntries.map((item) => item.count))

  return (
    <section className="space-y-7">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-green-700">Bảng điều khiển</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">Thống kê tổng quan</h1>
        <p className="mt-2 text-sm text-slate-600">Cập nhật số liệu trực tiếp từ đơn hàng và kho lô.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Doanh thu ghi nhận" value={currency.format(dashboard.doanh_thu)} detail="Đơn đã thanh toán hoặc đã giao" accent="text-green-800" />
        <KpiCard label="Tổng đơn hàng" value={dashboard.don_hang.tong_so} detail="Gồm tất cả trạng thái hiện có" />
        <KpiCard label="Khách hàng" value={dashboard.khach_hang} detail="Tài khoản có vai trò Customer" />
        <KpiCard
          label="Xuất hủy / hao hụt"
          value={`${Number(dashboard.hao_hut.so_luong).toLocaleString('vi-VN')} đơn vị`}
          detail={`${dashboard.hao_hut.so_lan_xuat_huy} lần · ${dashboard.hao_hut.ty_le_tren_luong_nhap}% lượng nhập`}
          accent="text-rose-700"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-bold text-slate-900">Đơn hàng theo trạng thái</h2>
          <p className="mt-1 text-sm text-slate-500">Tổng {dashboard.don_hang.tong_so} đơn</p>
          <div className="mt-5 space-y-4">
            {statusEntries.map((entry) => (
              <div key={entry.status}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="text-slate-700">{entry.label}</span>
                  <span className="font-semibold text-slate-900">{entry.count}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${entry.color}`}
                    style={{ width: `${entry.count / largestStatusCount * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-5">
          <article className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm sm:p-6">
            <p className="text-sm font-semibold text-amber-900">Lô hàng cận hạn</p>
            <p className="mt-2 text-3xl font-bold text-amber-950">{dashboard.hang_can_han.so_lo} lô</p>
            <p className="mt-1 text-sm text-amber-900">
              {Number(dashboard.hang_can_han.so_luong).toLocaleString('vi-VN')} đơn vị còn tồn · chiếm {dashboard.hang_can_han.ty_le_ton_kha_dung}% tồn khả dụng
            </p>
            <p className="mt-2 text-xs text-amber-800">Ngưỡng cảnh báo: còn hạn trong {dashboard.hang_can_han.nguong_ngay} ngày</p>
          </article>
          <article className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
            <p className="text-sm font-semibold text-slate-600">Tỷ lệ hao hụt</p>
            <p className="mt-2 text-3xl font-bold text-rose-700">{dashboard.hao_hut.ty_le_tren_luong_nhap}%</p>
            <p className="mt-1 text-sm text-slate-600">
              Tính trên tổng lượng nhập của các lô; số lượng hao hụt là {Number(dashboard.hao_hut.so_luong).toLocaleString('vi-VN')}.
            </p>
          </article>
        </section>
      </div>
    </section>
  )
}

export default AdminDashboardPage
