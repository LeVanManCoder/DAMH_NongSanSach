import { useCallback, useEffect, useState } from 'react'
import adminApi from '../../api/adminApi.js'
import Button from '../../components/Button.jsx'
import LoadingSpinner from '../../components/LoadingSpinner.jsx'

function AdminAuditLogsPage() {
  const [logs, setLogs] = useState([])
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [action, setAction] = useState('')
  const [tableName, setTableName] = useState('')
  const [filters, setFilters] = useState({})
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  const loadLogs = useCallback(async (pageNumber = 1, activeFilters = filters) => {
    setIsLoading(true)
    setErrorMessage('')
    try {
      const response = await adminApi.getAuditLogs({
        ...activeFilters,
        page: pageNumber,
      })
      setLogs(response.data.data)
      setPage(response.data.current_page)
      setLastPage(response.data.last_page)
    } catch (error) {
      setErrorMessage(error.response?.data?.message ?? 'Không tải được nhật ký hệ thống.')
    } finally {
      setIsLoading(false)
    }
  }, [filters])

  useEffect(() => {
    let active = true
    async function initialLoad() {
      try {
        const response = await adminApi.getAuditLogs({ page: 1 })
        if (!active) return
        setLogs(response.data.data)
        setPage(response.data.current_page)
        setLastPage(response.data.last_page)
      } catch (error) {
        if (active) {
          setErrorMessage(error.response?.data?.message ?? 'Không tải được nhật ký hệ thống.')
        }
      } finally {
        if (active) setIsLoading(false)
      }
    }

    initialLoad()
    return () => {
      active = false
    }
  }, [])

  function applyFilters(event) {
    event.preventDefault()
    const nextFilters = {
      ...(action.trim() ? { hanh_dong: action.trim() } : {}),
      ...(tableName.trim() ? { doi_tuong: tableName.trim() } : {}),
    }
    setFilters(nextFilters)
    loadLogs(1, nextFilters)
  }

  return (
    <section>
      <header className="page-heading mb-6 py-1">
        <p className="section-kicker">Kiểm soát hoạt động</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">Nhật ký hệ thống</h1>
        <p className="mt-2 text-sm text-slate-600">Tra cứu thao tác, đối tượng dữ liệu và người thực hiện.</p>
      </header>

      <form onSubmit={applyFilters} className="filter-panel mb-5 grid gap-3 rounded-2xl bg-white p-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto]">
        <input
          value={action}
          onChange={(event) => setAction(event.target.value)}
          placeholder="Lọc hành động (vd: khoa_tai_khoan)"
          aria-label="Lọc hành động"
          maxLength={50}
          className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm"
        />
        <input
          value={tableName}
          onChange={(event) => setTableName(event.target.value)}
          placeholder="Lọc bảng dữ liệu (vd: users)"
          aria-label="Lọc bảng dữ liệu"
          maxLength={50}
          className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm"
        />
        <Button type="submit">Tìm nhật ký</Button>
      </form>

      {errorMessage && <p className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-800" role="alert">{errorMessage}</p>}
      {isLoading ? (
        <div className="flex min-h-48 items-center justify-center"><LoadingSpinner label="Đang tải nhật ký" className="text-green-700" /></div>
      ) : (
        <>
          <div className="dashboard-panel overflow-x-auto rounded-2xl bg-white">
            <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Thời gian</th>
                  <th className="px-4 py-3">Người thao tác</th>
                  <th className="px-4 py-3">Hành động</th>
                  <th className="px-4 py-3">Bảng / ID</th>
                  <th className="px-4 py-3">Thay đổi</th>
                  <th className="px-4 py-3">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log.id} className="align-top">
                    <td className="whitespace-nowrap px-4 py-4 text-slate-600">
                      {log.created_at ? new Date(log.created_at).toLocaleString('vi-VN') : '—'}
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-medium text-slate-800">{log.user?.ho_ten ?? 'Tài khoản đã xóa'}</p>
                      {log.user?.email && <p className="mt-1 text-xs text-slate-500">{log.user.email}</p>}
                    </td>
                    <td className="px-4 py-4 font-semibold text-slate-800">{log.hanh_dong}</td>
                    <td className="px-4 py-4 text-slate-600">{log.doi_tuong} / {log.doi_tuong_id ?? '—'}</td>
                    <td className="max-w-sm px-4 py-4 text-xs text-slate-600">
                      {log.du_lieu_cu || log.du_lieu_moi ? (
                        <pre className="whitespace-pre-wrap break-words">{JSON.stringify({ cu: log.du_lieu_cu, moi: log.du_lieu_moi }, null, 2)}</pre>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-4 text-slate-500">{log.dia_chi_ip ?? '—'}</td>
                  </tr>
                ))}
                {logs.length === 0 && <tr><td colSpan="6" className="px-4 py-8 text-center text-slate-500">Chưa có nhật ký phù hợp với bộ lọc.</td></tr>}
              </tbody>
            </table>
          </div>
          {lastPage > 1 && (
            <div className="mt-4 flex items-center justify-center gap-4">
              <Button variant="secondary" disabled={page <= 1 || isLoading} onClick={() => loadLogs(page - 1)}>Trang trước</Button>
              <span className="text-sm text-slate-600">Trang {page} / {lastPage}</span>
              <Button variant="secondary" disabled={page >= lastPage || isLoading} onClick={() => loadLogs(page + 1)}>Trang sau</Button>
            </div>
          )}
        </>
      )}
    </section>
  )
}

export default AdminAuditLogsPage
