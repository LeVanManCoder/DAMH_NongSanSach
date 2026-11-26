import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import complaintApi from '../../api/complaintApi.js'
import Button from '../../components/Button.jsx'
import LoadingSpinner from '../../components/LoadingSpinner.jsx'
import ToastNotification from '../../components/ToastNotification.jsx'
import useAuth from '../../contexts/useAuth.js'

const COMPLAINT_STATUSES = {
  cho_xu_ly: 'Chờ xử lý',
  chap_nhan: 'Đã chấp nhận',
  hoan_tien: 'Hoàn tiền',
  giao_bu: 'Giao bù',
  tu_choi: 'Đã từ chối',
}

function StaffComplaintsPage() {
  const { user } = useAuth()
  const [complaints, setComplaints] = useState([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [updatingId, setUpdatingId] = useState(null)
  const [responses, setResponses] = useState({})
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

  async function resolveComplaint(complaint, status) {
    const responseNote = responses[complaint.id]?.trim()
    if (!responseNote) {
      setToast({ message: 'Vui lòng nhập ghi chú phản hồi cho khách hàng.', type: 'error' })
      return
    }

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
        message: status === 'chap_nhan'
          ? 'Đã chấp nhận khiếu nại.'
          : 'Đã từ chối khiếu nại.',
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
      <header className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-green-700">
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
        <div className="flex min-h-48 items-center justify-center">
          <LoadingSpinner label="Đang tải khiếu nại" className="text-green-700" />
        </div>
      ) : complaints.length === 0 ? (
        <div className="rounded-2xl bg-white p-8 text-center text-slate-600 shadow-sm">
          Chưa có khiếu nại nào.
        </div>
      ) : (
        <div className="space-y-5">
          {complaints.map((complaint) => {
            const image = complaint.media?.find((media) => media.loai === 'anh')
            const isPending = complaint.trang_thai === 'cho_xu_ly'
            const isUpdating = updatingId === complaint.id

            return (
              <article key={complaint.id} className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
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
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-900">
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
                      Ghi chú phản hồi khách hàng (bắt buộc)
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
                    <div className="mt-3 flex flex-wrap gap-3">
                      <Button
                        onClick={() => resolveComplaint(complaint, 'chap_nhan')}
                        disabled={isUpdating}
                      >
                        {isUpdating ? <LoadingSpinner label="Đang xử lý" className="mr-2" /> : null}
                        Chấp nhận khiếu nại
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => resolveComplaint(complaint, 'tu_choi')}
                        disabled={isUpdating}
                      >
                        Từ chối
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
