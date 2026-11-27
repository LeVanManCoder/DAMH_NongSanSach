import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import batchApi from '../../api/batchApi.js'
import productApi from '../../api/productApi.js'
import seasonApi from '../../api/seasonApi.js'
import Button from '../../components/Button.jsx'
import LoadingSpinner from '../../components/LoadingSpinner.jsx'
import ToastNotification from '../../components/ToastNotification.jsx'
import useAuth from '../../contexts/useAuth.js'

const statusLabels = {
  dang_canh_tac: 'Đang canh tác',
  da_thu_hoach: 'Đã thu hoạch',
  con_hang: 'Còn hàng',
  het_hang: 'Hết hàng',
  het_han: 'Hết hạn',
}
const farmingActions = [
  ['gieo_hat', 'Gieo hạt'],
  ['bon_phan', 'Bón phân'],
  ['tuoi_nuoc', 'Tưới nước'],
  ['phun_thuoc', 'Phun thuốc'],
  ['cham_soc', 'Chăm sóc'],
  ['thu_hoach', 'Thu hoạch'],
  ['khac', 'Khác'],
]

function localDateTimeValue() {
  const date = new Date()
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset())

  return date.toISOString().slice(0, 16)
}

async function fetchBatches(signal) {
  const response = await batchApi.getBatches(
    { per_page: 100 },
    signal ? { signal } : undefined,
  )

  return response.data.data
}

function BatchWasteDashboard() {
  const { user } = useAuth()
  const [batches, setBatches] = useState([])
  const [products, setProducts] = useState([])
  const [seasons, setSeasons] = useState([])
  const [selectedBatchId, setSelectedBatchId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [reason, setReason] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [toast, setToast] = useState(null)
  const [isCreateBatchOpen, setIsCreateBatchOpen] = useState(false)
  const [isCreateSeasonOpen, setIsCreateSeasonOpen] = useState(false)
  const [isCreatingSeason, setIsCreatingSeason] = useState(false)
  const [seasonForm, setSeasonForm] = useState({
    ten_mua_vu: '',
    khu_vuc_canh_tac: '',
    ngay_bat_dau: '',
    ngay_ket_thuc_du_kien: '',
  })
  const [isCreatingBatch, setIsCreatingBatch] = useState(false)
  const [batchForm, setBatchForm] = useState({
    product_id: '',
    season_id: '',
    ngay_thu_hoach: '',
    ngay_het_han: '',
    so_luong_nhap: '',
  })
  const [openLogBatchId, setOpenLogBatchId] = useState(null)
  const [openQrBatchId, setOpenQrBatchId] = useState(null)
  const [isCreatingLog, setIsCreatingLog] = useState(false)
  const [logForm, setLogForm] = useState({
    hanh_dong: 'cham_soc',
    ghi_chu: '',
    thoi_gian: '',
  })
  const [logImage, setLogImage] = useState(null)
  const dismissToast = useCallback(() => setToast(null), [])

  const loadBatches = useCallback(async () => {
    try {
      const records = await fetchBatches()
      setErrorMessage('')
      setBatches(records)
      setSelectedBatchId((current) =>
        records.some(
          (batch) =>
            String(batch.id) === String(current) && batch.trang_thai === 'con_hang',
        )
          ? current
          : String(records.find((batch) => batch.trang_thai === 'con_hang')?.id ?? ''),
      )
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message ??
          'Không tải được dữ liệu lô hàng. Vui lòng thử lại.',
      )
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()

    async function initialLoad() {
      try {
        const records = await fetchBatches(controller.signal)
        if (controller.signal.aborted) {
          return
        }

        setErrorMessage('')
        setBatches(records)
        setSelectedBatchId(
          String(records.find((batch) => batch.trang_thai === 'con_hang')?.id ?? ''),
        )
        if (user?.role === 'farm_staff') {
          const [productResponse, seasonResponse] = await Promise.all([
            productApi.getFarmProducts({ signal: controller.signal }),
            seasonApi.getSeasons({ signal: controller.signal }),
          ])
          if (controller.signal.aborted) {
            return
          }
          setProducts(productResponse.data.data)
          setSeasons(seasonResponse.data.data)
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setErrorMessage(
            error.response?.data?.message ??
              'Không tải được dữ liệu lô hàng. Vui lòng thử lại.',
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

  const selectedBatch = useMemo(
    () => batches.find((batch) => String(batch.id) === String(selectedBatchId)),
    [batches, selectedBatchId],
  )

  async function recordWaste(event) {
    event.preventDefault()
    if (!selectedBatch || !Number.isFinite(Number(quantity)) || Number(quantity) <= 0) {
      setToast({ message: 'Vui lòng nhập số lượng xuất hủy hợp lệ.', type: 'error' })
      return
    }

    setIsSubmitting(true)
    setErrorMessage('')
    try {
      await batchApi.recordWaste(selectedBatch.id, {
        so_luong: Number(quantity),
        ly_do: reason,
      })
      setQuantity('')
      setReason('')
      setToast({ message: 'Đã ghi nhận xuất hủy và cập nhật tồn kho.', type: 'success' })
      await loadBatches()
    } catch (error) {
      const validationMessage = Object.values(error.response?.data?.errors ?? {})
        .flat()
        .find(Boolean)
      setErrorMessage(
        validationMessage ??
          error.response?.data?.message ??
          'Không thể ghi nhận xuất hủy. Vui lòng thử lại.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  async function createBatch(event) {
    event.preventDefault()
    setIsCreatingBatch(true)
    setErrorMessage('')

    try {
      const response = await batchApi.createBatch({
        product_id: Number(batchForm.product_id),
        season_id: batchForm.season_id ? Number(batchForm.season_id) : null,
        ngay_thu_hoach: batchForm.ngay_thu_hoach,
        ngay_het_han: batchForm.ngay_het_han,
        so_luong_nhap: Number(batchForm.so_luong_nhap),
        trang_thai: 'con_hang',
      })
      const batchId = response.data.data.id
      setBatchForm({
        product_id: '',
        season_id: '',
        ngay_thu_hoach: '',
        ngay_het_han: '',
        so_luong_nhap: '',
      })
      setIsCreateBatchOpen(false)
      setOpenLogBatchId(batchId)
      setLogForm({
        hanh_dong: 'cham_soc',
        ghi_chu: '',
        thoi_gian: localDateTimeValue(),
      })
      setToast({
        message: 'Đã tạo lô hàng. Ghi nhật ký đầu tiên để tự động tạo mã QR truy xuất.',
        type: 'success',
      })
      await loadBatches()
    } catch (error) {
      const validationMessage = Object.values(error.response?.data?.errors ?? {})
        .flat()
        .find(Boolean)
      setErrorMessage(
        validationMessage ??
          error.response?.data?.message ??
          'Không thể tạo lô hàng. Vui lòng kiểm tra thông tin.',
      )
    } finally {
      setIsCreatingBatch(false)
    }
  }

  async function createSeason(event) {
    event.preventDefault()
    setIsCreatingSeason(true)
    setErrorMessage('')

    try {
      const response = await seasonApi.createSeason({
        ...seasonForm,
        khu_vuc_canh_tac: seasonForm.khu_vuc_canh_tac || null,
        ngay_ket_thuc_du_kien: seasonForm.ngay_ket_thuc_du_kien || null,
      })
      const season = response.data.data
      setSeasons((current) => [season, ...current])
      setBatchForm((current) => ({ ...current, season_id: String(season.id) }))
      setSeasonForm({
        ten_mua_vu: '',
        khu_vuc_canh_tac: '',
        ngay_bat_dau: '',
        ngay_ket_thuc_du_kien: '',
      })
      setIsCreateSeasonOpen(false)
      setToast({ message: 'Đã tạo mùa vụ mới.', type: 'success' })
    } catch (error) {
      const validationMessage = Object.values(error.response?.data?.errors ?? {})
        .flat()
        .find(Boolean)
      setErrorMessage(
        validationMessage ?? error.response?.data?.message ?? 'Không thể tạo mùa vụ.',
      )
    } finally {
      setIsCreatingSeason(false)
    }
  }

  async function createFarmingLog(event, batch) {
    event.preventDefault()
    setIsCreatingLog(true)
    setErrorMessage('')

    const formData = new FormData()
    formData.append('hanh_dong', logForm.hanh_dong)
    formData.append('ghi_chu', logForm.ghi_chu)
    formData.append('thoi_gian', `${logForm.thoi_gian.replace('T', ' ')}:00`)
    if (logImage) {
      formData.append('hinh_anh_minh_chung', logImage)
    }

    try {
      const response = await batchApi.createFarmingLog(batch.id, formData)
      setOpenLogBatchId(null)
      setLogImage(null)
      setToast({
        message: response.data.qr_code
          ? 'Đã ghi nhật ký và tự động tạo mã QR truy xuất.'
          : 'Đã ghi nhật ký canh tác cho lô hàng.',
        type: 'success',
      })
      await loadBatches()
    } catch (error) {
      const validationMessage = Object.values(error.response?.data?.errors ?? {})
        .flat()
        .find(Boolean)
      setErrorMessage(
        validationMessage ??
          error.response?.data?.message ??
          'Không thể ghi nhật ký canh tác. Vui lòng thử lại.',
      )
    } finally {
      setIsCreatingLog(false)
    }
  }

  function getTraceUrl(qrCode) {
    const baseUrl = (import.meta.env.VITE_APP_URL || window.location.origin)
      .replace(/\/+$/, '')
    return `${baseUrl}/trace/${encodeURIComponent(qrCode)}`
  }

  function getQrSvg(batch) {
    return document.getElementById(`batch-qr-${batch.id}`)
  }

  function downloadQr(batch) {
    const qrSvg = getQrSvg(batch)
    if (!qrSvg) {
      setToast({ message: 'Không tìm thấy ảnh QR để tải.', type: 'error' })
      return
    }

    const svgMarkup = new XMLSerializer().serializeToString(qrSvg)
    const objectUrl = URL.createObjectURL(new Blob([svgMarkup], { type: 'image/svg+xml' }))
    const downloadLink = document.createElement('a')
    downloadLink.href = objectUrl
    downloadLink.download = `nong-lanh-${batch.ma_lo}.svg`
    downloadLink.click()
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
  }

  function printQr(batch) {
    const qrSvg = getQrSvg(batch)
    if (!qrSvg) {
      setToast({ message: 'Không tìm thấy ảnh QR để in.', type: 'error' })
      return
    }

    const printWindow = window.open('', '_blank', 'width=480,height=600')
    if (!printWindow) {
      setToast({ message: 'Trình duyệt đang chặn cửa sổ in QR.', type: 'error' })
      return
    }

    const svgData = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
      new XMLSerializer().serializeToString(qrSvg),
    )}`
    printWindow.document.write(
      `<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>Tem truy xuất Nông Lành</title><style>body{font-family:Arial,sans-serif;text-align:center;padding:24px}img{width:240px;height:240px}p{font-size:14px}</style></head><body><h1>Nông Lành</h1><img src="${svgData}" alt="Mã QR truy xuất"><p>Mã lô: ${String(batch.ma_lo).replace(/[&<>"]/g, '')}</p><script>window.onload=()=>window.print()</script></body></html>`,
    )
    printWindow.document.close()
  }

  async function generateQr(batch) {
    setIsSubmitting(true)
    try {
      await batchApi.generateQr(batch.id)
      setToast({ message: `Đã tạo mã QR truy xuất cho lô ${batch.ma_lo}.`, type: 'success' })
      await loadBatches()
    } catch (error) {
      setToast({
        message: error.response?.data?.message ?? 'Không thể tạo mã QR cho lô hàng.',
        type: 'error',
      })
    } finally {
      setIsSubmitting(false)
    }
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
      <div className="page-heading flex flex-col gap-4 py-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="section-kicker">
            Khu vực nhân viên
          </p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
            Quản lý lô hàng & hao hụt
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Tồn kho thực tế được cập nhật sau xuất hủy hoặc phân bổ đơn hàng FEFO.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {user?.role === 'farm_staff' && (
            <>
              <Button onClick={() => setIsCreateSeasonOpen((current) => !current)}>
                Tạo mùa vụ mới
              </Button>
              <Button onClick={() => setIsCreateBatchOpen((current) => !current)}>
                Tạo lô hàng mới
              </Button>
            </>
          )}
          <Button
            variant="secondary"
            onClick={() => loadBatches()}
            disabled={isLoading}
          >
            Làm mới danh sách
          </Button>
        </div>
      </div>

      {errorMessage && (
        <p className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-800" role="alert">
          {errorMessage}
        </p>
      )}

      {user?.role === 'farm_staff' && isCreateSeasonOpen && (
        <form
          onSubmit={createSeason}
          className="form-panel mt-6 rounded-2xl border border-green-100 bg-green-50 p-5 sm:p-6"
        >
          <h2 className="font-bold text-slate-900">Tạo mùa vụ mới</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-sm font-medium text-slate-700">
              Tên mùa vụ
              <input
                required
                maxLength={120}
                value={seasonForm.ten_mua_vu}
                onChange={(event) => setSeasonForm((current) => ({
                  ...current,
                  ten_mua_vu: event.target.value,
                }))}
                className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3"
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Khu vực canh tác (không bắt buộc)
              <input
                maxLength={100}
                value={seasonForm.khu_vuc_canh_tac}
                onChange={(event) => setSeasonForm((current) => ({
                  ...current,
                  khu_vuc_canh_tac: event.target.value,
                }))}
                className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3"
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Ngày bắt đầu
              <input
                required
                type="date"
                value={seasonForm.ngay_bat_dau}
                onChange={(event) => setSeasonForm((current) => ({
                  ...current,
                  ngay_bat_dau: event.target.value,
                }))}
                className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3"
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Kết thúc dự kiến
              <input
                type="date"
                min={seasonForm.ngay_bat_dau}
                value={seasonForm.ngay_ket_thuc_du_kien}
                onChange={(event) => setSeasonForm((current) => ({
                  ...current,
                  ngay_ket_thuc_du_kien: event.target.value,
                }))}
                className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3"
              />
            </label>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button type="submit" disabled={isCreatingSeason}>
              {isCreatingSeason ? 'Đang tạo...' : 'Tạo mùa vụ'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsCreateSeasonOpen(false)}
              disabled={isCreatingSeason}
            >
              Đóng
            </Button>
          </div>
        </form>
      )}

      {user?.role === 'farm_staff' && isCreateBatchOpen && (
        <form
          onSubmit={createBatch}
          className="form-panel mt-6 rounded-2xl border border-green-100 bg-green-50 p-5 sm:p-6"
        >
          <h2 className="font-bold text-slate-900">Tạo lô hàng mới</h2>
          <p className="mt-1 text-sm text-slate-600">
            Mã lô được tạo tự động. Sau khi tạo lô, ghi nhật ký đầu tiên để sinh mã QR truy xuất.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="text-sm font-medium text-slate-700">
              Sản phẩm
              <select
                required
                value={batchForm.product_id}
                onChange={(event) =>
                  setBatchForm((current) => ({ ...current, product_id: event.target.value }))
                }
                className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3"
              >
                <option value="">Chọn sản phẩm</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.ten_san_pham}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium text-slate-700">
              Mùa vụ (không bắt buộc)
              <select
                value={batchForm.season_id}
                onChange={(event) =>
                  setBatchForm((current) => ({ ...current, season_id: event.target.value }))
                }
                className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3"
              >
                <option value="">Chọn mùa vụ</option>
                {seasons.map((season) => (
                  <option key={season.id} value={season.id}>
                    {season.ten_mua_vu}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium text-slate-700">
              Ngày thu hoạch
              <input
                required
                type="date"
                value={batchForm.ngay_thu_hoach}
                onChange={(event) =>
                  setBatchForm((current) => ({
                    ...current,
                    ngay_thu_hoach: event.target.value,
                  }))
                }
                className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3"
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Hạn sử dụng
              <input
                required
                type="date"
                min={batchForm.ngay_thu_hoach}
                value={batchForm.ngay_het_han}
                onChange={(event) =>
                  setBatchForm((current) => ({
                    ...current,
                    ngay_het_han: event.target.value,
                  }))
                }
                className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3"
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Số lượng nhập
              <input
                required
                type="number"
                min="0.01"
                step="0.01"
                value={batchForm.so_luong_nhap}
                onChange={(event) =>
                  setBatchForm((current) => ({
                    ...current,
                    so_luong_nhap: event.target.value,
                  }))
                }
                className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3"
              />
            </label>
          </div>
          {products.length === 0 && (
            <p className="mt-3 text-sm text-amber-800">
              Chưa có sản phẩm hoạt động để tạo lô hàng.
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-3">
            <Button type="submit" disabled={isCreatingBatch || products.length === 0}>
              {isCreatingBatch ? (
                <>
                  <LoadingSpinner label="Đang tạo lô hàng" className="mr-2" />
                  Đang tạo...
                </>
              ) : 'Tạo lô hàng'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsCreateBatchOpen(false)}
              disabled={isCreatingBatch}
            >
              Đóng
            </Button>
          </div>
        </form>
      )}

      {user?.role === 'farm_staff' && (
        <form
          onSubmit={recordWaste}
          className="form-panel mt-6 rounded-2xl border border-amber-100 bg-amber-50 p-5 sm:p-6"
        >
          <h2 className="font-bold text-slate-900">Ghi nhận xuất hủy / hao hụt</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <label className="text-sm font-medium text-slate-700">
              Lô hàng
              <select
                required
                value={selectedBatchId}
                onChange={(event) => setSelectedBatchId(event.target.value)}
                className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3"
              >
                <option value="">Chọn lô còn hàng</option>
                {batches
                  .filter((batch) => batch.trang_thai === 'con_hang')
                  .map((batch) => (
                    <option key={batch.id} value={batch.id}>
                      {batch.ma_lo} · {batch.product?.ten_san_pham}
                    </option>
                  ))}
              </select>
            </label>
            <label className="text-sm font-medium text-slate-700">
              Số lượng hủy
              <input
                required
                type="number"
                min="0.01"
                max={selectedBatch?.so_luong_ton}
                step="0.01"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3"
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Lý do
              <input
                required
                maxLength={255}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Ví dụ: dập nát khi phân loại"
                className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3"
              />
            </label>
          </div>
          <Button
            type="submit"
            className="mt-4"
            disabled={
              isSubmitting ||
              !selectedBatch ||
              Number(quantity) > Number(selectedBatch?.so_luong_ton ?? 0)
            }
          >
            {isSubmitting ? (
              <>
                <LoadingSpinner label="Đang ghi nhận" className="mr-2" />
                Đang ghi nhận...
              </>
            ) : (
              'Ghi nhận xuất hủy'
            )}
          </Button>
        </form>
      )}

      <div className="dashboard-panel mt-6 overflow-hidden rounded-2xl bg-white">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="font-bold text-slate-900">Tồn kho theo lô</h2>
        </div>
        {isLoading ? (
          <div className="flex min-h-48 items-center justify-center">
            <LoadingSpinner label="Đang tải lô hàng" className="text-green-700" />
          </div>
        ) : batches.length === 0 ? (
          <p className="p-6 text-slate-600">Chưa có dữ liệu lô hàng.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Mã lô / sản phẩm</th>
                  <th className="px-5 py-3 font-semibold">Ngày thu hoạch</th>
                  <th className="px-5 py-3 font-semibold">Hạn sử dụng</th>
                  <th className="px-5 py-3 font-semibold">Tồn thực tế</th>
                  <th className="px-5 py-3 font-semibold">Trạng thái</th>
                  <th className="px-5 py-3 font-semibold">Nhật ký / QR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {batches.map((batch) => (
                  <Fragment key={batch.id}>
                    <tr className="text-slate-700">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-900">{batch.ma_lo}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {batch.product?.ten_san_pham ?? 'Sản phẩm'}
                        </p>
                      </td>
                      <td className="px-5 py-4">{batch.ngay_thu_hoach ?? '—'}</td>
                      <td className="px-5 py-4">{batch.ngay_het_han ?? '—'}</td>
                      <td className="px-5 py-4 font-bold text-slate-900">
                        {batch.so_luong_ton} {batch.product?.don_vi_tinh}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                            batch.trang_thai === 'con_hang'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {statusLabels[batch.trang_thai] ?? batch.trang_thai}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-xs text-slate-600">
                          {batch.farming_logs?.length ?? 0} mốc canh tác
                        </p>
                        {user?.role === 'farm_staff' && (
                          <button
                            type="button"
                            onClick={() => {
                              setOpenLogBatchId((current) =>
                                current === batch.id ? null : batch.id,
                              )
                              setLogForm({
                                hanh_dong: 'cham_soc',
                                ghi_chu: '',
                                thoi_gian: localDateTimeValue(),
                              })
                            }}
                            className="mt-1 text-xs font-semibold text-green-800 hover:underline"
                          >
                            Ghi nhật ký canh tác
                          </button>
                        )}
                        {batch.qr_code ? (
                          <>
                            <Link
                              className="mt-1 block text-xs font-semibold text-green-800 hover:underline"
                              to={`/trace/${encodeURIComponent(batch.qr_code)}`}
                            >
                              Mở trang truy xuất
                            </Link>
                            <button
                              type="button"
                              className="mt-1 min-h-10 text-xs font-semibold text-green-800 hover:underline"
                              onClick={() => setOpenQrBatchId((current) =>
                                current === batch.id ? null : batch.id,
                              )}
                            >
                              {openQrBatchId === batch.id ? 'Ẩn ảnh QR' : 'Ảnh QR / tải / in'}
                            </button>
                          </>
                        ) : (
                          <>
                            <p className="mt-1 text-xs text-slate-500">
                              QR tạo sau thu hoạch và nhật ký đầu tiên
                            </p>
                            {batch.ngay_thu_hoach && batch.farming_logs?.length > 0 && (
                              <button
                                type="button"
                                className="mt-1 min-h-10 text-xs font-semibold text-green-800 hover:underline"
                                onClick={() => generateQr(batch)}
                                disabled={isSubmitting}
                              >
                                Tạo mã QR
                              </button>
                            )}
                          </>
                        )}
                      </td>
                    </tr>
                    {openQrBatchId === batch.id && batch.qr_code && (
                      <tr>
                        <td colSpan={6} className="bg-white px-5 py-5">
                          <div className="flex flex-wrap items-center gap-5">
                            <div className="rounded-xl border border-slate-200 bg-white p-3">
                              <QRCodeSVG
                                id={`batch-qr-${batch.id}`}
                                value={getTraceUrl(batch.qr_code)}
                                size={144}
                                level="M"
                                title={`Mã truy xuất lô ${batch.ma_lo}`}
                              />
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900">
                                Tem truy xuất · {batch.ma_lo}
                              </p>
                              <p className="mt-1 break-all text-sm text-slate-600">
                                {getTraceUrl(batch.qr_code)}
                              </p>
                              <div className="mt-3 flex flex-wrap gap-2">
                                <Button variant="secondary" onClick={() => downloadQr(batch)}>
                                  Tải ảnh QR (SVG)
                                </Button>
                                <Button variant="secondary" onClick={() => printQr(batch)}>
                                  In tem
                                </Button>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                    {openLogBatchId === batch.id && user?.role === 'farm_staff' && (
                      <tr>
                        <td colSpan={6} className="bg-green-50/60 px-5 py-4">
                          <form
                            onSubmit={(event) => createFarmingLog(event, batch)}
                            className="grid gap-4 sm:grid-cols-2"
                          >
                            <h3 className="font-bold text-slate-900 sm:col-span-2">
                              Ghi nhật ký · {batch.ma_lo}
                            </h3>
                            <label className="text-sm font-medium text-slate-700">
                              Hành động
                              <select
                                required
                                value={logForm.hanh_dong}
                                onChange={(event) =>
                                  setLogForm((current) => ({
                                    ...current,
                                    hanh_dong: event.target.value,
                                  }))
                                }
                                className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3"
                              >
                                {farmingActions.map(([value, label]) => (
                                  <option key={value} value={value}>{label}</option>
                                ))}
                              </select>
                            </label>
                            <label className="text-sm font-medium text-slate-700">
                              Thời gian
                              <input
                                required
                                type="datetime-local"
                                value={logForm.thoi_gian}
                                onChange={(event) =>
                                  setLogForm((current) => ({
                                    ...current,
                                    thoi_gian: event.target.value,
                                  }))
                                }
                                className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3"
                              />
                            </label>
                            <label className="text-sm font-medium text-slate-700 sm:col-span-2">
                              Ghi chú
                              <textarea
                                required
                                maxLength={5000}
                                rows={3}
                                value={logForm.ghi_chu}
                                onChange={(event) =>
                                  setLogForm((current) => ({
                                    ...current,
                                    ghi_chu: event.target.value,
                                  }))
                                }
                                className="mt-2 w-full rounded-lg border border-slate-300 bg-white p-3"
                              />
                            </label>
                            <label className="text-sm font-medium text-slate-700 sm:col-span-2">
                              Ảnh minh chứng (không bắt buộc)
                              <input
                                type="file"
                                accept=".jpg,.jpeg,.png,.webp"
                                onChange={(event) =>
                                  setLogImage(event.target.files?.[0] ?? null)
                                }
                                className="mt-2 block w-full rounded-lg border border-slate-300 bg-white p-2 text-sm"
                              />
                            </label>
                            <div className="flex flex-wrap gap-3 sm:col-span-2">
                              <Button type="submit" disabled={isCreatingLog}>
                                {isCreatingLog ? (
                                  <>
                                    <LoadingSpinner label="Đang lưu nhật ký" className="mr-2" />
                                    Đang lưu...
                                  </>
                                ) : 'Lưu nhật ký'}
                              </Button>
                              <Button
                                type="button"
                                variant="secondary"
                                onClick={() => setOpenLogBatchId(null)}
                                disabled={isCreatingLog}
                              >
                                Hủy
                              </Button>
                            </div>
                          </form>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {user?.role !== 'farm_staff' && (
        <p className="mt-3 text-xs text-slate-500">
          Tài khoản hiện tại chỉ có quyền xem danh sách; thao tác xuất hủy dành cho nhân viên nông trại.
        </p>
      )}
    </section>
  )
}

export default BatchWasteDashboard
