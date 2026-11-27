import { useEffect, useState } from 'react'
import { AlertCircle, BadgeCheck, CircleCheck } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import traceApi from '../../api/traceApi.js'
import Breadcrumbs from '../../components/Breadcrumbs.jsx'
import EmptyState from '../../components/EmptyState.jsx'
import { TraceSkeleton } from '../../components/Skeletons.jsx'

const BATCH_STATUSES = {
  dang_canh_tac: 'Đang canh tác',
  da_thu_hoach: 'Đã thu hoạch',
  con_hang: 'Còn hàng',
  het_hang: 'Hết hàng',
  het_han: 'Hết hạn',
}

function TracePage() {
  const { qrCode } = useParams()
  const [trace, setTrace] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    async function loadTrace() {
      setIsLoading(true)
      setErrorMessage('')
      setTrace(null)

      try {
        const response = await traceApi.getTrace(qrCode, {
          signal: controller.signal,
        })
        setTrace(response.data.data)
      } catch (error) {
        if (!controller.signal.aborted) {
          setErrorMessage(
            error.response?.data?.message ??
              'Không tải được thông tin truy xuất. Vui lòng thử lại.',
          )
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    loadTrace()

    return () => controller.abort()
  }, [qrCode])

  if (isLoading) {
    return (
      <>
        <Breadcrumbs items={[{ label: 'Truy xuất nguồn gốc' }]} />
        <TraceSkeleton />
      </>
    )
  }

  if (errorMessage || !trace) {
    return (
      <>
        <Breadcrumbs items={[{ label: 'Truy xuất nguồn gốc' }]} />
        <EmptyState
          icon={AlertCircle}
          title="Không tìm thấy thông tin lô hàng"
          description={errorMessage || 'Mã QR không hợp lệ hoặc lô hàng chưa có dữ liệu công khai.'}
          actionLabel="Xem sản phẩm"
          actionTo="/products"
        />
      </>
    )
  }

  return (
    <article className="mx-auto max-w-4xl">
      <Breadcrumbs items={[{ label: 'Truy xuất nguồn gốc' }, { label: trace.ma_lo }]} />
      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-green-900 via-green-800 to-lime-700 p-6 text-white shadow-lg sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-green-100">
          Nông Lành · Truy xuất nguồn gốc
        </p>
        <h1 className="mt-3 text-3xl font-bold sm:text-4xl">
          {trace.product?.ten_san_pham ?? 'Thông tin lô nông sản'}
        </h1>
        <p className="mt-2 text-green-100">
          Minh bạch hành trình từ vùng trồng đến lô hàng bạn đang xem.
        </p>
        {trace.product?.slug && (
          <Link
            to={`/products/${trace.product.slug}`}
            className="mt-5 inline-flex min-h-10 items-center rounded-lg bg-white/15 px-4 py-2 text-sm font-semibold text-white hover:bg-white/25"
          >
            Xem sản phẩm
          </Link>
        )}
      </div>

      <section className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Mã lô</p>
          <p className="mt-1 text-xl font-bold text-slate-900">{trace.ma_lo}</p>
          <p className="mt-4 text-sm font-medium text-slate-500">Trạng thái lô</p>
          <p className={`mt-1 inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${trace.trang_thai === 'con_hang' ? 'bg-green-100 text-green-900' : 'bg-amber-100 text-amber-950'}`}>
            {trace.trang_thai === 'con_hang'
              ? <CircleCheck size={17} aria-hidden="true" />
              : <BadgeCheck size={17} aria-hidden="true" />}
            {BATCH_STATUSES[trace.trang_thai] ?? trace.trang_thai ?? 'Chưa cập nhật'}
          </p>
          <p className="mt-4 text-sm font-medium text-slate-500">Vùng trồng</p>
          <p className="mt-1 font-semibold text-green-900">
            {trace.season?.khu_vuc_canh_tac ?? 'Thông tin vùng trồng chưa cập nhật'}
          </p>
          {trace.season?.ten_mua_vu && (
            <p className="mt-1 text-sm text-slate-600">{trace.season.ten_mua_vu}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Ngày thu hoạch</p>
            <p className="mt-2 font-semibold text-slate-900">
              {trace.ngay_thu_hoach ?? 'Chưa cập nhật'}
            </p>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Hạn sử dụng</p>
            <p className="mt-2 font-semibold text-slate-900">
              {trace.ngay_het_han ?? 'Chưa cập nhật'}
            </p>
          </div>
          <div className="col-span-2 rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Đơn vị sản phẩm</p>
            <p className="mt-2 font-semibold text-slate-900">
              {trace.product?.don_vi_tinh ?? 'Nông sản'}
            </p>
          </div>
        </div>
      </section>

      <section className="mt-8 rounded-2xl bg-white p-5 shadow-sm sm:p-8">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-green-700">
            Nhật ký minh bạch
          </p>
          <h2 className="mt-1 text-2xl font-bold text-slate-900">
            Hành trình canh tác
          </h2>
        </div>

        {trace.farming_logs.length === 0 ? (
          <p className="mt-5 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
            Chưa có nhật ký canh tác được công khai cho lô hàng này.
          </p>
        ) : (
          <ol className="mt-6 space-y-6 border-l-2 border-green-100 pl-6">
            {trace.farming_logs.map((log, index) => (
              <li key={`${log.thoi_gian}-${index}`} className="relative">
                <span
                  aria-hidden="true"
                  className="absolute -left-[1.9rem] top-1 h-4 w-4 rounded-full border-2 border-white bg-green-600 shadow"
                />
                <p className="font-semibold text-slate-900">{log.hanh_dong}</p>
                {log.ghi_chu && (
                  <p className="mt-1 leading-6 text-slate-600">{log.ghi_chu}</p>
                )}
                {log.hinh_anh_minh_chung && (
                  <img
                    src={log.hinh_anh_minh_chung}
                    alt={`Minh chứng ${log.hanh_dong}`}
                    className="mt-3 max-h-64 rounded-xl object-cover"
                    loading="lazy"
                  />
                )}
                <time
                  dateTime={log.thoi_gian}
                  className="mt-2 block text-sm text-slate-500"
                >
                  {log.thoi_gian
                    ? new Date(log.thoi_gian).toLocaleString('vi-VN')
                    : 'Thời gian chưa cập nhật'}
                </time>
              </li>
            ))}
          </ol>
        )}
      </section>
    </article>
  )
}

export default TracePage
