import { useCallback, useEffect, useState } from 'react'
import adminApi from '../../api/adminApi.js'
import Button from '../../components/Button.jsx'
import LoadingSpinner from '../../components/LoadingSpinner.jsx'
import ToastNotification from '../../components/ToastNotification.jsx'
import useAuth from '../../contexts/useAuth.js'

const roleLabels = {
  customer: 'Khách hàng',
  farm_staff: 'Nhân viên nông trại',
  sales: 'Nhân viên bán hàng',
  admin: 'Quản trị viên',
}

function AdminUsersPage() {
  const { user } = useAuth()
  const [users, setUsers] = useState([])
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [query, setQuery] = useState({})
  const [isLoading, setIsLoading] = useState(true)
  const [busyUserId, setBusyUserId] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [toast, setToast] = useState(null)

  const loadUsers = useCallback(async (pageNumber = 1, filters = query) => {
    setIsLoading(true)
    setErrorMessage('')
    try {
      const response = await adminApi.getUsers({ ...filters, page: pageNumber })
      setUsers(response.data.data)
      setPage(response.data.current_page)
      setLastPage(response.data.last_page)
    } catch (error) {
      setErrorMessage(error.response?.data?.message ?? 'Không tải được danh sách tài khoản.')
    } finally {
      setIsLoading(false)
    }
  }, [query])

  useEffect(() => {
    let active = true
    async function initialLoad() {
      try {
        const response = await adminApi.getUsers({ page: 1 })
        if (!active) return
        setUsers(response.data.data)
        setPage(response.data.current_page)
        setLastPage(response.data.last_page)
      } catch (error) {
        if (active) {
          setErrorMessage(error.response?.data?.message ?? 'Không tải được danh sách tài khoản.')
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
    const filters = {
      ...(search.trim() ? { search: search.trim() } : {}),
      ...(role ? { role } : {}),
      ...(statusFilter !== '' ? { is_active: statusFilter } : {}),
    }
    setQuery(filters)
    loadUsers(1, filters)
  }

  async function toggleUser(userRecord) {
    const nextStatus = !userRecord.is_active
    setBusyUserId(userRecord.id)
    try {
      const response = await adminApi.updateUserStatus(userRecord.id, nextStatus)
      setUsers((current) =>
        current.map((item) => item.id === userRecord.id ? response.data.data : item),
      )
      setToast({
        message: nextStatus ? 'Đã mở khóa tài khoản.' : 'Đã khóa tài khoản.',
        type: 'success',
      })
    } catch (error) {
      setToast({
        message:
          error.response?.data?.errors?.is_active?.[0] ??
          error.response?.data?.message ??
          'Không cập nhật được trạng thái tài khoản.',
        type: 'error',
      })
    } finally {
      setBusyUserId(null)
    }
  }

  return (
    <section>
      {toast && <ToastNotification message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <header className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-green-700">Quản trị hệ thống</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">Quản lý tài khoản</h1>
      </header>

      <form onSubmit={applyFilters} className="mb-5 grid gap-3 rounded-2xl bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-[minmax(12rem,1fr)_12rem_12rem_auto]">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Tìm tên hoặc email"
          aria-label="Tìm tên hoặc email"
          className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm"
        />
        <select value={role} onChange={(event) => setRole(event.target.value)} aria-label="Lọc vai trò" className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm">
          <option value="">Tất cả vai trò</option>
          {Object.entries(roleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Lọc trạng thái" className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm">
          <option value="">Mọi trạng thái</option>
          <option value="1">Đang hoạt động</option>
          <option value="0">Đã khóa</option>
        </select>
        <Button type="submit">Lọc tài khoản</Button>
      </form>

      {errorMessage && <p className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-800" role="alert">{errorMessage}</p>}
      {isLoading ? (
        <div className="flex min-h-48 items-center justify-center"><LoadingSpinner label="Đang tải tài khoản" className="text-green-700" /></div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
            <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Tài khoản</th>
                  <th className="px-4 py-3">Vai trò</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((record) => (
                  <tr key={record.id}>
                    <td className="px-4 py-4">
                      <p className="font-semibold text-slate-900">{record.ho_ten}</p>
                      <p className="mt-1 text-slate-500">{record.email}</p>
                      {record.so_dien_thoai && <p className="mt-1 text-xs text-slate-500">{record.so_dien_thoai}</p>}
                    </td>
                    <td className="px-4 py-4 text-slate-700">{roleLabels[record.role?.ten_vai_tro] ?? record.role?.ten_vai_tro}</td>
                    <td className="px-4 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${record.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {record.is_active ? 'Đang hoạt động' : 'Đã khóa'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <Button
                        variant={record.is_active ? 'secondary' : 'primary'}
                        disabled={busyUserId !== null || (record.id === user?.id && record.is_active)}
                        onClick={() => toggleUser(record)}
                      >
                        {busyUserId === record.id ? (
                          <><LoadingSpinner label="Đang cập nhật" className="mr-2" />Đang cập nhật...</>
                        ) : record.is_active ? 'Khóa' : 'Mở khóa'}
                      </Button>
                      {record.id === user?.id && <p className="mt-1 text-xs text-slate-500">Không thể tự khóa</p>}
                    </td>
                  </tr>
                ))}
                {users.length === 0 && <tr><td colSpan="4" className="px-4 py-8 text-center text-slate-500">Không tìm thấy tài khoản phù hợp.</td></tr>}
              </tbody>
            </table>
          </div>
          {lastPage > 1 && (
            <div className="mt-4 flex items-center justify-center gap-4">
              <Button variant="secondary" disabled={page <= 1 || isLoading} onClick={() => loadUsers(page - 1)}>
                Trang trước
              </Button>
              <span className="text-sm text-slate-600">Trang {page} / {lastPage}</span>
              <Button variant="secondary" disabled={page >= lastPage || isLoading} onClick={() => loadUsers(page + 1)}>
                Trang sau
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  )
}

export default AdminUsersPage
