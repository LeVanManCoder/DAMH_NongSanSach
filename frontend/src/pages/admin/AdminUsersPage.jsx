import { useCallback, useEffect, useState } from 'react'
import { CircleCheck, LockKeyhole } from 'lucide-react'
import adminApi from '../../api/adminApi.js'
import Button from '../../components/Button.jsx'
import LoadingSpinner from '../../components/LoadingSpinner.jsx'
import { TableSkeleton } from '../../components/Skeletons.jsx'
import ToastNotification from '../../components/ToastNotification.jsx'
import useConfirm from '../../components/useConfirm.js'
import useAuth from '../../contexts/useAuth.js'

const roleLabels = {
  customer: 'Khách hàng',
  farm_staff: 'Nhân viên nông trại',
  sales: 'Nhân viên bán hàng',
  admin: 'Quản trị viên',
}

function AdminUsersPage() {
  const { user } = useAuth()
  const confirm = useConfirm()
  const [users, setUsers] = useState([])
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [query, setQuery] = useState({})
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false)
  const [isCreatingStaff, setIsCreatingStaff] = useState(false)
  const [staffForm, setStaffForm] = useState({
    ho_ten: '',
    email: '',
    so_dien_thoai: '',
    role: 'farm_staff',
    password: '',
    password_confirmation: '',
  })
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
    const confirmed = await confirm({
      title: nextStatus ? 'Mở khóa tài khoản?' : 'Khóa tài khoản?',
      description: nextStatus
        ? `Tài khoản ${userRecord.email} sẽ có thể đăng nhập trở lại.`
        : `Tài khoản ${userRecord.email} sẽ không thể đăng nhập cho đến khi được mở khóa.`,
      confirmLabel: nextStatus ? 'Mở khóa' : 'Khóa tài khoản',
    })
    if (!confirmed) return
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

  async function createStaffUser(event) {
    event.preventDefault()
    setIsCreatingStaff(true)
    try {
      await adminApi.createStaffUser(staffForm)
      setStaffForm({
        ho_ten: '',
        email: '',
        so_dien_thoai: '',
        role: 'farm_staff',
        password: '',
        password_confirmation: '',
      })
      setIsCreateFormOpen(false)
      setSearch('')
      setRole('')
      setStatusFilter('')
      setQuery({})
      setToast({ message: 'Đã tạo tài khoản nhân viên.', type: 'success' })
      await loadUsers(1, {})
    } catch (error) {
      const validationMessage = Object.values(error.response?.data?.errors ?? {})
        .flat()
        .find(Boolean)
      setToast({
        message: validationMessage ?? error.response?.data?.message ?? 'Không tạo được tài khoản nhân viên.',
        type: 'error',
      })
    } finally {
      setIsCreatingStaff(false)
    }
  }

  return (
    <section>
      {toast && <ToastNotification message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <header className="page-heading mb-6 flex flex-wrap items-end justify-between gap-4 py-1">
        <div>
          <p className="section-kicker">Quản trị hệ thống</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">Quản lý tài khoản</h1>
        </div>
        <Button onClick={() => setIsCreateFormOpen((current) => !current)}>
          {isCreateFormOpen ? 'Đóng biểu mẫu' : 'Tạo nhân viên mới'}
        </Button>
      </header>

      {isCreateFormOpen && (
        <form onSubmit={createStaffUser} className="mb-5 grid gap-4 rounded-2xl bg-white p-5 shadow-sm sm:grid-cols-2 xl:grid-cols-3">
          <h2 className="text-lg font-bold text-slate-900 sm:col-span-2 xl:col-span-3">Thông tin tài khoản nhân viên</h2>
          <label className="text-sm font-medium text-slate-700">
            Họ và tên
            <input
              required
              maxLength={100}
              autoComplete="name"
              value={staffForm.ho_ten}
              onChange={(event) => setStaffForm((current) => ({ ...current, ho_ten: event.target.value }))}
              className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3"
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Email
            <input
              required
              type="email"
              maxLength={150}
              autoComplete="email"
              value={staffForm.email}
              onChange={(event) => setStaffForm((current) => ({ ...current, email: event.target.value }))}
              className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3"
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Số điện thoại (không bắt buộc)
            <input
              type="tel"
              maxLength={15}
              autoComplete="tel"
              value={staffForm.so_dien_thoai}
              onChange={(event) => setStaffForm((current) => ({ ...current, so_dien_thoai: event.target.value }))}
              className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3"
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Vai trò nhân viên
            <select
              value={staffForm.role}
              onChange={(event) => setStaffForm((current) => ({ ...current, role: event.target.value }))}
              className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3"
            >
              <option value="farm_staff">Nhân viên nông trại</option>
              <option value="sales">Nhân viên bán hàng</option>
            </select>
          </label>
          <label className="text-sm font-medium text-slate-700">
            Mật khẩu (ít nhất 8 ký tự, có hoa, thường và số)
            <input
              required
              type="password"
              minLength={8}
              autoComplete="new-password"
              value={staffForm.password}
              onChange={(event) => setStaffForm((current) => ({ ...current, password: event.target.value }))}
              className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3"
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Nhập lại mật khẩu
            <input
              required
              type="password"
              minLength={8}
              autoComplete="new-password"
              value={staffForm.password_confirmation}
              onChange={(event) => setStaffForm((current) => ({ ...current, password_confirmation: event.target.value }))}
              className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3"
            />
          </label>
          <div className="flex flex-wrap gap-3 sm:col-span-2 xl:col-span-3">
            <Button type="submit" disabled={isCreatingStaff}>
              {isCreatingStaff ? 'Đang tạo...' : 'Tạo tài khoản'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsCreateFormOpen(false)}
              disabled={isCreatingStaff}
            >
              Hủy
            </Button>
          </div>
        </form>
      )}

      <form onSubmit={applyFilters} className="filter-panel mb-5 grid gap-3 rounded-2xl bg-white p-4 sm:grid-cols-2 lg:grid-cols-[minmax(12rem,1fr)_12rem_12rem_auto]">
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
        <TableSkeleton columns={4} rows={6} label="Đang tải tài khoản" />
      ) : (
        <>
          <div className="dashboard-panel overflow-x-auto rounded-2xl bg-white">
            <table className="mobile-card-table min-w-full divide-y divide-slate-100 text-left text-sm">
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
                    <td data-label="Tài khoản" className="px-4 py-4">
                      <p className="font-semibold text-slate-900">{record.ho_ten}</p>
                      <p className="mt-1 text-slate-500">{record.email}</p>
                      {record.so_dien_thoai && <p className="mt-1 text-xs text-slate-500">{record.so_dien_thoai}</p>}
                    </td>
                    <td data-label="Vai trò" className="px-4 py-4 text-slate-700">{roleLabels[record.role?.ten_vai_tro] ?? record.role?.ten_vai_tro}</td>
                    <td data-label="Trạng thái" className="px-4 py-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${record.is_active ? 'bg-green-100 text-green-900' : 'bg-red-100 text-red-900'}`}>
                        {record.is_active
                          ? <CircleCheck size={14} aria-hidden="true" />
                          : <LockKeyhole size={14} aria-hidden="true" />}
                        {record.is_active ? 'Đang hoạt động' : 'Đã khóa'}
                      </span>
                    </td>
                    <td data-label="Thao tác" className="px-4 py-4">
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
                {users.length === 0 && <tr className="mobile-table-empty"><td colSpan="4" className="px-4 py-8 text-center text-slate-500">Không tìm thấy tài khoản phù hợp.</td></tr>}
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
