import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, CircleCheck, Clock3 } from 'lucide-react'
import { Link } from 'react-router-dom'
import complaintApi from '../../api/complaintApi.js'
import Button from '../../components/Button.jsx'
import EmptyState from '../../components/EmptyState.jsx'
import LoadingSpinner from '../../components/LoadingSpinner.jsx'
import SkeletonBlock from '../../components/Skeletons.jsx'
import ToastNotification from '../../components/ToastNotification.jsx'
import useConfirm from '../../components/useConfirm.js'
import useAuth from '../../contexts/useAuth.js'

const COMPLAINT_STATUSES = {
  cho_xu_ly: 'Chờ xử lý',
  chap_nhan: 'Đã chấp nhận',
  hoan_tien: 'Hoàn tiền',
  giao_bu: 'Đổi / giao bù',
  tu_choi: 'Đã từ chối',
}
const RESOLUTION_OPTIONS = [
  ['hoan_tien', 'Hoàn tiền'],
  ['giao_bu', 'Đổi hàng / giao bù'],
  ['tu_choi', 'Từ chối'],
]

function StaffComplaintsPage() {
  const { user } = useAuth()
  const confirm = useConfirm()
  const [complaints, setComplaints] = useState([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [updatingId, setUpdatingId] = useState(null)
  const [responses, setResponses] = useState({})
  const [resolutions, setResolutions] = useState({})
  const [selectedImage, setSelectedImage] = useState(null)
  const [toast, setToast] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')

  const loadComplaints = useCallback(async (pageNumber = 1, append = false) => {
    if (!['sales', 'admin'].includes(user?.role)) return

    setErrorMessage('')
    if (append) setIsLoadingMore(true)
    else setIsLoading(true)

    try {
      const response = await complaintApi.getComplaints({ page: pageNumber })
      setComplaints((current) =>
        append ? [...current, ...response.data.data] : response.data.data,
      )
      setPage(pageNumber)
      setHasMore(Boolean(response.data.links?.next))
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message ?? 'Không tải được danh sách khiếu nại.',
      )
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
    }
  }, [user?.role])

  useEffect(() => {
    if (!['sales', 'admin'].includes(user?.role)) return undefined

    let active = true
    async function initialLoad() {
      try {
        const response = await complaintApi.getComplaints({ page: 1 })
        if (!active) return
        setComplaints(response.data.data)
        setHasMore(Boolean(response.data.links?.next))
      } catch (error) {
        if (active) {
          setErrorMessage(
            error.response?.data?.message ?? 'Không tải được danh sách khiếu nại.',
          )
        }
      } finally {
        if (active) setIsLoading(false)
      }
    }

    initialLoad()
    return () => {
      active = false
    }
  }, [user?.role])

  async function resolveComplaint(complaint) {
    const responseNote = responses[complaint.id]?.trim()
    const status = resolutions[complaint.id]
    if (!responseNote || !status) {
      setToast({ message: 'Vui lòng chọn phương án và nhập phản hồi cho khách hàng.', type: 'error' })
      return
    }

    const confirmed = await confirm({
      title: 'Lưu phương án xử lý khiếu nại?',
      description: `Hệ thống sẽ ghi nhận “${COMPLAINT_STATUSES[status]}” và gửi phản hồi đã nhập cho khách hàng. Việc ghi nhận không tự hoàn tiền hoặc tạo đơn đổi hàng.`,
      confirmLabel: 'Lưu phương án',
      tone: status === 'tu_choi' ? 'danger' : 'warning',
    })
    if (!confirmed) return

    setUpdatingId(complaint.id)
    try {
      const response = await complaintApi.updateComplaint(complaint.id, {
        trang_thai: status,
        phan_hoi: responseNote,
      })
      setComplaints((current) =>
        current.map((item) =>
          item.id === complaint.id ? response.data.data : item,
        ),
      )
      setToast({
        message: status === 'tu_choi'
          ? 'Đã ghi nhận từ chối khiếu nại.'
          : `Đã ghi nhận phương án ${COMPLAINT_STATUSES[status].toLowerCase()}.`,
        type: 'success',
      })
    } catch (error) {
      setToast({
        message: error.response?.data?.message ?? 'Không thể cập nhật khiếu nại.',
        type: 'error',
      })
    } finally {
      setUpdatingId(null)
    }
  }

  if (!['sales', 'admin'].includes(user?.role)) {
    return (
      <section className="rounded-2xl bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Quản lý khiếu nại</h1>
        <p className="mt-3 text-slate-600">Trang này dành cho Sales và Admin.</p>
        <Link className="mt-5 inline-flex font-semibold text-green-800 hover:underline" to="/login">
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
          onClose={() => setToast(null)}
        />
      )}
      <header className="page-heading mb-6 py-1">
        <p className="section-kicker">
          Chăm sóc khách hàng
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">Quản lý khiếu nại</h1>
      </header>

      {errorMessage && (
        <p className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-800" role="alert">
          {errorMessage}
        </p>
      )}

      {isLoading ? (
        <div className="space-y-5" role="status" aria-label="Đang tải khiếu nại">
          {[0, 1, 2].map((item) => (
            <article className="skeleton-card space-y-3 p-5" key={item}>
              <SkeletonBlock className="h-5 w-2/3" />
              <SkeletonBlock className="h-4 w-1/2" />
              <SkeletonBlock className="h-24 w-full rounded-xl" />
            </article>
          ))}
          <span className="sr-only">Đang tải danh sách khiếu nại…</span>
        </div>
      ) : complaints.length === 0 ? (
        <EmptyState
          icon={CircleCheck}
          title="Chưa có khiếu nại cần xử lý"
          description="Khi khách hàng gửi yêu cầu, thông tin sẽ hiển thị tại đây."
          actionLabel="Tải lại"
          onAction={() => loadComplaints()}
        />
      ) : (
        <div className="space-y-5">
          {complaints.map((complaint) => {
            const image = complaint.media?.find((media) => media.loai === 'anh')
            const isPending = complaint.trang_thai === 'cho_xu_ly'
            const isUpdating = updatingId === complaint.id

            return (
              <article key={complaint.id} className="dashboard-panel rounded-2xl bg-white p-5 sm:p-6">
                <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <h2 className="font-bold text-slate-900">
                      Khiếu nại đơn {complaint.order?.ma_don ?? `#${complaint.order_id}`}
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">
                      Khách hàng: {complaint.user?.ho_ten ?? 'Không rõ'}
                      {complaint.user?.email ? ` (${complaint.user.email})` : ''}
                    </p>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${isPending ? 'bg-amber-100 text-amber-950' : complaint.trang_thai === 'tu_choi' ? 'bg-red-100 text-red-950' : 'bg-green-100 text-green-950'}`}>
                    {isPending
                      ? <Clock3 size={15} aria-hidden="true" />
                      : complaint.trang_thai === 'tu_choi'
                        ? <AlertCircle size={15} aria-hidden="true" />
                        : <CircleCheck size={15} aria-hidden="true" />}
                    {COMPLAINT_STATUSES[complaint.trang_thai] ?? complaint.trang_thai}
                  </span>
                </header>

                <p className="mt-4 font-medium text-slate-800">
                  Lý do: {complaint.ly_do} {complaint.mo_ta ? `— ${complaint.mo_ta}` : ''}
                </p>
                {image && (
                  <button
                    type="button"
                    onClick={() => setSelectedImage(image.public_url)}
                    className="mt-4 block text-left"
                    aria-label="Phóng to ảnh minh chứng"
                  >
                    <img
                      src={image.public_url}
                      alt={`Ảnh minh chứng cho đơn ${complaint.order?.ma_don ?? complaint.order_id}`}
                      className="h-36 w-36 rounded-xl border border-slate-200 object-cover"
                      loading="lazy"
                    />
                    <span className="mt-1 block text-xs font-medium text-green-800">
                      Bấm để phóng to ảnh
                    </span>
                  </button>
                )}

                {complaint.phan_hoi && (
                  <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                    Phản hồi: {complaint.phan_hoi}
                  </p>
                )}

                {isPending && user?.role === 'sales' && (
                  <div className="mt-5 border-t border-slate-100 pt-4">
                    <label className="block text-sm font-medium text-slate-700">
                      Phương án xử lý
                      <select
                        required
                        value={resolutions[complaint.id] ?? ''}
                        onChange={(event) => setResolutions((current) => ({
                          ...current,
                          [complaint.id]: event.target.value,
                        }))}
                        className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 sm:max-w-sm"
                      >
                        <option value="">Chọn phương án</option>
                        {RESOLUTION_OPTIONS.map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </label>
                    <label className="block text-sm font-medium text-slate-700">
                      Phản hồi khách hàng (bắt buộc)
                      <textarea
                        rows={3}
                        maxLength={2000}
                        value={responses[complaint.id] ?? ''}
                        onChange={(event) =>
                          setResponses((current) => ({
                            ...current,
                            [complaint.id]: event.target.value,
                          }))
                        }
                        className="mt-2 w-full rounded-lg border border-slate-300 p-3"
                      />
                    </label>
                    <p className="mt-2 text-xs text-slate-600">
                      Phương án được lưu vào trạng thái khiếu nại; giao dịch hoàn tiền thực tế cần được thực hiện theo quy trình thanh toán riêng.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-3">
                      <Button
                        onClick={() => resolveComplaint(complaint)}
                        disabled={isUpdating}
                      >
                        {isUpdating ? <LoadingSpinner label="Đang xử lý" className="mr-2" /> : null}
                        Lưu phương án xử lý
                      </Button>
                    </div>
                  </div>
                )}
              </article>
            )
          })}
          {hasMore && (
            <div className="text-center">
              <Button
                variant="secondary"
                onClick={() => loadComplaints(page + 1, true)}
                disabled={isLoadingMore}
              >
                {isLoadingMore && <LoadingSpinner label="Đang tải thêm" className="mr-2" />}
                {isLoadingMore ? 'Đang tải...' : 'Tải thêm khiếu nại'}
              </Button>
            </div>
          )}
        </div>
      )}

      {selectedImage && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Ảnh minh chứng khiếu nại"
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button
            type="button"
            className="absolute right-4 top-4 rounded-full bg-white px-4 py-2 font-semibold text-slate-900"
            onClick={() => setSelectedImage(null)}
          >
            Đóng
          </button>
          <img
            src={selectedImage}
            alt="Ảnh minh chứng được phóng to"
            className="max-h-[90vh] max-w-full rounded-xl object-contain"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}
    </section>
  )
}

export default StaffComplaintsPage
