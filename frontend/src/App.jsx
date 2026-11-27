import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { apiRequest } from './api.js'
import './App.css'

const img = {
  hero: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80',
  vegetables: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=700&q=85',
  corn: 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&w=300&q=80',
  orange: 'https://images.unsplash.com/photo-1547514701-42782101795e?auto=format&fit=crop&w=300&q=80',
  avocado: 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?auto=format&fit=crop&w=300&q=80',
  tomato: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=300&q=80',
  cabbage: 'https://images.unsplash.com/photo-1594282486552-05b4d80fbb9f?auto=format&fit=crop&w=300&q=80',
  market: 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&w=800&q=80',
  broccoli: 'https://images.unsplash.com/photo-1459411621453-7b03977f4bfc?auto=format&fit=crop&w=300&q=80',
  mango: 'https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&w=300&q=80',
  mixedFruit: 'https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?auto=format&fit=crop&w=700&q=85',
  rice: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=400&q=85',
  asparagus: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=700&q=85',
  potato: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=500&q=85',
  pineapple: 'https://images.unsplash.com/photo-1550258987-190a2d41a8ba?auto=format&fit=crop&w=500&q=85',
  banana: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=500&q=85',
}

const roleLabels = {
  customer: 'Khách hàng',
  admin: 'Quản trị viên',
  sales: 'Nhân viên bán hàng',
  farm_staff: 'Nhân viên nông trại',
}

const formatCurrency = (value) => `${Number(value || 0).toLocaleString('vi-VN')} VND`

function getProductIcon(name) {
  const productName = String(name || '').toLocaleLowerCase('vi')
  const normalized = productName.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  if (normalized.includes('ca chua')) return '🍅'
  if (normalized.includes('ca rot')) return '🥕'
  if (normalized.includes('chuoi')) return '🍌'
  if (normalized.includes('bo sap') || normalized.includes('bo avocado')) return '🥑'
  if (normalized.includes('gao')) return '🌾'
  if (productName.includes('dứa') || normalized.includes('thom')) return '🍍'
  if (normalized.includes('dua hau')) return '🍉'
  if (normalized.includes('dua leo')) return '🥒'
  if (normalized.includes('dua mat')) return '🥥'
  if (normalized.includes('dua')) return '🥥'
  if (normalized.includes('cam') || normalized.includes('quyt')) return '🍊'
  if (normalized.includes('khoai')) return '🥔'
  if (normalized.includes('xoai')) return '🥭'
  if (normalized.includes('bong cai') || normalized.includes('broccoli')) return '🥦'
  if (normalized.includes('xa lach') || normalized.includes('rau') || normalized.includes('bap cai') || normalized.includes('cai')) return '🥬'
  if (normalized.includes('bap')) return '🌽'
  return '🌱'
}

function resolveImageUrl(path) {
  if (!path) return img.vegetables
  if (/^https?:\/\//i.test(path)) return path
  return `/storage/${String(path).replace(/^\/?storage\/?/, '')}`
}

function mapProduct(product) {
  const categoryName = product.category?.ten_danh_muc || 'Nông sản'
  const unitPrice = Number(product.gia_ban_co_ban || 0)
  return {
    id: product.id,
    slug: product.slug,
    name: product.ten_san_pham,
    description: product.mo_ta || 'Nông sản tươi ngon được tuyển chọn mỗi ngày.',
    image: resolveImageUrl(product.hinh_anh_dai_dien),
    category: categoryName,
    categoryId: product.category?.id,
    label: categoryName,
    unit: product.don_vi_tinh || 'kg',
    unitPrice,
    price: `${formatCurrency(unitPrice)}/${product.don_vi_tinh || 'kg'}`,
    batches: product.batches || [],
  }
}

function mapCartItem(item) {
  const product = item.product || {}
  const mappedProduct = mapProduct(product)
  return {
    ...mappedProduct,
    cartId: item.id,
    productId: item.product_id,
    quantity: Number(item.so_luong || 0),
  }
}

const orderStatusLabels = {
  cho_duyet: 'Chờ duyệt',
  da_thanh_toan: 'Đã thanh toán',
  da_xac_nhan: 'Đang chuẩn bị',
  dang_giao: 'Đang giao',
  da_giao: 'Đã giao',
  da_huy: 'Đã hủy',
  hoan_tien: 'Hoàn tiền',
  giao_bu: 'Giao bù',
}

const complaintReasonLabels = {
  dap_nat: 'Dập nát',
  hu_hong: 'Hư hỏng',
  thieu_hang: 'Thiếu hàng',
  sai_san_pham: 'Sai sản phẩm',
  khac: 'Khác',
}

const complaintStatusLabels = {
  cho_xu_ly: 'Chờ xử lý',
  chap_nhan: 'Đã chấp nhận đổi trả',
  hoan_tien: 'Đã hoàn tiền',
  giao_bu: 'Đã xác nhận giao bù',
  tu_choi: 'Đã từ chối yêu cầu',
}

function formatSqlDate(value) {
  if (!value) return '—'
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`)
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString('vi-VN')
}

function formatSqlDateTime(value) {
  if (!value) return '—'
  const date = new Date(String(value).replace(' ', 'T'))
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString('vi-VN')
}

function mapStaffInventoryLot(item) {
  const quantityValue = Number(item.quantity || 0)
  const daysToExpiry = item.days_to_expiry === null ? null : Number(item.days_to_expiry)
  const status = item.batch_status === 'het_han' || (daysToExpiry !== null && daysToExpiry < 0)
    ? 'Cần kiểm tra'
    : quantityValue <= 0 || item.batch_status === 'het_hang'
      ? 'Hết hàng'
      : daysToExpiry !== null && daysToExpiry <= 3
        ? 'Sắp hết hạn'
        : 'Còn hàng'
  const expiry = daysToExpiry === null
    ? 'Chưa có hạn'
    : daysToExpiry < 0
      ? `Quá hạn ${Math.abs(daysToExpiry)} ngày`
      : daysToExpiry === 0
        ? 'Hết hạn hôm nay'
        : `Còn ${daysToExpiry} ngày`

  return {
    lot: item.lot,
    name: item.product_name,
    farm: item.farm || 'Chưa phân công',
    quantityValue,
    unit: item.unit || 'kg',
    quantity: formatLotQuantity(quantityValue, item.unit || 'kg'),
    expiry,
    status,
    date: formatSqlDate(item.harvested_at),
  }
}

function lotQuantityValue(item) {
  if (Number.isFinite(Number(item.quantityValue))) return Number(item.quantityValue)
  const match = String(item.quantity || '').match(/-?\d+(?:[.,]\d+)?/)
  return match ? Number(match[0].replace(',', '.')) : 0
}

function formatLotQuantity(value, unit = 'kg') {
  return `${Number(value).toLocaleString('vi-VN', { maximumFractionDigits: 2 })} ${unit}`
}

function mapStaffOrder(item) {
  return {
    id: item.id,
    code: `#${item.code}`,
    trackingCode: 'Chưa có mã vận đơn',
    customer: item.customer,
    items: item.items || 'Không có chi tiết sản phẩm',
    total: `${Number(item.total || 0).toLocaleString('vi-VN')} đ`,
    status: orderStatusLabels[item.status] || item.status,
    address: item.address,
    carrier: 'Chưa cập nhật',
  }
}

function mapStaffComplaint(item) {
  return {
    code: `KN-${String(item.id).padStart(3, '0')}`,
    customer: item.customer,
    details: item.details || complaintReasonLabels[item.reason] || item.reason,
    order: item.order_code,
    status: complaintStatusLabels[item.status] || item.status,
  }
}

function mapFarmSeason(item) {
  const startsAt = new Date(`${item.starts_at}T00:00:00`)
  const expectedEnd = item.expected_end ? new Date(`${item.expected_end}T00:00:00`) : null
  const duration = expectedEnd ? expectedEnd.getTime() - startsAt.getTime() : 0
  const elapsed = Date.now() - startsAt.getTime()
  const progress = item.status === 'da_thu_hoach' || item.status === 'ket_thuc'
    ? 100
    : duration > 0
      ? Math.min(99, Math.max(0, Math.round((elapsed / duration) * 100)))
      : 0

  return {
    id: item.id,
    lot: String(item.id),
    name: item.name,
    location: item.location || 'Chưa phân công',
    status: item.status === 'da_thu_hoach' ? 'Đã thu hoạch' : item.status === 'ket_thuc' ? 'Đã kết thúc' : 'Đang canh tác',
    progress,
  }
}

function mapFarmingLog(item) {
  const activities = {
    gieo_hat: 'Gieo hạt',
    bon_phan: 'Bón phân',
    tuoi_nuoc: 'Tưới nước',
    phun_thuoc: 'Phun thuốc',
    cham_soc: 'Chăm sóc',
    thu_hoach: 'Thu hoạch',
    khac: 'Hoạt động khác',
  }
  return {
    id: item.id,
    date: formatSqlDateTime(item.occurred_at),
    lot: item.lot,
    activity: activities[item.activity] || item.activity,
    note: item.note || '',
  }
}

function mapWasteLog(item) {
  const quantity = Number(item.quantity || 0)
  return {
    type: 'Ghi nhận hao hụt',
    lot: item.lot,
    name: item.product_name,
    amount: `-${quantity.toLocaleString('vi-VN', { maximumFractionDigits: 2 })} ${item.unit || 'kg'}`,
    reason: item.reason,
    time: formatSqlDateTime(item.occurred_at),
  }
}

const stories = [
  {
    title: 'Rau Củ Tươi Sạch',
    category: 'Rau củ',
    description: 'Vườn rau sạch là nơi giúp lòng người dịu lại sau những bộn bề cuộc sống thường ngày.',
    image: img.vegetables,
    alt: 'Quầy rau củ tươi tại chợ',
  },
  {
    title: 'Trái Cây Ngon Ngọt',
    category: 'Trái cây',
    description: 'Ăn trái cây mỗi ngày là cách yêu thương bản thân đơn giản nhất.',
    image: img.mixedFruit,
    alt: 'Các loại trái cây tươi ngon',
  },
  {
    title: 'Tinh Hoa Nông Sản Việt',
    category: 'Tất cả',
    description: 'Nông nghiệp là nghề lành mạnh nhất, hữu ích nhất và cao quý nhất của con người.',
    image: img.market,
    alt: 'Nông sản tươi bày bán tại chợ',
  },
]

const farmLocations = [
  { name: 'Nông trại Đà Lạt', region: 'Đà Lạt · Lâm Đồng', address: 'Khu vực nông nghiệp Đà Lạt, Lâm Đồng', hours: '07:00–17:00', phone: '090 123 4567' },
  { name: 'Nông trại Củ Chi', region: 'Củ Chi · TP. Hồ Chí Minh', address: 'Khu vực nông nghiệp Củ Chi, TP. Hồ Chí Minh', hours: '07:00–17:00', phone: '090 123 4567' },
  { name: 'Nông trại Tiền Giang', region: 'Mỹ Tho · Tiền Giang', address: 'Khu vực vườn cây ăn trái, Tiền Giang', hours: '07:00–17:00', phone: '090 123 4567' },
  { name: 'Nông trại Cần Thơ', region: 'Cái Răng · Cần Thơ', address: 'Khu vực nông nghiệp Cần Thơ', hours: '07:00–17:00', phone: '090 123 4567' },
]

function App() {
  const [authView, setAuthView] = useState(null)
  const [authRole, setAuthRole] = useState(() => localStorage.getItem('authRole') || 'Khách hàng')
  const [authError, setAuthError] = useState('')
  const [authSubmitting, setAuthSubmitting] = useState(false)
  const [recoveryEmail, setRecoveryEmail] = useState('')
  const [recoveryToken, setRecoveryToken] = useState('')
  const [recoveryMessage, setRecoveryMessage] = useState('')
  const [apiMessage, setApiMessage] = useState('')
  const [adminSection, setAdminSection] = useState('Báo cáo thống kê')
  const [inventorySearch, setInventorySearch] = useState('')
  const [warehouseSearch, setWarehouseSearch] = useState('')
  const [warehouseFilter, setWarehouseFilter] = useState('Tất cả')
  const [warehouseFormOpen, setWarehouseFormOpen] = useState(false)
  const [warehouseExport, setWarehouseExport] = useState(null)
  const [warehouseImport, setWarehouseImport] = useState(null)
  const [warehouseDetail, setWarehouseDetail] = useState(null)
  const [writeOffOpen, setWriteOffOpen] = useState(false)
  const [writeOffProof, setWriteOffProof] = useState('')
  const [writeOffPreview, setWriteOffPreview] = useState('')
  const [warehouseHistory, setWarehouseHistory] = useState([])
  const [warehouseLots, setWarehouseLots] = useState([])
  const [staffSearch, setStaffSearch] = useState('')
  const [staffList, setStaffList] = useState([])
  const [alertList, setAlertList] = useState([])
  const [systemTheme, setSystemTheme] = useState(() => localStorage.getItem('adminTheme') || 'Sáng')
  const [systemColor, setSystemColor] = useState(() => localStorage.getItem('adminColor') || 'Xanh lá')
  const [adminUserMenuOpen, setAdminUserMenuOpen] = useState(false)
  const [salesSearch, setSalesSearch] = useState('')
  const [salesFilter, setSalesFilter] = useState('Tất cả')
  const [salesProfileOpen, setSalesProfileOpen] = useState(false)
  const [shippingSearch, setShippingSearch] = useState('')
  const [shippingStatusFilter, setShippingStatusFilter] = useState('Tất cả')
  const [expandedShipment, setExpandedShipment] = useState('')
  const [salesOrders, setSalesOrders] = useState([])
  const [salesReturnRequests, setSalesReturnRequests] = useState([])
  const [farmSection, setFarmSection] = useState('Tổng quan')
  const [farmLotCode, setFarmLotCode] = useState('')
  const [farmLookupLot, setFarmLookupLot] = useState(null)
  const [farmLookupSearched, setFarmLookupSearched] = useState(false)
  const [farmScannerOpen, setFarmScannerOpen] = useState(false)
  const [farmCameraPermissionConfirmed, setFarmCameraPermissionConfirmed] = useState(false)
  const [farmCameraPermissionDenied, setFarmCameraPermissionDenied] = useState(false)
  const [farmScannerMessage, setFarmScannerMessage] = useState('')
  const [farmCameraReady, setFarmCameraReady] = useState(false)
  const [farmSampleLot, setFarmSampleLot] = useState('')
  const [farmSampleQr, setFarmSampleQr] = useState('')
  const [farmQrError, setFarmQrError] = useState('')
  const [farmHarvestMessage, setFarmHarvestMessage] = useState('')
  const [farmLossFormLot, setFarmLossFormLot] = useState('')
  const [farmLossMessage, setFarmLossMessage] = useState('')
  const [farmSeasons, setFarmSeasons] = useState([])
  const [farmJournal, setFarmJournal] = useState([])
  const [farmJournalFormOpen, setFarmJournalFormOpen] = useState(false)
  const [farmUserMenuOpen, setFarmUserMenuOpen] = useState(false)
  const farmVideoRef = useRef(null)
  const farmCameraReadyRef = useRef(false)
  const [exportVoucherOpen, setExportVoucherOpen] = useState(false)
  const [exportVoucherSearch, setExportVoucherSearch] = useState('')
  const [exportVoucherRecords, setExportVoucherRecords] = useState([])
  const [writeOffSearch, setWriteOffSearch] = useState('')
  const [writeOffRecords, setWriteOffRecords] = useState([])
  const [staffDashboardLoading, setStaffDashboardLoading] = useState(false)
  const [staffDashboardError, setStaffDashboardError] = useState('')
  const [staffSummary, setStaffSummary] = useState(null)
  const [staffMonthlyRevenue, setStaffMonthlyRevenue] = useState([])
  const [loggedUser, setLoggedUser] = useState(() => localStorage.getItem('access_token') ? localStorage.getItem('loggedUser') || '' : '')
  const [loggedIdentity, setLoggedIdentity] = useState(() => localStorage.getItem('access_token') ? localStorage.getItem('loggedIdentity') || '' : '')
  const [isAuthenticated, setIsAuthenticated] = useState(() => Boolean(localStorage.getItem('access_token')))
  const [pendingCartProduct, setPendingCartProduct] = useState(null)
  const [pendingPurchase, setPendingPurchase] = useState(false)
  const [currentPage, setCurrentPage] = useState('home')
  const [selectedCategory, setSelectedCategory] = useState('Tất cả')
  const [productSearch, setProductSearch] = useState('')
  const [catalogProducts, setCatalogProducts] = useState([])
  const [catalogCategories, setCatalogCategories] = useState([])
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [cartItems, setCartItems] = useState([])
  const [orderMessage, setOrderMessage] = useState('')
  const [shippingQuote, setShippingQuote] = useState(null)
  const [shippingQuoteLoading, setShippingQuoteLoading] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [couponInput, setCouponInput] = useState('')
  const [couponDiscount, setCouponDiscount] = useState(0)
  const [couponMessage, setCouponMessage] = useState('')
  const [checkoutSubmitting, setCheckoutSubmitting] = useState(false)
  const [checkoutComplete, setCheckoutComplete] = useState(false)
  const [completedCartItems, setCompletedCartItems] = useState([])
  const [createdOrder, setCreatedOrder] = useState(null)
  const [paymentInfo, setPaymentInfo] = useState(null)
  const [paymentQrImage, setPaymentQrImage] = useState('')
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [qrPaymentOpen, setQrPaymentOpen] = useState(false)
  const [savedDeliveryInfo, setSavedDeliveryInfo] = useState(() => {
    const savedInfo = localStorage.getItem('checkoutDeliveryInfo')
    return savedInfo ? JSON.parse(savedInfo) : {}
  })
  const [deliveryInfoSaved, setDeliveryInfoSaved] = useState(() => Boolean(localStorage.getItem('checkoutDeliveryInfo')))
  const [deliveryInfoMessage, setDeliveryInfoMessage] = useState('')
  const [selectedFarm, setSelectedFarm] = useState('')
  const [showContactForm, setShowContactForm] = useState(false)
  const [contactSubmitted, setContactSubmitted] = useState(false)
  const contactFormRef = useRef(null)

  const refreshCart = async () => {
    const response = await apiRequest('/cart')
    const items = (response.data || []).map(mapCartItem)
    setCartItems(items)
    return items
  }

  useEffect(() => {
    let cancelled = false
    apiRequest('/products?per_page=100')
      .then((response) => {
        if (!cancelled) setCatalogProducts((response.data || []).map(mapProduct))
      })
      .catch((error) => {
        if (!cancelled) setApiMessage(`Không tải được sản phẩm: ${error.message}`)
      })
      .finally(() => {
        if (!cancelled) setCatalogLoading(false)
      })
    apiRequest('/categories')
      .then((response) => {
        if (!cancelled) {
          setCatalogCategories((response.data || []).map((category) => ({
            id: category.id,
            name: category.ten_danh_muc,
          })))
        }
      })
      .catch((error) => {
        if (!cancelled) setApiMessage(`Không tải được danh mục: ${error.message}`)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) return undefined

    let cancelled = false
    apiRequest('/auth/me')
      .then((response) => {
        if (cancelled) return
        const user = response.data
        const role = roleLabels[user.role] || 'Khách hàng'
        setLoggedUser(user.ho_ten)
        setLoggedIdentity(user.email)
        setAuthRole(role)
        localStorage.setItem('loggedUser', user.ho_ten)
        localStorage.setItem('loggedIdentity', user.email)
        localStorage.setItem('authRole', role)
        setIsAuthenticated(true)
      })
      .catch((error) => {
        if (cancelled) return
        if (error.status === 401) {
          localStorage.removeItem('access_token')
          localStorage.removeItem('loggedUser')
          localStorage.removeItem('loggedIdentity')
          localStorage.removeItem('authRole')
          setLoggedUser('')
          setLoggedIdentity('')
          setIsAuthenticated(false)
        }
        setApiMessage(`Không thể khôi phục phiên đăng nhập: ${error.message}`)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!isAuthenticated || authRole !== 'Khách hàng') {
      setCartItems([])
      return
    }
    refreshCart().catch((error) => setApiMessage(`Không tải được giỏ hàng: ${error.message}`))
  }, [isAuthenticated, authRole])

  useEffect(() => {
    if (!isAuthenticated || authRole === 'Khách hàng') {
      setWarehouseLots([])
      setWarehouseHistory([])
      setWriteOffRecords([])
      setFarmSeasons([])
      setFarmJournal([])
      setSalesOrders([])
      setSalesReturnRequests([])
      setStaffList([])
      setAlertList([])
      setStaffSummary(null)
      setStaffMonthlyRevenue([])
      setStaffDashboardError('')
      return undefined
    }

    let cancelled = false
    setStaffDashboardLoading(true)
    setStaffDashboardError('')
    apiRequest('/staff/dashboard')
      .then((response) => {
        if (cancelled) return
        const data = response.data || {}
        const wasteLogs = data.waste_logs || []
        setWarehouseLots((data.inventory || []).map(mapStaffInventoryLot))
        setFarmSampleLot(data.inventory?.[0]?.lot || '')
        setWarehouseHistory(wasteLogs.map(mapWasteLog))
        setWriteOffRecords(wasteLogs.map((item) => ({
          code: `XH-${item.id}`,
          lot: item.lot,
          name: item.product_name,
          amount: `${Number(item.quantity || 0).toLocaleString('vi-VN', { maximumFractionDigits: 2 })} ${item.unit || 'kg'}`,
          reason: item.reason,
          date: formatSqlDateTime(item.occurred_at),
          status: 'Đã ghi nhận',
        })))
        setFarmSeasons((data.seasons || []).map(mapFarmSeason))
        setFarmJournal((data.farming_logs || []).map(mapFarmingLog))
        setSalesOrders((data.orders || []).map(mapStaffOrder))
        setSalesReturnRequests((data.complaints || []).map(mapStaffComplaint))
        setStaffList((data.staff || []).map((staff) => ({
          name: staff.name,
          role: roleLabels[staff.role] || staff.role,
          department: staff.role === 'sales' ? 'Kinh doanh' : staff.role === 'farm_staff' ? 'Nông trại' : 'Điều hành',
          phone: staff.phone || '—',
          status: Number(staff.is_active) === 1 ? 'Đang hoạt động' : 'Đã khóa',
        })))
        setAlertList((data.system_settings || []).map((setting) => ({
          title: setting.description || setting.setting_key,
          condition: setting.setting_key,
          threshold: setting.setting_value,
          enabled: true,
        })))
        setStaffSummary(data.summary || null)
        setStaffMonthlyRevenue((data.monthly_revenue || []).map((month) => ({
          month: month.month,
          total: Number(month.total || 0),
        })))
      })
      .catch((error) => {
        if (!cancelled) {
          setStaffDashboardError(`Không tải được dữ liệu dashboard từ SQL: ${error.message}`)
          setApiMessage(`Không tải được dữ liệu dashboard: ${error.message}`)
        }
      })
      .finally(() => {
        if (!cancelled) setStaffDashboardLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [isAuthenticated, authRole])

  useEffect(() => {
    if (!isAuthenticated) return undefined

    const params = new URLSearchParams(window.location.search)
    const paymentId = Number(params.get('vnp_TxnRef'))
    if (!Number.isSafeInteger(paymentId) || paymentId < 1) return undefined

    let cancelled = false
    const responseCode = params.get('vnp_ResponseCode')
    const cleanUrl = new URL(window.location.href)
    for (const key of [...cleanUrl.searchParams.keys()]) {
      if (key.startsWith('vnp_')) cleanUrl.searchParams.delete(key)
    }
    window.history.replaceState(
      null,
      '',
      `${cleanUrl.pathname}${cleanUrl.search}${cleanUrl.hash}`,
    )
    setCurrentPage('checkout')
    setCheckoutComplete(true)
    setPaymentMethod('card')
    setOrderMessage('Đang kiểm tra trạng thái giao dịch với máy chủ…')

    const checkPayment = async () => {
      for (let attempt = 0; attempt < 10 && !cancelled; attempt += 1) {
        try {
          const result = await apiRequest(`/payments/${paymentId}`)
          if (cancelled) return

          const { payment, order } = result.data
          setPaymentInfo({ payment })
          setCreatedOrder(order)
          setCompletedCartItems((order.details || []).map((detail) => ({
            ...mapProduct(detail.product),
            cartId: detail.id,
            productId: detail.product_id,
            quantity: Number(detail.so_luong || 0),
            unitPrice: Number(detail.don_gia || 0),
          })))

          if (payment.trang_thai === 'thanh_cong' || order.trang_thai === 'da_thanh_toan') {
            setOrderMessage('VNPAY đã xác nhận thanh toán thành công.')
            return
          }
          if (payment.trang_thai === 'that_bai' || (responseCode && responseCode !== '00')) {
            setOrderMessage('Giao dịch VNPAY chưa hoàn tất. Đơn hàng vẫn đang chờ thanh toán.')
            return
          }
          setOrderMessage('Giao dịch đang chờ VNPAY xác nhận. Trạng thái sẽ được cập nhật tự động.')
          if (attempt < 9) await new Promise((resolve) => window.setTimeout(resolve, 2000))
        } catch (error) {
          if (!cancelled) setOrderMessage(`Không kiểm tra được giao dịch: ${error.message}`)
          return
        }
      }
    }

    checkPayment()
    return () => {
      cancelled = true
    }
  }, [isAuthenticated])

  useEffect(() => {
    const handleSessionExpired = () => {
      localStorage.removeItem('loggedUser')
      localStorage.removeItem('loggedIdentity')
      localStorage.removeItem('authRole')
      setLoggedUser('')
      setLoggedIdentity('')
      setAuthRole('Khách hàng')
      setIsAuthenticated(false)
      setApiMessage('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.')
    }
    window.addEventListener('auth:session-expired', handleSessionExpired)
    return () => window.removeEventListener('auth:session-expired', handleSessionExpired)
  }, [])

  useEffect(() => {
    const fullAddress = [savedDeliveryInfo.address, savedDeliveryInfo.district, savedDeliveryInfo.city]
      .filter(Boolean)
      .join(', ')
    if (currentPage !== 'checkout' || !isAuthenticated || fullAddress.length < 5) {
      setShippingQuote(null)
      setShippingQuoteLoading(false)
      return undefined
    }

    const controller = new AbortController()
    setShippingQuoteLoading(true)
    const timeout = window.setTimeout(() => {
      apiRequest('/shipping/calculate', {
        method: 'POST',
        body: { dia_chi_giao: fullAddress },
        signal: controller.signal,
      })
        .then((response) => setShippingQuote(response.data))
        .catch((error) => {
          if (!controller.signal.aborted) {
            setShippingQuote(null)
            setApiMessage(`Không tính được phí giao hàng: ${error.message}`)
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) setShippingQuoteLoading(false)
        })
    }, 350)

    return () => {
      window.clearTimeout(timeout)
      controller.abort()
    }
  }, [currentPage, isAuthenticated, savedDeliveryInfo.address, savedDeliveryInfo.city, savedDeliveryInfo.district])

  useEffect(() => {
    if (!paymentInfo?.qr_payload) {
      setPaymentQrImage('')
      return undefined
    }

    let cancelled = false
    QRCode.toDataURL(paymentInfo.qr_payload, { width: 280, margin: 2, errorCorrectionLevel: 'Q' })
      .then((qrImage) => {
        if (!cancelled) setPaymentQrImage(qrImage)
      })
      .catch((error) => {
        if (!cancelled) setApiMessage(`Không tạo được mã QR thanh toán: ${error.message}`)
      })
    return () => {
      cancelled = true
    }
  }, [paymentInfo])

  useEffect(() => {
    if (!farmScannerOpen || !farmCameraPermissionConfirmed) return undefined

    let cancelled = false
    let scannerControls
    let cameraReadyTimeout
    let cameraFrameRequest
    const startScanner = async () => {
      if (!window.isSecureContext) {
        setFarmScannerMessage('Camera chỉ hoạt động trên HTTPS hoặc localhost. Vui lòng nhập mã lô thủ công nếu trang đang dùng HTTP.')
        return
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        setFarmScannerMessage('Camera không khả dụng trong trình duyệt này. Vui lòng nhập mã lô thủ công.')
        return
      }

      cameraReadyTimeout = window.setTimeout(() => {
        if (!cancelled && !farmCameraReadyRef.current) {
          setFarmScannerMessage('Chưa nhận được hình ảnh từ camera. Kiểm tra quyền camera hoặc nhập mã lô thủ công.')
        }
      }, 7000)

      try {
        const { BrowserQRCodeReader } = await import('@zxing/browser')
        const reader = new BrowserQRCodeReader(undefined, { delayBetweenScanAttempts: 200, delayBetweenScanSuccess: 300 })
        const handleScan = (result, error) => {
          if (cancelled) return
          if (result) {
            const scannedText = result.getText().trim()
            const scannedCode = scannedText.match(/\bLH-\d+\b/i)?.[0] || scannedText
            setFarmLotCode(scannedCode)
            setFarmLookupLot(warehouseLots.find((lot) => lot.lot.toLocaleLowerCase('vi') === scannedCode.toLocaleLowerCase('vi')) || null)
            setFarmLookupSearched(true)
            setFarmScannerOpen(false)
            setFarmCameraPermissionConfirmed(false)
          } else if (error && !String(error.name || error.constructor?.name || '').includes('NotFoundException')) {
            setFarmScannerMessage('Không đọc được mã QR. Hãy thử lại hoặc nhập mã lô thủ công.')
          }
        }
        try {
          scannerControls = await reader.decodeFromConstraints({
            video: {
              facingMode: { ideal: 'environment' },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
          }, farmVideoRef.current, handleScan)
        } catch (cameraError) {
          if (!['OverconstrainedError', 'NotFoundError'].includes(cameraError?.name)) throw cameraError
          const fallbackCamera = (await navigator.mediaDevices.enumerateDevices()).find((device) => device.kind === 'videoinput')
          if (!fallbackCamera) throw cameraError
          scannerControls = await reader.decodeFromConstraints({
            video: {
              deviceId: { exact: fallbackCamera.deviceId },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
          }, farmVideoRef.current, handleScan)
        }
        if (cancelled) {
          scannerControls.stop()
          return
        }
        if (!farmCameraReadyRef.current) {
          setFarmScannerMessage('Đang chờ hình ảnh từ camera…')
          const checkCameraFrame = () => {
            if (cancelled) return
            const video = farmVideoRef.current
            const activeVideoTrack = video?.srcObject?.getVideoTracks().some((track) => track.readyState === 'live')
            if (video && video.readyState >= 2 && video.videoWidth > 0 && activeVideoTrack) {
              farmCameraReadyRef.current = true
              setFarmCameraReady(true)
              setFarmScannerMessage('Camera đã kết nối. Đưa mã QR vào khung hình.')
              window.clearTimeout(cameraReadyTimeout)
              return
            }
            cameraFrameRequest = window.requestAnimationFrame(checkCameraFrame)
          }
          cameraFrameRequest = window.requestAnimationFrame(checkCameraFrame)
        }
      } catch (cameraError) {
        if (cancelled) return
        setFarmCameraPermissionDenied(cameraError?.name === 'NotAllowedError')
        const cameraErrorMessages = {
          NotAllowedError: 'Trình duyệt đang chặn quyền camera của trang này.',
          NotFoundError: 'Không tìm thấy camera phù hợp trên thiết bị. Vui lòng nhập mã lô thủ công.',
          NotReadableError: 'Camera đang được ứng dụng khác sử dụng. Hãy đóng ứng dụng đó rồi thử lại.',
        }
        setFarmScannerMessage(cameraErrorMessages[cameraError?.name] || 'Không thể mở camera. Hãy kiểm tra quyền truy cập hoặc nhập mã lô thủ công.')
      }
    }

    startScanner()
    return () => {
      cancelled = true
      if (cameraReadyTimeout) window.clearTimeout(cameraReadyTimeout)
      if (cameraFrameRequest) window.cancelAnimationFrame(cameraFrameRequest)
      scannerControls?.stop()
    }
  }, [farmScannerOpen, farmCameraPermissionConfirmed, warehouseLots])

  useEffect(() => {
    let cancelled = false
    setFarmSampleQr('')
    setFarmQrError('')
    if (!farmSampleLot) {
      return () => {
        cancelled = true
      }
    }
    QRCode.toDataURL(farmSampleLot, { width: 280, margin: 4, errorCorrectionLevel: 'Q', color: { dark: '#111111', light: '#ffffff' } })
      .then((qrImage) => {
        if (!cancelled) setFarmSampleQr(qrImage)
      })
      .catch(() => {
        if (!cancelled) setFarmQrError('Không tạo được mã QR. Vui lòng tải lại trang.')
      })
    return () => {
      cancelled = true
    }
  }, [farmSampleLot])

  const chooseFarm = (farmName) => {
    setSelectedFarm(farmName)
    setContactSubmitted(false)
    setShowContactForm(true)
    window.requestAnimationFrame(() => {
      contactFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
  }

  const browseCategory = (category) => {
    const categoryId = catalogCategories.find((item) => item.name === category)?.id
    setSelectedCategory(categoryId ?? 'Tất cả')
    setProductSearch('')
    setCurrentPage('products')
    window.requestAnimationFrame(() => {
      document.getElementById('catalog-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  const openProductSearch = () => {
    setCurrentPage('products')
    setSelectedCategory('Tất cả')
    window.requestAnimationFrame(() => {
      document.getElementById('catalog-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      document.getElementById('product-search')?.focus()
    })
  }

  const openStory = () => {
    setCurrentPage('about')
    window.requestAnimationFrame(() => {
      document.getElementById('about-story')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  const putInCart = async (product, quantity = 1) => {
    if (!product.id) {
      setApiMessage('Sản phẩm này chưa có mã trên máy chủ nên chưa thể thêm vào giỏ hàng.')
      return false
    }

    try {
      await apiRequest('/cart', {
        method: 'POST',
        body: { product_id: product.id, so_luong: quantity },
      })
      await refreshCart()
      setOrderMessage('')
      setApiMessage(`Đã thêm ${product.name} vào giỏ hàng.`)
      return true
    } catch (error) {
      setApiMessage(`Không thêm được sản phẩm vào giỏ hàng: ${error.message}`)
      return false
    }
  }

  const addToCart = (product) => {
    if (!isAuthenticated) {
      setPendingCartProduct(product)
      setPendingPurchase(false)
      setAuthError('')
      setAuthView('login')
      return
    }
    if (authRole !== 'Khách hàng') {
      setApiMessage('Chỉ tài khoản khách hàng mới có thể mua sản phẩm.')
      return
    }
    putInCart(product)
  }

  const purchaseNow = async (product) => {
    if (!isAuthenticated) {
      setPendingCartProduct(product)
      setPendingPurchase(true)
      setAuthError('')
      setAuthView('login')
      return
    }
    if (authRole !== 'Khách hàng') {
      setApiMessage('Chỉ tài khoản khách hàng mới có thể mua sản phẩm.')
      return
    }
    const added = await putInCart(product)
    if (!added) return
    setCurrentPage('checkout')
    setCheckoutComplete(false)
    setQrPaymentOpen(false)
    setCouponInput('')
    setCouponDiscount(0)
    setCouponMessage('')
    window.scrollTo(0, 0)
  }

  const saveDeliveryInfo = (form) => {
    const formData = new FormData(form)
    const info = {
      recipient: String(formData.get('recipient') || ''),
      phone: String(formData.get('phone') || ''),
      address: String(formData.get('address') || ''),
      city: String(formData.get('city') || ''),
      district: String(formData.get('district') || ''),
      note: String(formData.get('note') || ''),
    }
    localStorage.setItem('checkoutDeliveryInfo', JSON.stringify(info))
    setSavedDeliveryInfo(info)
    setDeliveryInfoSaved(true)
    setDeliveryInfoMessage('Đã lưu thông tin nhận hàng trên thiết bị này.')
  }

  const updateDeliveryInfo = (field, value) => {
    setSavedDeliveryInfo((info) => ({ ...info, [field]: value }))
    setDeliveryInfoSaved(false)
    setDeliveryInfoMessage('')
  }

  const changeCartQuantity = async (cartId, quantity) => {
    try {
      if (quantity < 1) {
        await apiRequest(`/cart/${cartId}`, { method: 'DELETE' })
      } else {
        await apiRequest(`/cart/${cartId}`, {
          method: 'PUT',
          body: { so_luong: quantity },
        })
      }
      await refreshCart()
      setApiMessage('')
    } catch (error) {
      setApiMessage(`Không cập nhật được giỏ hàng: ${error.message}`)
    }
  }

  const cartSubtotal = cartItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
  const shippingFee = Number(shippingQuote?.phi_van_chuyen || 0)
  const checkoutShipping = shippingFee
  const checkoutTotal = Math.max(0, cartSubtotal + checkoutShipping - couponDiscount)
  const formatPrice = (price) => `${Number(price || 0).toLocaleString('vi-VN')} VND`

  const applyCoupon = () => {
    setCouponDiscount(0)
    setCouponMessage('Backend hiện chưa hỗ trợ mã giảm giá; mã chưa được áp dụng.')
  }

  const normalizeSearchText = (value) => value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('vi')

  const searchKeyword = normalizeSearchText(productSearch.trim())
  const visibleProducts = catalogProducts.filter((product) => {
    const matchesCategory = selectedCategory === 'Tất cả' || product.categoryId === selectedCategory
    const searchableText = normalizeSearchText(`${product.name} ${product.category} ${product.label} ${product.description}`)
    const matchesSearch = !searchKeyword || searchableText.includes(searchKeyword)
    return matchesCategory && matchesSearch
  })
  const selectedBatch = selectedProduct?.batches?.[0]

  const handleAuthSubmit = async (event) => {
    event.preventDefault()
    setAuthError('')
    setAuthSubmitting(true)
    const formData = new FormData(event.currentTarget)
    const email = String(formData.get('identity') || '').trim()
    const password = String(formData.get('password') || '')

    try {
      if (authView === 'register') {
        await apiRequest('/auth/register', {
          method: 'POST',
          body: {
            ho_ten: String(formData.get('fullName') || '').trim(),
            email,
            password,
          },
        })
      }

      const response = await apiRequest('/auth/login', {
        method: 'POST',
        body: { email, password },
      })
      const user = response.user
      const role = roleLabels[user.role] || 'Khách hàng'
      localStorage.setItem('access_token', response.access_token)
      localStorage.setItem('loggedUser', user.ho_ten)
      localStorage.setItem('loggedIdentity', user.email)
      localStorage.setItem('authRole', role)
      setLoggedUser(user.ho_ten)
      setLoggedIdentity(user.email)
      setAuthRole(role)
      setIsAuthenticated(true)
      setAuthView(null)
      setApiMessage('')

      if (pendingCartProduct) {
        if (user.role === 'customer') {
          const added = await putInCart(pendingCartProduct)
          if (!added) {
            setPendingCartProduct(null)
            setPendingPurchase(false)
            return
          }
        } else {
          setApiMessage('Tài khoản này không có quyền mua hàng.')
        }
        setPendingCartProduct(null)
      }

      if (pendingPurchase && user.role === 'customer') {
        setCurrentPage('checkout')
        setCheckoutComplete(false)
        setQrPaymentOpen(false)
        window.scrollTo(0, 0)
      } else if (user.role === 'admin') {
        setCurrentPage('admin')
        window.scrollTo(0, 0)
      } else if (user.role === 'sales') {
        setAdminSection('Tổng quan')
        setCurrentPage('sales')
        window.scrollTo(0, 0)
      } else if (user.role === 'farm_staff') {
        setFarmSection('Tổng quan')
        setCurrentPage('farm')
        window.scrollTo(0, 0)
      }
      setPendingPurchase(false)
    } catch (error) {
      setAuthError(error.message)
    } finally {
      setAuthSubmitting(false)
    }
  }

  const handleForgotPasswordSubmit = async (event) => {
    event.preventDefault()
    setAuthError('')
    setRecoveryMessage('')
    setAuthSubmitting(true)
    const email = String(new FormData(event.currentTarget).get('email') || '').trim()

    try {
      const response = await apiRequest('/auth/forgot-password', {
        method: 'POST',
        body: { email },
      })
      setRecoveryEmail(email)
      if (response.development_reset_token) {
        setRecoveryToken(response.development_reset_token)
        setRecoveryMessage('Mã chỉ dùng trên máy local và sẽ hết hạn sau 30 phút.')
        setAuthView('resetPassword')
      } else {
        setRecoveryMessage(response.message)
      }
    } catch (error) {
      setAuthError(error.message)
    } finally {
      setAuthSubmitting(false)
    }
  }

  const handlePasswordResetSubmit = async (event) => {
    event.preventDefault()
    setAuthError('')
    setRecoveryMessage('')
    const formData = new FormData(event.currentTarget)
    const password = String(formData.get('password') || '')
    const confirmation = String(formData.get('confirmation') || '')
    if (password !== confirmation) {
      setAuthError('Mật khẩu xác nhận không khớp.')
      return
    }

    setAuthSubmitting(true)
    try {
      const response = await apiRequest('/auth/reset-password', {
        method: 'POST',
        body: {
          email: recoveryEmail,
          token: recoveryToken,
          password,
        },
      })
      setRecoveryToken('')
      setRecoveryMessage(response.message)
      setAuthView('login')
    } catch (error) {
      setAuthError(error.message)
    } finally {
      setAuthSubmitting(false)
    }
  }

  const logout = async () => {
    try {
      if (localStorage.getItem('access_token')) {
        await apiRequest('/auth/logout', { method: 'POST' })
      }
    } catch (error) {
      setApiMessage(`Đã đăng xuất khỏi trình duyệt nhưng máy chủ chưa xác nhận thu hồi phiên: ${error.message}`)
    } finally {
      localStorage.removeItem('access_token')
      localStorage.removeItem('loggedUser')
      localStorage.removeItem('loggedIdentity')
      localStorage.removeItem('authRole')
      setLoggedUser('')
      setLoggedIdentity('')
      setAuthRole('Khách hàng')
      setIsAuthenticated(false)
      setCurrentPage('home')
      setAdminUserMenuOpen(false)
      setFarmUserMenuOpen(false)
      setSalesProfileOpen(false)
      window.scrollTo(0, 0)
    }
  }

  const submitOrder = async (event) => {
    event.preventDefault()
    setOrderMessage('')
    if (!shippingQuote) {
      setOrderMessage('Nhập địa chỉ giao hàng hợp lệ và chờ hệ thống tính phí giao hàng trước khi đặt.')
      return
    }

    setCheckoutSubmitting(true)
    const address = [savedDeliveryInfo.address, savedDeliveryInfo.district, savedDeliveryInfo.city]
      .filter(Boolean)
      .join(', ')
    try {
      const response = await apiRequest('/orders', {
        method: 'POST',
        body: {
          ten_nguoi_nhan: savedDeliveryInfo.recipient,
          sdt_nguoi_nhan: savedDeliveryInfo.phone,
          dia_chi_giao: address,
          ghi_chu: savedDeliveryInfo.note || null,
        },
      })
      const order = response.data
      setCreatedOrder(order)
      setCompletedCartItems(cartItems)
      setCartItems([])
      setCheckoutComplete(true)

      if (paymentMethod === 'bank' || paymentMethod === 'card') {
        try {
          const paymentResponse = await apiRequest('/payments/create', {
            method: 'POST',
            body: {
              order_id: order.id,
              phuong_thuc: paymentMethod === 'card' ? 'vnpay' : 'vietqr',
            },
          })
          setPaymentInfo(paymentResponse.data)
          if (paymentMethod === 'card') {
            if (!paymentResponse.data.payment_url) {
              throw new Error('Backend không trả về liên kết thanh toán VNPAY.')
            }
            window.location.assign(paymentResponse.data.payment_url)
          } else {
            setQrPaymentOpen(true)
          }
        } catch (error) {
          setOrderMessage(`Đơn ${order.ma_don} đã tạo nhưng chưa khởi tạo được thanh toán: ${error.message}`)
        }
      }
    } catch (error) {
      setOrderMessage(`Không tạo được đơn hàng: ${error.message}`)
    } finally {
      setCheckoutSubmitting(false)
    }
  }

  if (authView === 'forgotPassword' || authView === 'resetPassword') {
    const isResettingPassword = authView === 'resetPassword'

    return (
      <main className="auth-page auth-recovery-page" key={authView}>
        <section className="auth-visual">
          <div className="auth-slogan">
            <p>NÔNG TRẠI HỮU CƠ</p>
            <h1>Nông sản<br/><span>sạch</span><br/><span>tươi ngon</span><br/><span>mỗi ngày</span></h1>
          </div>
        </section>
        <section className="auth-panel auth-panel-recovery">
          <form className="auth-card auth-recovery-card" onSubmit={isResettingPassword ? handlePasswordResetSubmit : handleForgotPasswordSubmit}>
            <div className="auth-brand"><span className="brand-mark">🌿</span><div><b>AgriFuture</b><small>Nông nghiệp xanh - Tương lai sạch</small></div></div>
            <h2 className="auth-recovery-heading">{isResettingPassword ? 'Đặt lại mật khẩu' : 'Quên mật khẩu?'}</h2>
            <p className="auth-subtitle">
              {isResettingPassword
                ? 'Tạo mật khẩu mới để đăng nhập lại.'
                : 'Nhập email tài khoản để nhận mã khôi phục trên môi trường local.'}
            </p>
            {isResettingPassword ? (
              <>
                <label>Email<input type="email" value={recoveryEmail} readOnly /></label>
                <label>Mã khôi phục local<input type="text" value={recoveryToken} readOnly /></label>
                <label>Mật khẩu mới<input name="password" type="password" required minLength={8} pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9]).{8,}" title="Mật khẩu cần ít nhất 8 ký tự, gồm chữ hoa, chữ thường và chữ số." autoComplete="new-password" /></label>
                <label>Xác nhận mật khẩu<input name="confirmation" type="password" required minLength={8} autoComplete="new-password" /></label>
              </>
            ) : (
              <label>Email<input name="email" type="email" required autoComplete="email" defaultValue={recoveryEmail} placeholder="Nhập email của bạn" /></label>
            )}
            {recoveryMessage && <p className="auth-recovery-message" role="status">{recoveryMessage}</p>}
            {authError && <p role="alert" className="auth-error">{authError}</p>}
            <button className="auth-submit" type="submit" disabled={authSubmitting}>
              {authSubmitting ? 'ĐANG XỬ LÝ…' : isResettingPassword ? 'LƯU MẬT KHẨU MỚI' : 'TẠO MÃ KHÔI PHỤC'}
            </button>
            <p className="auth-switch"><button type="button" onClick={() => { setAuthError(''); setRecoveryToken(''); setAuthView('login') }}>Quay lại đăng nhập</button></p>
          </form>
        </section>
      </main>
    )
  }

  if (authView) {
    const isLogin = authView === 'login'

    return (
      <main className="auth-page" key={authView}>
        <section className="auth-visual">
          <div className="auth-slogan">
            <p>NÔNG TRẠI HỮU CƠ</p>
            <h1>Nông sản<br/><span>sạch</span><br/><span>tươi ngon</span><br/><span>mỗi ngày</span></h1>
            {isLogin && <small>Trước tư vườn · Lành từ tầm. Nông sản sạch<br/>được chọn để chăm sóc gia đình bền vững và lành.</small>}
          </div>
        </section>
        <section className="auth-panel">
          <form className="auth-card" onSubmit={handleAuthSubmit}>
            <div className="auth-brand"><span className="brand-mark">🌿</span><div><b>AgriFuture</b><small>Nông nghiệp xanh - Tương lai sạch</small></div></div>
            <div className="auth-tabs"><button type="button" className={isLogin ? 'current' : ''} onClick={() => setAuthView('login')}>Đăng Nhập</button><button type="button" className={!isLogin ? 'current' : ''} onClick={() => setAuthView('register')}>Đăng Ký</button></div>
            <p className="auth-subtitle">{pendingCartProduct ? 'Đăng nhập hoặc đăng ký để thêm sản phẩm vào giỏ hàng.' : 'Chào Mừng bạn đã quay lại!'}<br/><small>Giữ đầu mua sản thực phẩm sạch với</small></p>
            {!isLogin && <label>Họ và tên<input name="fullName" type="text" required placeholder="Nguyễn Văn An" /></label>}
            <label>Email<input name="identity" type="email" required placeholder="Nhập email của bạn" /></label>
            <label>Mật khẩu<div className="password-wrap"><input name="password" type="password" required minLength={8} pattern={isLogin ? undefined : '(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9]).{8,}'} title="Mật khẩu cần ít nhất 8 ký tự, gồm chữ hoa, chữ thường và chữ số." placeholder="Ít nhất 8 ký tự, gồm chữ hoa, chữ thường và số" /><span>👁</span></div></label>
            {isLogin ? <div className="auth-options"><label><input type="checkbox"/> Ghi nhớ đăng nhập</label><a href="#forgot-password" onClick={(event) => { event.preventDefault(); setAuthError(''); setRecoveryMessage(''); setRecoveryToken(''); setAuthView('forgotPassword') }}>Quên mật khẩu?</a></div> : null}
            {isLogin && recoveryMessage && <p className="auth-recovery-message" role="status">{recoveryMessage}</p>}
            {authError && <p role="alert" className="auth-error">{authError}</p>}
            <button className="auth-submit" type="submit" disabled={authSubmitting}>{authSubmitting ? 'ĐANG KẾT NỐI…' : isLogin ? 'ĐĂNG NHẬP' : 'Đăng Ký'}</button>
            {!isLogin && <p className="auth-switch">Bạn đã có tài khoản? <button type="button" onClick={() => setAuthView('login')}>Đăng nhập</button></p>}
          </form>
        </section>
        {isLogin && (
          <>
            {exportVoucherOpen && (
              <div className="admin-modal-backdrop" role="presentation" onMouseDown={() => setExportVoucherOpen(false)}>
                <form className="admin-warehouse-modal" onMouseDown={(event) => event.stopPropagation()} onSubmit={(event) => {
                  event.preventDefault()
                  const data = new FormData(event.currentTarget)
                  const selectedLot = String(data.get('lot') || '')
                  const exportAmount = Number(data.get('amount'))
                  if (!Number.isFinite(exportAmount) || exportAmount < 1) return
                  const selectedItem = warehouseLots.find((item) => item.lot === selectedLot)
                  if (!selectedItem) return
                  const currentAmount = lotQuantityValue(selectedItem)
                  if (exportAmount > currentAmount) return
                  setWarehouseLots((lots) => lots.map((item) => item.lot === selectedLot
                    ? { ...item, quantityValue: currentAmount - exportAmount, quantity: formatLotQuantity(currentAmount - exportAmount, item.unit), date: formatSqlDate(new Date().toISOString()) }
                    : item))
                  setExportVoucherRecords((records) => [{
                    code: `PX-2026-${String(records.length + 1).padStart(3, '0')}`,
                    lot: selectedItem.lot,
                    name: selectedItem.name,
                    amount: `${exportAmount} kg`,
                    reason: String(data.get('reason') || 'Xuất bán'),
                    destination: String(data.get('destination') || 'Kho nhận hàng'),
                    date: '25/11/2026',
                    status: 'Đã xuất kho',
                  }, ...records])
                  setWarehouseHistory((history) => [{ type: 'Xuất kho', lot: selectedItem.lot, name: selectedItem.name, amount: `-${exportAmount} kg`, time: '25/11/2026 · vừa xong' }, ...history])
                  setExportVoucherOpen(false)
                }}>
                  <div className="admin-panel-heading"><div><h3>Tạo phiếu xuất kho</h3><small>Phiếu xuất nông sản ra khỏi kho</small></div><button type="button" onClick={() => setExportVoucherOpen(false)}>×</button></div>
                  <label>Lô hàng<select name="lot">{warehouseLots.map((item) => <option key={item.lot} value={item.lot}>{item.lot} · {item.name} ({item.quantity})</option>)}</select></label>
                  <div className="admin-modal-grid">
                    <label>Số lượng xuất (kg)<input name="amount" type="number" min="1" required placeholder="20" /></label>
                    <label>Lý do<select name="reason"><option>Xuất bán</option><option>Chuyển kho</option><option>Giao đại lý</option><option>Xuất nội bộ</option></select></label>
                  </div>
                  <label>Nơi nhận hàng<input name="destination" required placeholder="Ví dụ: Cửa hàng Nông Sản Việt" /></label>
                  <label>Ghi chú<textarea name="note" rows="3" placeholder="Thông tin bổ sung..." /></label>
                  <button className="admin-modal-submit" type="submit">Xác nhận tạo phiếu</button>
                </form>
              </div>
            )}
          </>
        )}
      </main>
    )
  }

  const farmOverviewLots = warehouseLots.slice(0, 3)
  const farmTotalStockKg = warehouseLots.reduce((total, lot) => total + lot.quantityValue, 0)
  const farmSeasonsCompleted = farmSeasons.filter((season) => season.progress >= 100).length
  const monthlyRevenueMax = Math.max(1, ...staffMonthlyRevenue.map((month) => month.total))
  const orderStatusCounts = salesOrders.reduce((counts, order) => ({
    ...counts,
    [order.status]: (counts[order.status] || 0) + 1,
  }), {})
  const farmUserName = loggedUser || 'Anh Dũng'
  const farmUserInitials = farmUserName.split(/\s+/).slice(-2).map((part) => part.charAt(0).toLocaleUpperCase('vi')).join('')
  const renderFarmLotQuality = () => (
    <section className="farm-overview-quality farm-work-panel">
      <div className="farm-overview-heading">
        <div><h2>Lô hàng & chất lượng</h2><p>Ưu tiên kiểm tra lô sắp đến hạn.</p></div>
        <span>{farmOverviewLots.filter((lot) => ['Sắp hết hạn', 'Cần kiểm tra'].includes(lot.status)).length} lô cần lưu tâm</span>
      </div>
      <div className="farm-overview-lots">
        {farmOverviewLots.map((lot) => {
          const icon = getProductIcon(lot.name)
          return (
            <article className="farm-overview-lot" key={lot.lot}>
              <div className="farm-overview-lot-heading">
                <span aria-hidden="true">{icon}</span>
                <div><strong>{lot.name}</strong><small>{lot.lot}</small></div>
              </div>
              <div className="farm-overview-lot-details">
                <div><span>Tồn kho</span><strong>{lot.quantity}</strong></div>
                <div><span>Hạn sử dụng</span><strong>{lot.expiry}</strong></div>
              </div>
              <button type="button" onClick={() => { setFarmLossFormLot(farmLossFormLot === lot.lot ? '' : lot.lot); setFarmLossMessage('') }}>+ Ghi nhận hao hụt</button>
              {farmLossFormLot === lot.lot && (
                <form className="farm-loss-inline" onSubmit={(event) => {
                  event.preventDefault()
                  const data = new FormData(event.currentTarget)
                  const amount = Number(data.get('amount'))
                  const reason = String(data.get('reason') || '').trim()
                  const currentLot = warehouseLots.find((item) => item.lot === lot.lot)
                  const currentQuantity = currentLot ? lotQuantityValue(currentLot) : 0
                  if (!currentLot || !Number.isFinite(amount) || amount < 1 || amount > currentQuantity) {
                    setFarmLossMessage('Vui lòng nhập số kg hao hụt hợp lệ, không vượt quá tồn kho.')
                    return
                  }
                  setWarehouseLots((items) => items.map((item) => item.lot === lot.lot ? { ...item, quantityValue: currentQuantity - amount, quantity: formatLotQuantity(currentQuantity - amount, item.unit) } : item))
                  setWarehouseHistory((history) => [{ type: 'Ghi nhận hao hụt', lot: lot.lot, name: lot.name, amount: `-${amount} kg`, time: 'Vừa xong' }, ...history])
                  setWriteOffRecords((records) => [{
                    code: `XH-FARM-${Date.now()}`,
                    lot: lot.lot,
                    name: lot.name,
                    amount: `${amount} kg`,
                    reason,
                    date: 'Hôm nay',
                    status: 'Đã ghi nhận',
                  }, ...records])
                  setFarmLossFormLot('')
                  setFarmLossMessage('')
                }}>
                  <label>Số lượng (kg)<input name="amount" type="number" min="1" max={lot.quantityValue} required /></label>
                  <label>Lý do<textarea name="reason" rows="2" required placeholder="Ví dụ: dập, hỏng..." /></label>
                  {farmLossMessage && <small role="alert">{farmLossMessage}</small>}
                  <button type="submit">Lưu ghi nhận</button>
                </form>
              )}
            </article>
          )
        })}
      </div>
      <form className="farm-harvest-form" onSubmit={(event) => {
        event.preventDefault()
        const data = new FormData(event.currentTarget)
        const lotCode = String(data.get('lot') || '')
        const amount = Number(data.get('amount'))
        const selectedLot = warehouseLots.find((lot) => lot.lot === lotCode)
        if (!selectedLot || !Number.isFinite(amount) || amount < 1) {
          setFarmHarvestMessage('Vui lòng chọn lô hàng và nhập sản lượng hợp lệ.')
          return
        }
        const currentQuantity = lotQuantityValue(selectedLot)
        setWarehouseLots((lots) => lots.map((lot) => lot.lot === lotCode ? { ...lot, quantityValue: currentQuantity + amount, quantity: formatLotQuantity(currentQuantity + amount, lot.unit) } : lot))
        setWarehouseHistory((history) => [{ type: 'Nhập kho', lot: lotCode, name: selectedLot.name, amount: `+${amount} kg`, time: 'Vừa xong' }, ...history])
        setFarmHarvestMessage(`Đã nhập ${amount} kg vào lô ${lotCode}.`)
        event.currentTarget.reset()
      }}>
        <strong>Nhập sản lượng thu hoạch</strong>
        <div className="farm-harvest-fields">
          <label>Lô nhận sản lượng
            <select name="lot" defaultValue={farmOverviewLots[0]?.lot}>
              {farmOverviewLots.map((lot) => <option value={lot.lot} key={lot.lot}>{lot.name}</option>)}
            </select>
          </label>
          <label>Sản lượng (kg)<input name="amount" type="number" min="1" defaultValue="20" required /></label>
          <button type="submit">Xác nhận nhập kho</button>
        </div>
        {farmHarvestMessage && <p role="status">{farmHarvestMessage}</p>}
      </form>
    </section>
  )
  return (
    <div className={`app${currentPage === 'checkout' ? ' checkout-app' : ''}${currentPage === 'checkout' && checkoutComplete ? ' checkout-success-app' : ''}${currentPage === 'productDetail' ? ' product-detail-app' : ''}${currentPage === 'admin' ? ' admin-dashboard-app' : ''}${currentPage === 'sales' ? ' sales-dashboard-app' : ''}${currentPage === 'farm' ? ' farm-dashboard-app' : ''}`}>
      <div className="announcement-bar">Giao hàng nhanh · Nông sản tươi ngon mỗi ngày</div>
      <header className="header">
        <div className="container nav">
          <a className="brand" href="#" onClick={(event) => { event.preventDefault(); setCurrentPage('home') }}><span className="brand-mark">🌿</span><span>Nông Sản Việt</span></a>
          <nav>
            <a className={currentPage === 'home' ? 'active' : ''} href="#" onClick={(event) => { event.preventDefault(); setCurrentPage('home') }}>Trang chủ</a>
            <a className={currentPage === 'products' ? 'active' : ''} href="#products" onClick={(event) => { event.preventDefault(); setCurrentPage('products') }}>Sản phẩm</a>
            <a className={currentPage === 'about' ? 'active' : ''} href="#about" onClick={(event) => { event.preventDefault(); setCurrentPage('about'); window.scrollTo(0, 0) }}>Giới thiệu</a>
            <a className={currentPage === 'contact' ? 'active' : ''} href="#contact" onClick={(event) => { event.preventDefault(); setCurrentPage('contact'); window.scrollTo(0, 0) }}>Liên hệ</a>
          </nav>
          <div className="nav-icons">
            <button aria-label="Tìm kiếm" onClick={openProductSearch}>⌕</button>
            <button className="cart-nav-button" aria-label={`Giỏ hàng, ${cartItems.reduce((sum, item) => sum + item.quantity, 0)} sản phẩm`} onClick={() => { setCurrentPage('cart'); setOrderMessage(''); window.scrollTo(0, 0) }}>🛒{cartItems.length > 0 && <span>{cartItems.reduce((sum, item) => sum + item.quantity, 0)}</span>}</button>
            {loggedUser ? (
              <div className="user-menu">
                <button className="user-profile" type="button" title={loggedUser}>
                  <span className="user-avatar">{loggedUser.charAt(0).toLocaleUpperCase('vi')}</span>
                  <span className="user-name">{loggedUser}</span>
                </button>
                <button className="logout-button" type="button" title="Đăng xuất" aria-label="Đăng xuất" onClick={logout}>↪</button>
              </div>
            ) : (
              <>
                <button className="login-link" onClick={() => setAuthView('login')}>Đăng nhập</button>
                <button className="register-link" onClick={() => setAuthView('register')}>Đăng ký</button>
              </>
            )}
          </div>
        </div>
      </header>

      {apiMessage && (
        <div role="alert" style={{ display: 'flex', justifyContent: 'center', gap: 12, padding: '10px 16px', background: '#fff3dc', color: '#743d00', fontSize: 13 }}>
          <span>{apiMessage}</span>
          <button type="button" aria-label="Đóng thông báo" onClick={() => setApiMessage('')}>×</button>
        </div>
      )}
      {['admin', 'sales', 'farm'].includes(currentPage) && staffDashboardLoading && (
        <p role="status" className="catalog-empty">Đang tải dữ liệu dashboard từ SQL…</p>
      )}
      {['admin', 'sales', 'farm'].includes(currentPage) && staffDashboardError && (
        <p role="alert" className="catalog-empty">{staffDashboardError}</p>
      )}
      {isAuthenticated && ['admin', 'sales', 'farm'].includes(currentPage) && !staffDashboardLoading && !staffDashboardError && (
        <p role="note" className="catalog-empty">Danh sách và thống kê được đọc từ SQL; thao tác thêm hoặc cập nhật chưa lưu vào database.</p>
      )}

      <main>
        {currentPage === 'sales' ? (
          <section className="sales-dashboard">
            <aside className="sales-sidebar">
              <a className="sales-brand" href="#" onClick={(event) => { event.preventDefault(); setCurrentPage('sales') }}>
                <span>🌿</span><strong>Nông Sản Việt</strong>
              </a>
              <p className="sales-sidebar-label">KHÔNG GIAN LÀM VIỆC</p>
              <nav className="sales-nav" aria-label="Điều hướng nhân viên bán hàng">
                {[
                  ['▦', 'Tổng quan'],
                  ['▤', 'Đơn hàng'],
                  ['↔', 'Đổi trả & khiếu nại'],
                  ['▧', 'Tình trạng vận chuyển'],
                ].map(([icon, title]) => (
                  <button type="button" className={salesFilter === title || (title === 'Tổng quan' && salesFilter === 'Tất cả') ? 'active' : ''} key={title} onClick={() => { setSalesProfileOpen(false); setSalesFilter(title === 'Tổng quan' ? 'Tất cả' : title) }}>
                    <span>{icon}</span>{title}
                  </button>
                ))}
              </nav>
              <div className="sales-sidebar-profile-wrap">
                <button type="button" className="sales-sidebar-footer" aria-label="Mở thông tin người dùng" aria-expanded={salesProfileOpen} aria-controls="sales-profile-popover" onClick={() => setSalesProfileOpen((open) => !open)}>
                  <i>TH</i><div><strong>{loggedUser || 'Thủ Hà'}</strong><small>Nhân viên bán hàng</small></div>
                </button>
                {salesProfileOpen && (
                  <div className="sales-profile-popover" id="sales-profile-popover">
                    <div className="sales-profile-popover-heading">
                      <span>{(loggedUser || 'Thủ Hà').charAt(0).toLocaleUpperCase('vi')}</span>
                      <div><strong>{loggedUser || 'Thủ Hà'}</strong><small>Nhân viên bán hàng</small></div>
                    </div>
                    <dl>
                      <div><dt>Tài khoản</dt><dd>{loggedIdentity || (loggedUser ? loggedUser.toLocaleLowerCase('vi').replaceAll(' ', '.') : 'thu.ha')}</dd></div>
                      <div><dt>Trạng thái</dt><dd><i />Đang hoạt động</dd></div>
                    </dl>
                    <button type="button" className="sales-profile-logout" onClick={logout}><span aria-hidden="true">↪</span> Đăng xuất</button>
                  </div>
                )}
              </div>
            </aside>
            <div className="sales-main">
              <header className="sales-topbar">
                <div><small>Không gian bán hàng</small><h1>{salesFilter === 'Tất cả' ? 'Tổng quan' : salesFilter}</h1></div>
                <div className="sales-top-actions">
                  <button type="button" className="sales-store-button" onClick={() => { setCurrentPage('home'); setAuthView(null); window.scrollTo(0, 0) }}>Xem cửa hàng</button>
                </div>
              </header>
              <div className="sales-content">
                {salesFilter === 'Tình trạng vận chuyển' ? (
                  <section className="sales-orders-panel sales-shipping-panel">
                    <div className="sales-shipping-controls">
                      <label className="sales-shipping-search">Tìm vận đơn
                        <input value={shippingSearch} onChange={(event) => setShippingSearch(event.target.value)} placeholder="Mã đơn, mã vận đơn, tên khách..." />
                      </label>
                      <label className="sales-shipping-filter">Trạng thái
                        <select value={shippingStatusFilter} onChange={(event) => setShippingStatusFilter(event.target.value)}>
                          {['Tất cả', 'Chờ duyệt', 'Đã thanh toán', 'Đang chuẩn bị', 'Đang giao', 'Đã giao', 'Đã hủy', 'Hoàn tiền', 'Giao bù'].map((status) => <option key={status}>{status}</option>)}
                        </select>
                      </label>
                    </div>
                    <div className="sales-shipment-list">
                      {salesOrders.filter((order) => (
                        (shippingStatusFilter === 'Tất cả' || order.status === shippingStatusFilter)
                        && `${order.code} ${order.trackingCode} ${order.customer}`.toLocaleLowerCase('vi').includes(shippingSearch.toLocaleLowerCase('vi'))
                      )).map((order) => {
                        const shipmentSteps = ['Chờ duyệt', 'Đã thanh toán', 'Đang chuẩn bị', 'Đang giao', 'Đã giao']
                        const currentStep = shipmentSteps.indexOf(order.status)
                        const isExpanded = expandedShipment === order.code
                        return (
                          <article className={`sales-shipment-card${isExpanded ? ' is-expanded' : ''}`} key={order.code}>
                            <div className="sales-shipment-summary">
                              <span className="sales-shipment-icon" aria-hidden="true">
                                <svg viewBox="0 0 24 24"><path d="M3 6h12v11H3zM15 10h4l3 3v4h-7zM7 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM18 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/></svg>
                              </span>
                              <div className="sales-shipment-customer">
                                <strong>{order.code} <span>{order.trackingCode}</span></strong>
                                <span>{order.customer}</span>
                                <span>{order.items}</span>
                              </div>
                              <span className={`sales-shipment-status status-${currentStep}`}>{order.status}</span>
                              <button type="button" className="sales-shipment-toggle" aria-expanded={isExpanded} onClick={() => setExpandedShipment(isExpanded ? '' : order.code)}>
                                {isExpanded ? 'Thu gọn −' : 'Chi tiết +'}
                              </button>
                            </div>
                            {isExpanded && (
                              <div className="sales-shipment-details">
                                <div><small>Đơn vị vận chuyển</small><strong>{order.carrier}</strong></div>
                                <div><small>Địa chỉ giao hàng</small><strong>{order.address}</strong></div>
                                <div className="sales-shipment-progress" aria-label={`Tiến trình vận chuyển: ${order.status}`}>
                                  {shipmentSteps.map((step, index) => (
                                    <div className={`sales-shipment-step${index < currentStep ? ' is-complete' : ''}${index === currentStep ? ' is-current' : ''}`} key={step}>
                                      <i aria-hidden="true">{index < currentStep ? '✓' : index + 1}</i><span>{step}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </article>
                        )
                      })}
                      {salesOrders.filter((order) => (
                        (shippingStatusFilter === 'Tất cả' || order.status === shippingStatusFilter)
                        && `${order.code} ${order.trackingCode} ${order.customer}`.toLocaleLowerCase('vi').includes(shippingSearch.toLocaleLowerCase('vi'))
                      )).length === 0 && <p className="sales-shipment-empty">Không tìm thấy vận đơn phù hợp.</p>}
                    </div>
                  </section>
                ) : salesFilter === 'Đổi trả & khiếu nại' ? (
                  <section className="sales-orders-panel sales-returns-panel">
                    <h2>Lắng nghe để phục vụ tốt hơn</h2>
                    <div className="sales-return-list">
                      {salesReturnRequests.map((request) => (
                        <article className="sales-return-row" key={request.code}>
                          <div className="sales-return-info">
                            <strong>{request.code} · {request.customer}</strong>
                            <span>{request.details} · {request.order}</span>
                            <span className={`sales-return-status${request.status === 'Chờ xử lý' ? ' is-pending' : ''}`} role="status">{request.status}</span>
                          </div>
                        </article>
                      ))}
                      {salesReturnRequests.length === 0 && <p className="sales-shipment-empty">Chưa có khiếu nại trong cơ sở dữ liệu.</p>}
                    </div>
                  </section>
                ) : (
                  <section className="sales-orders-panel">
                    <div className="sales-orders-heading"><div><h3>Đơn hàng cần chăm sóc</h3><small>Xác nhận, chuẩn bị và theo dõi giao hàng.</small></div><label>⌕ <input value={salesSearch} onChange={(event) => setSalesSearch(event.target.value)} placeholder="Tìm mã đơn, khách hàng..." /></label></div>
                    <div className="sales-order-filters">
                      {['Tất cả', 'Chờ duyệt', 'Đã thanh toán', 'Đang chuẩn bị', 'Đang giao', 'Đã giao', 'Đã hủy', 'Hoàn tiền', 'Giao bù'].map((filter) => (
                        <button type="button" className={salesFilter === filter ? 'active' : ''} key={filter} onClick={() => setSalesFilter(filter)}>{filter === 'Tất cả' ? `Tất cả ${salesOrders.length}` : filter}</button>
                      ))}
                    </div>
                    {salesOrders.filter((order) => (salesFilter === 'Tất cả' || salesFilter === 'Tổng quan' || order.status === salesFilter) && `${order.code} ${order.customer} ${order.items}`.toLocaleLowerCase('vi').includes(salesSearch.toLocaleLowerCase('vi'))).map((order) => (
                      <div className="sales-order-row" key={order.code}>
                        <span className="sales-order-icon">↗</span>
                        <div><strong>{order.code} <small>{order.customer}</small></strong><span>{order.items}</span></div>
                        <strong className="sales-order-total">{order.total}</strong>
                        <span className="sales-order-status">{order.status}</span>
                        <button type="button" disabled title="Đang hiển thị dữ liệu chỉ đọc từ SQL">Chỉ xem</button>
                      </div>
                    ))}
                    {salesOrders.length === 0 && <p className="sales-shipment-empty">{staffDashboardLoading ? 'Đang tải đơn hàng từ SQL…' : 'Chưa có đơn hàng trong cơ sở dữ liệu.'}</p>}
                  </section>
                )}
              </div>
            </div>
          </section>
        ) : currentPage === 'farm' ? (
          <section className="farm-dashboard">
            <aside className="farm-sidebar">
              <a className="farm-brand" href="#" onClick={(event) => { event.preventDefault(); setFarmSection('Tổng quan') }}>
                <span className="farm-brand-mark" aria-hidden="true">🌿</span><strong>Nông Sản Việt</strong>
              </a>
              <p className="farm-sidebar-label">ĐIỀU HÀNH</p>
              <nav className="farm-nav" aria-label="Điều hướng nhân viên nông trại">
                {[
                  ['⊞', 'Tổng quan'],
                  ['⬡', 'Lô hàng & hao hụt'],
                  ['♧', 'Tiến độ mùa vụ'],
                  ['▣', 'Nhật ký canh tác'],
                ].map(([icon, title]) => (
                  <button type="button" className={farmSection === title ? 'active' : ''} key={title} onClick={() => setFarmSection(title)}>
                    <span aria-hidden="true">{icon}</span>{title}
                  </button>
                ))}
              </nav>
              <div className="farm-sidebar-profile-wrap">
                <button type="button" className="farm-sidebar-profile" aria-expanded={farmUserMenuOpen} aria-controls="farm-user-popover" onClick={() => setFarmUserMenuOpen((open) => !open)}>
                  <span>{farmUserInitials}</span>
                  <div><strong>{farmUserName}</strong><small>{authRole}</small></div>
                  <i aria-hidden="true">{farmUserMenuOpen ? '⌃' : '⌄'}</i>
                </button>
                {farmUserMenuOpen && (
                  <div className="admin-user-popover" id="farm-user-popover">
                    <div className="admin-user-popover-profile">
                      <span>{farmUserInitials}</span>
                      <div><strong>{farmUserName}</strong><small>{authRole}</small></div>
                    </div>
                    <div className="admin-user-popover-details">
                      <span>Tài khoản<b>{loggedIdentity || farmUserName.toLocaleLowerCase('vi').replaceAll(' ', '.')}</b></span>
                      <span>Trạng thái<b>Đang hoạt động</b></span>
                    </div>
                    <button type="button" onClick={logout}>↪ &nbsp;Đăng xuất</button>
                  </div>
                )}
              </div>
            </aside>
            <div className="farm-main">
              <header className="farm-topbar">
                <div><small>Không gian nông trại &nbsp; / &nbsp; Điều hành</small><h1>{farmSection}</h1></div>
                <div><button type="button" aria-label="Thông báo">♧</button><button type="button" onClick={() => { setCurrentPage('home'); window.scrollTo(0, 0) }}>Xem cửa hàng</button></div>
              </header>
              <div className="farm-content">
                {farmSection === 'Tổng quan' ? (
                  <>
                    <section className="farm-hero">
                      <small>KHÔNG GIAN NÔNG TRẠI</small>
                      <h2>Chào {loggedUser || 'bạn'}, cùng chăm mùa vụ mới!</h2>
                      <p>Từ nhật ký canh tác đến thu hoạch – mọi việc trong tầm tay.</p>
                      <div>
                        <button type="button" onClick={() => setFarmSection('Lô hàng & hao hụt')}>Lô hàng & hao hụt ↗</button>
                        <button type="button" onClick={() => setFarmSection('Nhật ký canh tác')}>Nhật ký canh tác ↗</button>
                      </div>
                    </section>
                    <section className="farm-overview-stats" aria-label="Thống kê nông trại">
                      {[
                        ['Lô hàng theo dõi', farmOverviewLots.length, 'Nông sản trong kho'],
                        ['Tổng tồn kho', `${farmTotalStockKg.toLocaleString('vi-VN', { maximumFractionDigits: 2 })} kg`, 'Đọc từ dữ liệu SQL'],
                        ['Mùa vụ hoàn tất', `${farmSeasonsCompleted}/${farmSeasons.length}`, 'Tiến độ thu hoạch'],
                        ['Nhật ký canh tác', farmJournal.length, 'Ghi chép trong phiên'],
                      ].map(([label, value, description]) => (
                        <article key={label}><span>{label}</span><strong>{value}</strong><small>{description}</small></article>
                      ))}
                    </section>
                    <section className="farm-overview-quality farm-work-panel">
                      <div className="farm-overview-heading">
                        <div><h2>Lô hàng & chất lượng</h2><p>Ưu tiên kiểm tra lô sắp đến hạn.</p></div>
                        <span>{farmOverviewLots.filter((lot) => ['Sắp hết hạn', 'Cần kiểm tra'].includes(lot.status)).length} lô cần lưu tâm</span>
                      </div>
                      <div className="farm-overview-lots">
                        {farmOverviewLots.map((lot) => {
                          const icon = getProductIcon(lot.name)
                          return (
                            <article className="farm-overview-lot" key={lot.lot}>
                              <div className="farm-overview-lot-heading">
                                <span aria-hidden="true">{icon}</span>
                                <div><strong>{lot.name}</strong><small>{lot.lot}</small></div>
                              </div>
                              <div className="farm-overview-lot-details">
                                <div><span>Tồn kho</span><strong>{lot.quantity}</strong></div>
                                <div><span>Hạn sử dụng</span><strong>{lot.expiry}</strong></div>
                              </div>
                              <button type="button" onClick={() => { setFarmLossFormLot(farmLossFormLot === lot.lot ? '' : lot.lot); setFarmLossMessage('') }}>+ Ghi nhận hao hụt</button>
                              {farmLossFormLot === lot.lot && (
                                <form className="farm-loss-inline" onSubmit={(event) => {
                                  event.preventDefault()
                                  const data = new FormData(event.currentTarget)
                                  const amount = Number(data.get('amount'))
                                  const reason = String(data.get('reason') || '').trim()
                                  const currentLot = warehouseLots.find((item) => item.lot === lot.lot)
                                  const currentQuantity = currentLot ? lotQuantityValue(currentLot) : 0
                                  if (!currentLot || !Number.isFinite(amount) || amount < 1 || amount > currentQuantity) {
                                    setFarmLossMessage('Vui lòng nhập số kg hao hụt hợp lệ, không vượt quá tồn kho.')
                                    return
                                  }
                                  setWarehouseLots((items) => items.map((item) => item.lot === lot.lot ? { ...item, quantityValue: currentQuantity - amount, quantity: formatLotQuantity(currentQuantity - amount, item.unit) } : item))
                                  setWarehouseHistory((history) => [{ type: 'Ghi nhận hao hụt', lot: lot.lot, name: lot.name, amount: `-${amount} kg`, time: 'Vừa xong' }, ...history])
                                  setWriteOffRecords((records) => [{
                                    code: `XH-FARM-${Date.now()}`,
                                    lot: lot.lot,
                                    name: lot.name,
                                    amount: `${amount} kg`,
                                    reason,
                                    date: 'Hôm nay',
                                    status: 'Đã ghi nhận',
                                  }, ...records])
                                  setFarmLossFormLot('')
                                  setFarmLossMessage('')
                                }}>
                                  <label>Số lượng (kg)<input name="amount" type="number" min="1" max={lot.quantityValue} required /></label>
                                  <label>Lý do<textarea name="reason" rows="2" required placeholder="Ví dụ: dập, hỏng..." /></label>
                                  {farmLossMessage && <small role="alert">{farmLossMessage}</small>}
                                  <button type="submit">Lưu ghi nhận</button>
                                </form>
                              )}
                            </article>
                          )
                        })}
                      </div>
                      <form className="farm-harvest-form" onSubmit={(event) => {
                        event.preventDefault()
                        const data = new FormData(event.currentTarget)
                        const lotCode = String(data.get('lot') || '')
                        const amount = Number(data.get('amount'))
                        const selectedLot = warehouseLots.find((lot) => lot.lot === lotCode)
                        if (!selectedLot || !Number.isFinite(amount) || amount < 1) {
                          setFarmHarvestMessage('Vui lòng chọn lô hàng và nhập sản lượng hợp lệ.')
                          return
                        }
                        const currentQuantity = lotQuantityValue(selectedLot)
                        setWarehouseLots((lots) => lots.map((lot) => lot.lot === lotCode ? { ...lot, quantityValue: currentQuantity + amount, quantity: formatLotQuantity(currentQuantity + amount, lot.unit) } : lot))
                        setWarehouseHistory((history) => [{ type: 'Nhập kho', lot: lotCode, name: selectedLot.name, amount: `+${amount} kg`, time: 'Vừa xong' }, ...history])
                        setFarmHarvestMessage(`Đã nhập ${amount} kg vào lô ${lotCode}.`)
                        event.currentTarget.reset()
                      }}>
                        <strong>Nhập sản lượng thu hoạch</strong>
                        <div className="farm-harvest-fields">
                          <label>Lô nhận sản lượng
                            <select name="lot" defaultValue={farmOverviewLots[0]?.lot}>
                              {farmOverviewLots.map((lot) => <option value={lot.lot} key={lot.lot}>{lot.name}</option>)}
                            </select>
                          </label>
                          <label>Sản lượng (kg)<input name="amount" type="number" min="1" defaultValue="20" required /></label>
                          <button type="submit">Xác nhận nhập kho</button>
                        </div>
                        {farmHarvestMessage && <p role="status">{farmHarvestMessage}</p>}
                      </form>
                    </section>
                    <section className="farm-overview-journal farm-work-panel">
                      <div className="farm-overview-heading"><h2>Nhật ký từ nông trại</h2></div>
                      <form className="farm-overview-journal-form" onSubmit={(event) => {
                        event.preventDefault()
                        const note = String(new FormData(event.currentTarget).get('note') || '').trim()
                        if (!note) return
                        const now = new Date()
                        const timestamp = now.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                        setFarmJournal((entries) => [{
                          date: timestamp,
                          lot: farmOverviewLots[0]?.lot || '',
                          activity: 'Ghi nhận canh tác',
                          note,
                        }, ...entries])
                        event.currentTarget.reset()
                      }}>
                        <label htmlFor="farm-overview-journal-note">Hôm nay nông trại có gì mới?</label>
                        <div>
                          <textarea id="farm-overview-journal-note" name="note" required placeholder="Ghi lại hoạt động chăm sóc, tình trạng cây trồng..." />
                          <button type="submit">+ Thêm nhật ký</button>
                        </div>
                      </form>
                      <div className="farm-overview-journal-entries">
                        {farmJournal.slice(0, 3).map((entry, index) => {
                          const lot = warehouseLots.find((item) => item.lot === entry.lot)
                          return (
                            <article key={`${entry.lot}-${entry.date}-${index}`}>
                              <strong>{entry.activity}</strong>
                              <small>{entry.lot}{lot ? ` · ${lot.name}` : ''} · {entry.note}</small>
                            </article>
                          )
                        })}
                      </div>
                    </section>
                    <section className="farm-lookup-panel">
                      <header><span>▦</span><div><h2>Chạm để tra lô hàng</h2><p>Quét tem QR ngay tại vườn</p></div></header>
                      <div className="farm-lookup-tools">
                        <div className="farm-camera-box">
                          <span aria-hidden="true">▦</span><p>Đưa mã QR vào giữa khung hình</p>
                          <button type="button" onClick={() => {
                            farmCameraReadyRef.current = false
                            setFarmCameraReady(false)
                            setFarmScannerMessage('')
                            setFarmCameraPermissionDenied(false)
                            setFarmCameraPermissionConfirmed(false)
                            setFarmScannerOpen(true)
                          }}>Mở camera quét QR</button>
                        </div>
                        <form className="farm-lot-search" onSubmit={(event) => {
                          event.preventDefault()
                          const code = farmLotCode.trim()
                          setFarmLookupLot(warehouseLots.find((lot) => lot.lot.toLocaleLowerCase('vi') === code.toLocaleLowerCase('vi')) || null)
                          setFarmLookupSearched(true)
                        }}>
                          <label>Hoặc nhập mã trên tem
                            <span>Tìm nhanh thông tin và ghi nhận chất lượng mà không cần tìm trong danh sách.</span>
                            <div><input value={farmLotCode} onChange={(event) => { setFarmLotCode(event.target.value); setFarmLookupSearched(false) }} placeholder={`Ví dụ: ${warehouseLots[0]?.lot || 'mã lô'}`} aria-label="Mã lô hàng" /><button type="submit">Tra cứu</button></div>
                            <small>Mã lô có trong SQL: {warehouseLots.slice(0, 3).map((lot) => lot.lot).join(', ') || 'chưa có dữ liệu'}.</small>
                          </label>
                        </form>
                      </div>
                      {farmLookupSearched && (
                        <div className={`farm-lookup-result${farmLookupLot ? ' found' : ' not-found'}`} role="status">
                          {farmLookupLot ? (
                            <>
                              <div><strong>{farmLookupLot.name}</strong><span>{farmLookupLot.lot} · {farmLookupLot.farm}</span></div>
                              <div><strong>{farmLookupLot.quantity}</strong><span>{farmLookupLot.expiry} · {farmLookupLot.status}</span></div>
                              <button type="button" onClick={() => { setFarmSampleLot(farmLookupLot.lot); setFarmSection('Lô hàng & hao hụt') }}>Mở hồ sơ lô hàng</button>
                            </>
                          ) : <span>Không tìm thấy mã lô “{farmLotCode.trim()}”. Vui lòng kiểm tra mã trên tem.</span>}
                        </div>
                      )}
                      <details className="farm-sample-lot" open>
                        <summary>Mã lô mẫu để tra cứu <span>−</span></summary>
                        <div>
                          <div className="farm-sample-visual">
                            {farmSampleQr ? <img src={farmSampleQr} alt={`Mã QR cho lô hàng ${farmSampleLot}`} /> : <span role="status">{farmQrError || (farmSampleLot ? 'Đang tạo mã QR…' : 'Chưa có mã lô trong SQL.')}</span>}
                            <b>{farmSampleLot || '—'}</b>
                          </div>
                          <div className="farm-sample-info">
                            <h3>Mã lô hàng mẫu</h3>
                            <p>Chọn mã lô có sẵn để xem thông tin mùa vụ và tồn kho.</p>
                            <label>Chọn lô hàng
                              <select value={farmSampleLot} onChange={(event) => setFarmSampleLot(event.target.value)}>
                                {warehouseLots.map((lot) => <option value={lot.lot} key={lot.lot}>{lot.lot} · {lot.name}</option>)}
                              </select>
                            </label>
                            <small>{warehouseLots.find((lot) => lot.lot === farmSampleLot)?.farm} · {warehouseLots.find((lot) => lot.lot === farmSampleLot)?.quantity}</small>
                            <button type="button" disabled={!farmSampleLot} onClick={() => {
                              setFarmLotCode(farmSampleLot)
                              setFarmLookupLot(warehouseLots.find((lot) => lot.lot === farmSampleLot) || null)
                              setFarmLookupSearched(true)
                            }}>Tra cứu mã mẫu</button>
                          </div>
                        </div>
                      </details>
                    </section>
                  </>
                ) : farmSection === 'Lô hàng & hao hụt' ? (
                  <>
                    {renderFarmLotQuality()}
                    <section className="farm-work-panel">
                      <div className="farm-section-heading"><div><h2>Lô hàng & hao hụt</h2><p>Theo dõi chất lượng và sản lượng tại nông trại.</p></div><button type="button" onClick={() => setFarmSection('Tổng quan')}>Tra cứu mã lô</button></div>
                      <div className="farm-lot-list">
                        {warehouseLots.map((lot) => (
                          <article key={lot.lot}>
                            <span>♧</span><div><strong>{lot.name}</strong><small>{lot.lot} · {lot.farm}</small></div><b>{lot.quantity}</b><em>{lot.status}</em>
                            <button type="button" onClick={() => { setFarmLotCode(lot.lot); setFarmLookupLot(lot); setFarmLookupSearched(true); setFarmSection('Tổng quan') }}>Xem lô</button>
                          </article>
                        ))}
                        {warehouseLots.length === 0 && <p className="catalog-empty">{staffDashboardLoading ? 'Đang tải lô hàng từ SQL…' : 'Chưa có lô hàng trong cơ sở dữ liệu.'}</p>}
                      </div>
                    </section>
                  </>
                ) : farmSection === 'Tiến độ mùa vụ' ? (
                  <>
                    <section className="farm-overview-stats" aria-label="Thống kê nông trại">
                      {[
                        ['Lô hàng theo dõi', farmOverviewLots.length, 'Nông sản trong kho'],
                        ['Tổng tồn kho', `${farmTotalStockKg.toLocaleString('vi-VN', { maximumFractionDigits: 2 })} kg`, 'Đọc từ dữ liệu SQL'],
                        ['Mùa vụ hoàn tất', `${farmSeasonsCompleted}/${farmSeasons.length}`, 'Tiến độ thu hoạch'],
                        ['Nhật ký canh tác', farmJournal.length, 'Ghi chép trong phiên'],
                      ].map(([label, value, description]) => (
                        <article key={label}><span>{label}</span><strong>{value}</strong><small>{description}</small></article>
                      ))}
                    </section>
                    <section className="farm-overview-season farm-work-panel">
                      <div className="farm-overview-heading"><h2>Theo nhịp mùa vụ</h2></div>
                      <div className="farm-overview-seasons">
                      {farmSeasons.map((season) => (
                          <article key={season.lot}>
                            <div className="farm-overview-season-name">                            <span aria-hidden="true">{getProductIcon(season.name)}</span><strong>{season.name}</strong></div>
                            <div className="farm-overview-season-progress"><span>{season.status}</span><strong>{season.progress}%</strong></div>
                            <div className="farm-season-progress"><i style={{ width: `${season.progress}%` }} /></div>
                            <button type="button" disabled title="Tiến độ mùa vụ đang được đọc từ SQL">Chỉ xem dữ liệu SQL</button>
                          </article>
                      ))}
                      {farmSeasons.length === 0 && <p className="catalog-empty">{staffDashboardLoading ? 'Đang tải mùa vụ từ SQL…' : 'Chưa có mùa vụ trong cơ sở dữ liệu.'}</p>}
                      </div>
                    </section>
                  </>
                ) : (
                  <section className="farm-work-panel">
                    <div className="farm-section-heading"><div><h2>Nhật ký canh tác</h2><p>Lưu lại công việc và ghi chú theo từng mã lô.</p></div><button type="button" onClick={() => setFarmJournalFormOpen((open) => !open)}>{farmJournalFormOpen ? 'Đóng' : '+ Ghi nhật ký'}</button></div>
                    {farmJournalFormOpen && (
                      <form className="farm-journal-form" onSubmit={(event) => {
                        event.preventDefault()
                        const formData = new FormData(event.currentTarget)
                        setFarmJournal((entries) => [{
                          date: new Date().toLocaleString('vi-VN'),
                          lot: String(formData.get('lot')),
                          activity: String(formData.get('activity')),
                          note: String(formData.get('note')),
                        }, ...entries])
                        setFarmJournalFormOpen(false)
                      }}>
                        <label>Mã lô<select name="lot">{warehouseLots.map((lot) => <option key={lot.lot}>{lot.lot}</option>)}</select></label>
                        <label>Công việc<input name="activity" required placeholder="Ví dụ: Tưới nước, kiểm tra sâu bệnh" /></label>
                        <label>Ghi chú<textarea name="note" required rows="3" placeholder="Ghi chú tình hình tại vườn..." /></label>
                        <button type="submit">Lưu nhật ký</button>
                      </form>
                    )}
                    <div className="farm-journal-list">
                      {farmJournal.map((entry, index) => <article key={`${entry.lot}-${entry.date}-${index}`}><i>▣</i><div><strong>{entry.activity}</strong><small>{entry.lot} · {entry.date}</small><p>{entry.note}</p></div></article>)}
                      {farmJournal.length === 0 && <p className="catalog-empty">{staffDashboardLoading ? 'Đang tải nhật ký từ SQL…' : 'Chưa có nhật ký canh tác trong cơ sở dữ liệu.'}</p>}
                    </div>
                  </section>
                )}
              </div>
            </div>
            {farmScannerOpen && (
              <div className="farm-scanner-backdrop" role="presentation" onClick={() => { setFarmScannerOpen(false); setFarmCameraPermissionConfirmed(false) }}>
                <section className="farm-scanner-dialog" role="dialog" aria-modal="true" aria-labelledby="farm-scanner-title" onClick={(event) => event.stopPropagation()}>
                  <button type="button" className="farm-scanner-close" aria-label="Đóng" onClick={() => { setFarmScannerOpen(false); setFarmCameraPermissionConfirmed(false) }}>×</button>
                  <h2 id="farm-scanner-title">Quét mã QR lô hàng</h2>
                  {!farmCameraPermissionConfirmed ? (
                    <div className="farm-camera-permission">
                      <span aria-hidden="true">▣</span>
                      <p>Bạn có cho phép trang sử dụng camera để quét mã QR lô hàng không?</p>
                      <small>Camera chỉ được bật sau khi bạn xác nhận.</small>
                      <div>
                        <button type="button" onClick={() => { setFarmScannerOpen(false); setFarmCameraPermissionConfirmed(false) }}>Hủy</button>
                        <button type="button" onClick={() => {
                          farmCameraReadyRef.current = false
                          setFarmCameraReady(false)
                          setFarmScannerMessage('Đang kết nối camera…')
                          setFarmCameraPermissionDenied(false)
                          setFarmCameraPermissionConfirmed(true)
                        }}>Cho phép</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className={`farm-scanner-preview${farmCameraReady ? ' is-ready' : ''}`}>
                        <video ref={farmVideoRef} autoPlay playsInline muted />
                        {!farmCameraReady && <div className="farm-scanner-placeholder"><span>▣</span><small>{farmScannerMessage || 'Đang khởi động camera…'}</small></div>}
                      </div>
                      <p role="status">{farmScannerMessage || 'Đang khởi động camera…'}</p>
                      {farmCameraPermissionDenied && (
                        <div className="farm-camera-permission-help">
                          <small>Mở biểu tượng cài đặt cạnh địa chỉ trang → Quyền trang web → Camera → Cho phép. Sau đó quay lại và thử lại.</small>
                          <button type="button" onClick={() => {
                            setFarmCameraPermissionDenied(false)
                            setFarmScannerMessage('')
                            setFarmCameraPermissionConfirmed(false)
                          }}>Thử lại camera</button>
                        </div>
                      )}
                      <button type="button" onClick={() => { setFarmScannerOpen(false); setFarmCameraPermissionConfirmed(false) }}>Đóng camera</button>
                    </>
                  )}
                  <label className="farm-scan-photo">
                    <span>Hoặc chụp / chọn ảnh mã QR</span>
                    <input type="file" accept="image/*" capture="environment" onChange={async (event) => {
                      const imageFile = event.currentTarget.files?.[0]
                      event.currentTarget.value = ''
                      if (!imageFile) return
                      const imageUrl = URL.createObjectURL(imageFile)
                      setFarmScannerMessage('Đang đọc mã QR trong ảnh…')
                      try {
                        const { BrowserQRCodeReader } = await import('@zxing/browser')
                        const reader = new BrowserQRCodeReader()
                        const result = await reader.decodeFromImageUrl(imageUrl)
                        const scannedText = result.getText().trim()
                        const scannedCode = scannedText.match(/\bLH-\d+\b/i)?.[0] || scannedText
                        setFarmLotCode(scannedCode)
                        setFarmLookupLot(warehouseLots.find((lot) => lot.lot.toLocaleLowerCase('vi') === scannedCode.toLocaleLowerCase('vi')) || null)
                        setFarmLookupSearched(true)
                        setFarmCameraPermissionDenied(false)
                        setFarmScannerOpen(false)
                        setFarmCameraPermissionConfirmed(false)
                      } catch (scanError) {
                        const isCodeNotFound = String(scanError?.name || scanError?.constructor?.name || '').includes('NotFoundException')
                        setFarmScannerMessage(isCodeNotFound ? 'Không tìm thấy mã QR trong ảnh. Hãy chụp rõ mã, đủ sáng và không bị nghiêng.' : 'Không đọc được ảnh QR này. Hãy thử ảnh khác hoặc nhập mã lô thủ công.')
                      } finally {
                        URL.revokeObjectURL(imageUrl)
                      }
                    }} />
                  </label>
                </section>
              </div>
            )}
          </section>
        ) : currentPage === 'admin' ? (
          <section className={`admin-dashboard admin-dashboard-theme-${systemTheme === 'Tối' ? 'dark' : 'light'} admin-dashboard-color-${systemColor === 'Xanh lá' ? 'green' : systemColor === 'Xanh dương' ? 'blue' : 'orange'}`}>
            <aside className="admin-sidebar">
              <a className="admin-brand" href="#" onClick={(event) => { event.preventDefault(); setAdminSection('Tổng quan') }}>
                <span className="admin-brand-mark" aria-hidden="true">
                  <svg viewBox="0 0 32 32" role="img">
                    <path d="M8.2 24.8c1.4-7.8 5.8-14 13.2-18.6" fill="none" stroke="#79b86a" strokeWidth="1.7" strokeLinecap="round"/>
                    <path d="M11.2 16.1C7.8 13.7 7.4 10.6 7.8 8c3.8.7 6.2 2.6 7.1 5.7" fill="#79b86a"/>
                    <path d="M15.4 18.2c-1.3-4.3.1-7.2 2.8-9.2 2.7 2.5 3.4 5.4 1.7 8.6" fill="#79b86a"/>
                    <path d="M13.6 21.2c-3.4.1-5.9-1.2-7.4-3.7 2.7-1.8 5.6-1.8 8.2.1" fill="#79b86a"/>
                    <path d="M16.8 15.7c2.6-3.6 5.6-4.7 8.4-3.8-.5 3.4-2.7 5.5-6.3 6.1" fill="#79b86a"/>
                    <path d="M15.2 18.8c2.5-2.2 5.4-2.8 8.1-1.5-1.2 2.9-3.8 4.4-7.3 3.8" fill="#79b86a"/>
                    <circle cx="8.5" cy="24.6" r="1" fill="#79b86a"/>
                  </svg>
                </span>
                <strong>Nông Sản Việt</strong>
              </a>
              <p className="admin-sidebar-label">MENU</p>
              <nav className="admin-nav" aria-label="Điều hướng quản trị">
                {[
                  ['▦', 'Tổng quan'],
                  ['▥', 'Báo cáo thống kê'],
                  ['▣', 'Quản lý kho hàng'],
                  ['⇧', 'Phiếu xuất kho'],
                  ['△', 'Ghi nhận xuất hủy'],
                  ['♧', 'Quản lý nhân sự'],
                  ['♧', 'Cấu hình cảnh báo'],
                  ['⚙', 'Thiết lập hệ thống'],
                ].map(([icon, title]) => (
                  <button className={adminSection === title ? 'active' : ''} type="button" key={title} onClick={() => setAdminSection(title)}>
                    <span aria-hidden="true">{icon}</span>{title}
                  </button>
                ))}
              </nav>
              <div className="admin-sidebar-user-wrap">
                <button type="button" className="admin-sidebar-user" aria-expanded={adminUserMenuOpen} onClick={() => setAdminUserMenuOpen((open) => !open)}>
                  <span>{(loggedUser || 'MH').charAt(0).toLocaleUpperCase('vi')}</span>
                  <div><strong>{loggedUser || 'Minh Hoàng'}</strong><small>{authRole}</small></div>
                  <i aria-hidden="true">{adminUserMenuOpen ? '⌃' : '⌄'}</i>
                </button>
                {adminUserMenuOpen && (
                  <div className="admin-user-popover">
                    <div className="admin-user-popover-profile">
                      <span>{(loggedUser || 'MH').charAt(0).toLocaleUpperCase('vi')}</span>
                      <div><strong>{loggedUser || 'Minh Hoàng'}</strong><small>{authRole}</small></div>
                    </div>
                    <div className="admin-user-popover-details">
                      <span>Tài khoản<b>{loggedUser ? loggedUser.toLocaleLowerCase('vi').replaceAll(' ', '.') : 'minh.hoang'}</b></span>
                      <span>Trạng thái<b>Đang hoạt động</b></span>
                    </div>
                    <button type="button" onClick={logout}>↪ &nbsp;Đăng xuất</button>
                  </div>
                )}
              </div>
            </aside>
            <div className="admin-main">
              <header className="admin-topbar">
                <div><small>Toàn cảnh vận hành</small><h1>{adminSection}</h1></div>
                <div className="admin-top-actions">
                  <button type="button" className="admin-store-button" onClick={() => { setCurrentPage('home'); window.scrollTo(0, 0) }}>Xem cửa hàng</button>
                </div>
              </header>
              {adminSection === 'Quản lý kho hàng' ? (
                <div className="admin-content admin-warehouse">
                  <div className="admin-warehouse-heading">
                    <div><p>{new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p><h2>Quản lý lô hàng <span>☼</span></h2><small>Chăm chút hôm nay, vun đắp mùa vụ bền vững.</small></div>
                    <div className="admin-warehouse-heading-actions">
                      <button type="button" onClick={() => setWriteOffOpen(true)} className="admin-write-off-button">Ghi nhận hao hụt</button>
                      <button type="button" onClick={() => window.print()} className="admin-export-report">↓ Xuất báo cáo</button>
                    </div>
                  </div>
                  <div className="admin-alert admin-warehouse-alert"><span>▣</span><div><strong>{warehouseLots.filter((item) => ['Cần kiểm tra', 'Sắp hết hạn'].includes(item.status)).length ? 'Một số lô hàng cần kiểm tra' : 'Tình trạng kho hàng'}</strong><small>{warehouseLots.filter((item) => ['Cần kiểm tra', 'Sắp hết hạn'].includes(item.status)).length} lô cần lưu ý theo dữ liệu SQL.</small></div><button type="button" onClick={() => setWarehouseFilter('Sắp hết hạn')}>Kiểm tra kho</button></div>
                  <div className="admin-warehouse-toolbar">
                    <label>⌕ <input value={warehouseSearch} onChange={(event) => setWarehouseSearch(event.target.value)} placeholder="Tìm mã lô hoặc tên nông sản..." /></label>
                    <div>{['Tất cả', 'Còn hàng', 'Sắp hết hạn', 'Cần kiểm tra', 'Hết hàng'].map((filter) => <button type="button" className={warehouseFilter === filter ? 'active' : ''} key={filter} onClick={() => setWarehouseFilter(filter)}>{filter}</button>)}</div>
                  </div>
                  <section className="admin-panel admin-warehouse-table">
                    <div className="admin-warehouse-row admin-warehouse-head"><span>NÔNG SẢN / MÃ LÔ</span><span>NÔNG TRẠI</span><span>GHI NHẬN</span><span>TỒN KHO</span><span>HẠN SỬ DỤNG</span><span>TRẠNG THÁI</span><span /></div>
                    {warehouseLots.filter((item) => {
                      const normalizedSearch = warehouseSearch.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('vi')
                      const searchable = `${item.name} ${item.lot} ${item.farm}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('vi')
                      return (warehouseFilter === 'Tất cả' || item.status === warehouseFilter) && searchable.includes(normalizedSearch)
                    }).map((item) => (
                      <div className="admin-warehouse-row" key={item.lot}>
                        <span className="admin-warehouse-name"><i>{getProductIcon(item.name)}</i><span><strong>{item.name}</strong><small>{item.lot}</small></span></span>
                        <span>{item.farm}</span><span>{item.date}</span><strong>{item.quantity}</strong><span>{item.expiry}</span>
                        <span className={`admin-warehouse-status ${item.status === 'Sắp hết hạn' ? 'warning' : item.status === 'Cần kiểm tra' ? 'check' : 'normal'}`}>● {item.status}</span>
                        <div className="admin-warehouse-actions">
                          <button type="button" onClick={() => setWarehouseDetail(item)}>→</button>
                        </div>
                      </div>
                    ))}
                    {warehouseLots.filter((item) => {
                      const normalizedSearch = warehouseSearch.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('vi')
                      const searchable = `${item.name} ${item.lot} ${item.farm}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('vi')
                      return (warehouseFilter === 'Tất cả' || item.status === warehouseFilter) && searchable.includes(normalizedSearch)
                    }).length === 0 && (
                      <div className="admin-warehouse-empty">Không tìm thấy lô hàng phù hợp.</div>
                    )}
                  </section>
                </div>
              ) : adminSection === 'Phiếu xuất kho' ? (
                <div className="admin-content admin-export-voucher-page">
                  <div className="admin-export-voucher-heading">
                    <div><p>Quản lý xuất kho</p><h2>Phiếu xuất kho</h2><small>Tạo và theo dõi các phiếu xuất nông sản.</small></div>
                    <button type="button" onClick={() => setExportVoucherOpen(true)}>+ Tạo phiếu xuất kho</button>
                  </div>
                  <div className="admin-export-voucher-toolbar">
                    <label>⌕ <input value={exportVoucherSearch} onChange={(event) => setExportVoucherSearch(event.target.value)} placeholder="Tìm mã phiếu, mã lô..." /></label>
                    <span>{exportVoucherRecords.length} phiếu</span>
                  </div>
                  <section className="admin-panel admin-export-voucher-table">
                    <div className="admin-export-voucher-row admin-export-voucher-head"><span>MÃ PHIẾU</span><span>LÔ HÀNG</span><span>SẢN PHẨM</span><span>SỐ LƯỢNG</span><span>LÝ DO</span><span>NGÀY XUẤT</span><span>TRẠNG THÁI</span></div>
                    {exportVoucherRecords.filter((record) => `${record.code} ${record.lot} ${record.name} ${record.destination}`.toLocaleLowerCase('vi').includes(exportVoucherSearch.toLocaleLowerCase('vi'))).map((record) => (
                      <div className="admin-export-voucher-row" key={record.code}>
                        <strong>{record.code}</strong><span>{record.lot}</span><span>{record.name}</span><strong>{record.amount}</strong><span>{record.reason}</span><span>{record.date}</span><span className="admin-export-voucher-status">● {record.status}</span>
                      </div>
                    ))}
                    {exportVoucherRecords.filter((record) => `${record.code} ${record.lot} ${record.name}`.toLocaleLowerCase('vi').includes(exportVoucherSearch.toLocaleLowerCase('vi'))).length === 0 && (
                      <div className="admin-export-voucher-empty">Không tìm thấy phiếu xuất kho phù hợp.</div>
                    )}
                  </section>
                </div>
              ) : adminSection === 'Ghi nhận xuất hủy' ? (
                <div className="admin-content admin-writeoff-page">
                  <div className="admin-writeoff-heading">
                    <div><p>Quản lý hàng không đạt chuẩn</p><h2>Ghi nhận xuất hủy</h2><small>Lập phiếu và theo dõi số lượng đã xuất khỏi kho.</small></div>
                  <button type="button" onClick={() => setWriteOffOpen(true)}>+ Tạo phiếu xuất hủy</button>
                  </div>
                  <div className="admin-writeoff-toolbar">
                    <label>⌕ <input value={writeOffSearch} onChange={(event) => setWriteOffSearch(event.target.value)} placeholder="Tìm mã phiếu, mã lô..." /></label>
                    <span>{writeOffRecords.length} phiếu</span>
                  </div>
                  <section className="admin-panel admin-writeoff-table">
                    <div className="admin-writeoff-row admin-writeoff-head"><span>MÃ PHIẾU</span><span>LÔ HÀNG</span><span>SẢN PHẨM</span><span>SỐ LƯỢNG</span><span>NGUYÊN NHÂN</span><span>NGÀY TẠO</span><span>TRẠNG THÁI</span></div>
                    {writeOffRecords.filter((record) => `${record.code} ${record.lot} ${record.name} ${record.reason}`.toLocaleLowerCase('vi').includes(writeOffSearch.toLocaleLowerCase('vi'))).map((record) => (
                      <div className="admin-writeoff-row" key={record.code}>
                        <strong>{record.code}</strong>
                        <span>{record.lot}</span>
                        <span>{record.name}</span>
                        <strong>{record.amount}</strong>
                        <span>{record.reason}</span>
                        <span>{record.date}</span>
                        <span className="admin-writeoff-status">● {record.status}</span>
                      </div>
                    ))}
                    {writeOffRecords.filter((record) => `${record.code} ${record.lot} ${record.name} ${record.reason}`.toLocaleLowerCase('vi').includes(writeOffSearch.toLocaleLowerCase('vi'))).length === 0 && (
                      <div className="admin-writeoff-empty">Không tìm thấy phiếu xuất hủy phù hợp.</div>
                    )}
                  </section>
                </div>
              ) : adminSection === 'Báo cáo thống kê' ? (
                <div className="admin-content admin-report-content">
                  <div className="admin-report-grid">
                    <section className="admin-panel admin-report-revenue">
                      <div className="admin-panel-heading">
                        <div><small>HIỆU QUẢ KINH DOANH</small><h3>Tăng trưởng kinh doanh</h3></div>
                        <button type="button">{new Date().getFullYear()} ⌄</button>
                      </div>
                      <div className="admin-report-legend"><span>Doanh thu đã thanh toán</span><span>12 tháng gần nhất</span></div>
                      <div className="admin-bars admin-report-bars" aria-label="Doanh thu theo tháng trong SQL">
                        {staffMonthlyRevenue.map((month, index) => {
                          const height = Math.max(4, (month.total / monthlyRevenueMax) * 100)
                          return <div key={month.month}><span style={{ height: `${height}%` }} className={index === staffMonthlyRevenue.length - 1 ? 'highlight' : ''}><b>{Number(month.total).toLocaleString('vi-VN')} đ</b></span><small>T{Number(month.month.slice(5))}</small></div>
                        })}
                        {staffMonthlyRevenue.length === 0 && <p className="catalog-empty">Chưa có doanh thu thanh toán thành công.</p>}
                      </div>
                    </section>
                    <section className="admin-panel admin-report-status">
                      <div className="admin-panel-heading">
                        <div><small>PHÂN BỔ ĐƠN HÀNG</small><h3>Trạng thái đơn hàng</h3></div>
                        <button type="button" aria-label="Xem chi tiết">→</button>
                      </div>
                      <div className="admin-donut-wrap"><div className="admin-donut"><div><strong>{salesOrders.length}</strong><small>đơn hàng</small></div></div><ul><li><i />Đã giao <b>{orderStatusCounts['Đã giao'] || 0}</b></li><li><i />Đang xử lý <b>{(orderStatusCounts['Đang chuẩn bị'] || 0) + (orderStatusCounts['Đã thanh toán'] || 0)}</b></li><li><i />Chờ duyệt <b>{orderStatusCounts['Chờ duyệt'] || 0}</b></li><li><i />Khiếu nại <b>{salesReturnRequests.length}</b></li></ul></div>
                      <p className="admin-report-note">Số liệu hiện tại lấy trực tiếp từ SQL.</p>
                    </section>
                  </div>
                  <div className="admin-report-bottom">
                    <section className="admin-panel admin-report-activity">
                      <div className="admin-panel-heading"><div><h3>Những chuyển động mới</h3><small>Cập nhật từ khắp nông trại đến cửa hàng</small></div><button type="button">Tất cả →</button></div>
                      <div className="admin-activity-list">
                        {salesOrders.slice(0, 2).map((order) => <article key={order.id}><span className="admin-activity-icon approved">✓</span><div><strong>Đơn {order.code} · {order.status}</strong><small>{order.customer} · Bán hàng</small></div><time>{order.total}</time></article>)}
                        {farmJournal.slice(0, 1).map((entry) => <article key={entry.id}><span className="admin-activity-icon stock">♧</span><div><strong>{entry.activity} · {entry.lot}</strong><small>{entry.note}</small></div><time>{entry.date}</time></article>)}
                        {warehouseHistory.slice(0, 1).map((entry) => <article key={`${entry.lot}-${entry.time}`}><span className="admin-activity-icon alert">♧</span><div><strong>{entry.type} · {entry.lot}</strong><small>{entry.name} · {entry.reason || entry.amount}</small></div><time>{entry.time}</time></article>)}
                        {salesOrders.length + farmJournal.length + warehouseHistory.length === 0 && <p className="catalog-empty">Chưa có hoạt động ghi nhận trong SQL.</p>}
                      </div>
                    </section>
                    <section className="admin-panel admin-report-attention">
                      <div className="admin-panel-heading"><div><h3>Một chút lưu tâm</h3><small>Để mọi việc luôn trong tầm tay</small></div><span className="admin-attention-bell">♧</span></div>
                      <div className="admin-attention-list">
                        <button type="button" onClick={() => setAdminSection('Quản lý kho hàng')}><span>▧</span><div><strong>{Number(staffSummary?.low_stock_product_count || 0)} sản phẩm tồn kho thấp</strong><small>Dựa trên tồn kho trong SQL</small></div><b>→</b></button>
                        <button type="button" onClick={() => setAdminSection('Quản lý kho hàng')}><span>▣</span><div><strong>{Number(staffSummary?.expiring_batch_count || 0)} lô gần hết hạn</strong><small>Trong vòng 3 ngày</small></div><b>→</b></button>
                        <button type="button" onClick={() => setAdminSection('Quản lý nhân sự')}><span>♧</span><div><strong>{staffList.length} nhân sự trong hệ thống</strong><small>Nhân sự đang hoạt động: {Number(staffSummary?.active_staff_count || 0)}</small></div><b>→</b></button>
                      </div>
                    </section>
                  </div>
                </div>
              ) : adminSection === 'Tổng quan' ? (
                <div className="admin-content">
                  <div className="admin-welcome">
                    <div><small>{new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</small><h2>Xin chào, {loggedUser || 'bạn'}</h2><p>Đây là những điều quan trọng đang diễn ra hôm nay.</p></div>
                    <button type="button" className="admin-date">▣ &nbsp;Tháng {new Date().getMonth() + 1}/{new Date().getFullYear()}</button>
                  </div>
                  <div className="admin-alert"><span>△</span><div><strong>Quản lý hàng không đạt chuẩn</strong><small>Lập phiếu và ghi nhận số lượng xuất khỏi kho</small></div><button type="button" onClick={() => setAdminSection('Ghi nhận xuất hủy')}>+ Xuất hủy</button></div>
                  <div className="admin-stats">
                    <article className="admin-stat featured"><span>Doanh thu tháng</span><b>{Number(staffSummary?.monthly_revenue || 0).toLocaleString('vi-VN')} đ</b><small>Thanh toán thành công trong tháng</small><i>▥</i></article>
                    <article className="admin-stat"><span>Đơn hàng</span><b>{Number(staffSummary?.order_count || 0)}</b><small><em>{Number(staffSummary?.pending_order_count || 0)}</em> đơn chờ duyệt</small><i>♧</i></article>
                    <article className="admin-stat"><span>Sản phẩm đang bán</span><b>{Number(staffSummary?.active_product_count || 0)}</b><small><em>{Number(staffSummary?.available_product_count || 0)}</em> còn hàng</small><i>⬡</i></article>
                    <article className="admin-stat"><span>Nhân sự hoạt động</span><b>{Number(staffSummary?.active_staff_count || 0)}</b><small>{staffList.length} tài khoản nhân viên</small><i>♧</i></article>
                  </div>
                  <div className="admin-analytics">
                    <section className="admin-panel admin-revenue">
                      <div className="admin-panel-heading"><div><small>Hiệu quả kinh doanh</small><h3>Doanh thu theo tháng</h3></div><span>12 tháng gần nhất</span></div>
                      <div className="admin-bars" aria-label="Doanh thu theo tháng trong SQL">
                        {staffMonthlyRevenue.map((month, index) => {
                          const height = Math.max(4, (month.total / monthlyRevenueMax) * 100)
                          return <div key={month.month}><span style={{ height: `${height}%` }} className={index === staffMonthlyRevenue.length - 1 ? 'highlight' : ''}><b>{Number(month.total).toLocaleString('vi-VN')} đ</b></span><small>T{Number(month.month.slice(5))}</small></div>
                        })}
                        {staffMonthlyRevenue.length === 0 && <p className="catalog-empty">Chưa có doanh thu thanh toán thành công.</p>}
                      </div>
                    </section>
                    <section className="admin-panel admin-order-status">
                      <div className="admin-panel-heading"><div><small>Phân bổ đơn hàng</small><h3>Trạng thái đơn hàng</h3></div><button type="button">Chi tiết</button></div>
                      <div className="admin-donut-wrap"><div className="admin-donut"><div><strong>{salesOrders.length}</strong><small>đơn hàng</small></div></div><ul><li>Đã giao <b>{orderStatusCounts['Đã giao'] || 0}</b></li><li>Đang xử lý <b>{(orderStatusCounts['Đang chuẩn bị'] || 0) + (orderStatusCounts['Đã thanh toán'] || 0)}</b></li><li>Chờ duyệt <b>{orderStatusCounts['Chờ duyệt'] || 0}</b></li><li>Khiếu nại <b>{salesReturnRequests.length}</b></li></ul></div>
                    </section>
                  </div>
                  <div className="admin-bottom-panels">
                    <section className="admin-panel admin-report-activity">
                      <div className="admin-panel-heading"><div><h3>Những chuyển động mới</h3><small>Cập nhật từ khắp nông trại đến cửa hàng</small></div><button type="button">Tất cả →</button></div>
                      <div className="admin-activity-list">
                        {salesOrders.slice(0, 2).map((order) => <article key={order.id}><span className="admin-activity-icon approved">✓</span><div><strong>Đơn {order.code} · {order.status}</strong><small>{order.customer} · Bán hàng</small></div><time>{order.total}</time></article>)}
                        {farmJournal.slice(0, 1).map((entry) => <article key={entry.id}><span className="admin-activity-icon stock">♧</span><div><strong>{entry.activity} · {entry.lot}</strong><small>{entry.note}</small></div><time>{entry.date}</time></article>)}
                        {warehouseHistory.slice(0, 1).map((entry) => <article key={`${entry.lot}-${entry.time}`}><span className="admin-activity-icon alert">♧</span><div><strong>{entry.type} · {entry.lot}</strong><small>{entry.name} · {entry.reason || entry.amount}</small></div><time>{entry.time}</time></article>)}
                        {salesOrders.length + farmJournal.length + warehouseHistory.length === 0 && <p className="catalog-empty">Chưa có hoạt động ghi nhận trong SQL.</p>}
                      </div>
                    </section>
                    <section className="admin-panel admin-report-attention">
                      <div className="admin-panel-heading"><div><h3>Một chút lưu tâm</h3><small>Để mọi việc luôn trong tầm tay</small></div><span className="admin-attention-bell">♧</span></div>
                      <div className="admin-attention-list">
                        <button type="button" onClick={() => setAdminSection('Quản lý kho hàng')}><span>▧</span><div><strong>{Number(staffSummary?.low_stock_product_count || 0)} sản phẩm tồn kho thấp</strong><small>Dựa trên tồn kho trong SQL</small></div><b>→</b></button>
                        <button type="button" onClick={() => setAdminSection('Quản lý kho hàng')}><span>▣</span><div><strong>{Number(staffSummary?.expiring_batch_count || 0)} lô gần hết hạn</strong><small>Trong vòng 3 ngày</small></div><b>→</b></button>
                        <button type="button" onClick={() => setAdminSection('Quản lý nhân sự')}><span>♧</span><div><strong>{staffList.length} nhân sự trong hệ thống</strong><small>Nhân sự đang hoạt động: {Number(staffSummary?.active_staff_count || 0)}</small></div><b>→</b></button>
                      </div>
                    </section>
                  </div>
                  <section className="admin-panel admin-inventory">
                    <div className="admin-panel-heading">
                      <div><h3>Nông sản trong kho</h3><small>Theo dõi chất lượng, giữ trọn tươi ngon</small></div>
                      <label className="admin-inventory-search">⌕<input value={inventorySearch} onChange={(event) => setInventorySearch(event.target.value)} aria-label="Tìm nông sản" placeholder="Tìm nông sản, mã lô..." /></label>
                    </div>
                    <div className="admin-inventory-table" role="table">
                      <div className="admin-inventory-row admin-inventory-head" role="row"><span>NÔNG SẢN / MÃ LÔ</span><span>NÔNG TRẠI</span><span>TỒN KHO</span><span>HẠN SỬ DỤNG</span><span>TRẠNG THÁI</span><span /></div>
                      {warehouseLots.filter((item) => `${item.name} ${item.lot} ${item.farm}`.toLocaleLowerCase('vi').includes(inventorySearch.toLocaleLowerCase('vi'))).map((item) => {
                        const statusType = item.status === 'Sắp hết hạn' ? 'warning' : item.status === 'Cần kiểm tra' ? 'check' : 'normal'
                        const emoji = getProductIcon(item.name)
                        return (
                          <div className="admin-inventory-row" role="row" key={item.lot}>
                            <span className="admin-inventory-name"><i>{emoji}</i><span><strong>{item.name}</strong><small>{item.lot}</small></span></span>
                            <span>{item.farm}</span><span>{item.quantity}</span><span>{item.expiry}</span>
                            <span className={`admin-stock-status ${statusType}`}>● {item.status}</span>
                            <button type="button" aria-label={`Xem ${item.name}`}>→</button>
                          </div>
                        )
                      })}
                      {warehouseLots.length === 0 && <p className="catalog-empty">{staffDashboardLoading ? 'Đang tải tồn kho từ SQL…' : 'Chưa có lô hàng trong cơ sở dữ liệu.'}</p>}
                    </div>
                  </section>
                </div>
              ) : (
                adminSection === 'Thiết lập hệ thống' ? (
                  <div className={`admin-content admin-system-settings admin-theme-${systemTheme === 'Tối' ? 'dark' : 'light'} admin-color-${systemColor === 'Xanh lá' ? 'green' : systemColor === 'Xanh dương' ? 'blue' : 'orange'}`}>
                    <div className="admin-system-heading">
                      <div><p>Giao diện vận hành</p><h2>Thiết lập hệ thống</h2><small>Tuỳ chỉnh chế độ hiển thị và màu chủ đạo.</small></div>
                    </div>
                    <section className="admin-panel admin-system-card">
                      <div className="admin-panel-heading"><div><h3>Giao diện</h3><small>Chọn chế độ sáng hoặc tối</small></div></div>
                      <div className="admin-theme-options">
                        {['Sáng', 'Tối'].map((theme) => (
                          <button type="button" className={systemTheme === theme ? 'active' : ''} key={theme} onClick={() => { setSystemTheme(theme); localStorage.setItem('adminTheme', theme) }}>
                            <span className={`admin-theme-preview ${theme === 'Tối' ? 'dark' : ''}`}><i /><i /><i /></span>
                            <strong>{theme}</strong>
                            <small>{theme === 'Sáng' ? 'Nền sáng, dễ đọc ban ngày' : 'Nền tối, dịu mắt ban đêm'}</small>
                          </button>
                        ))}
                      </div>
                    </section>
                    <section className="admin-panel admin-system-card">
                      <div className="admin-panel-heading"><div><h3>Màu chủ đạo</h3><small>Thay đổi tông màu chính của hệ thống</small></div></div>
                      <div className="admin-color-options">
                        {[
                          ['Xanh lá', '#2b6b48'],
                          ['Xanh dương', '#3e6e91'],
                          ['Cam', '#c27645'],
                        ].map(([color, value]) => (
                          <button type="button" className={systemColor === color ? 'active' : ''} key={color} onClick={() => { setSystemColor(color); localStorage.setItem('adminColor', color) }}>
                            <i style={{ background: value }} />
                            <strong>{color}</strong>
                          </button>
                        ))}
                      </div>
                    </section>
                  </div>
                ) : adminSection === 'Cấu hình cảnh báo' ? (
                  <div className="admin-content admin-alert-config">
                    <div className="admin-alert-config-heading">
                      <div><p>Quy tắc giám sát</p><h2>Cấu hình cảnh báo</h2><small>Giá trị được đọc từ bảng cấu hình SQL.</small></div>
                      <button type="button" disabled title="Chưa có API cập nhật cấu hình">Chỉ xem dữ liệu</button>
                    </div>
                    <section className="admin-panel admin-alert-config-list">
                      <div className="admin-alert-config-list-heading"><div><h3>Danh mục cảnh báo</h3><small>{alertList.length} quy tắc trong SQL</small></div></div>
                      {alertList.map((alert, index) => (
                        <div className="admin-alert-config-row" key={`${alert.title}-${index}`}>
                          <span className="admin-alert-config-icon">♧</span>
                          <div className="admin-alert-config-info"><strong>{alert.title}</strong><small>{alert.condition}: <b>{alert.threshold}</b></small></div>
                          <label className="admin-alert-toggle">
                            <input type="checkbox" checked={alert.enabled} disabled />
                            <span />
                          </label>
                        </div>
                      ))}
                      {alertList.length === 0 && <p className="catalog-empty">{staffDashboardLoading ? 'Đang tải cấu hình từ SQL…' : 'Chưa có cấu hình cảnh báo trong cơ sở dữ liệu.'}</p>}
                    </section>
                  </div>
                ) : adminSection === 'Quản lý nhân sự' ? (
                  <div className="admin-content admin-staff">
                    <div className="admin-staff-heading">
                      <div><p>Đội ngũ vận hành</p><h2>Quản lý nhân sự</h2><small>Danh sách nhân sự từ database.</small></div>
                      <button type="button" disabled title="Chưa có API tạo tài khoản nhân viên">Chỉ xem dữ liệu</button>
                    </div>
                    <div className="admin-staff-toolbar">
                      <label>⌕ <input value={staffSearch} onChange={(event) => setStaffSearch(event.target.value)} placeholder="Tìm tên hoặc vai trò..." /></label>
                      <span>{staffList.length} nhân sự</span>
                    </div>
                    <section className="admin-panel admin-staff-table">
                      <div className="admin-staff-row admin-staff-head"><span>NHÂN VIÊN</span><span>VAI TRÒ</span><span>ĐƠN VỊ CÔNG TÁC</span><span>SỐ ĐIỆN THOẠI</span><span>TRẠNG THÁI</span></div>
                      {staffList.filter((person) => `${person.name} ${person.role} ${person.department}`.toLocaleLowerCase('vi').includes(staffSearch.toLocaleLowerCase('vi'))).map((person) => (
                        <div className="admin-staff-row" key={`${person.name}-${person.phone}`}>
                          <span className="admin-staff-name"><i>{person.name.charAt(0).toLocaleUpperCase('vi')}</i><strong>{person.name}</strong></span>
                          <span>{person.role}</span>
                          <span>{person.department}</span>
                          <span>{person.phone}</span>
                          <span className="admin-staff-status">● {person.status}</span>
                        </div>
                      ))}
                      {staffList.length === 0 && <p className="catalog-empty">{staffDashboardLoading ? 'Đang tải nhân sự từ SQL…' : 'Chưa có tài khoản nhân viên trong cơ sở dữ liệu.'}</p>}
                    </section>
                  </div>
                ) : (
                  <div className="admin-content admin-section-placeholder">
                    <p>KHÔNG GIAN LÀM VIỆC</p><h2>{adminSection}</h2><span>Khu vực quản lý {adminSection.toLocaleLowerCase('vi')}.</span>
                  </div>
                )
              )}
              {writeOffOpen && (
                <div className="admin-modal-backdrop" role="presentation" onMouseDown={() => { setWriteOffOpen(false); setWriteOffPreview(''); setWriteOffProof('') }}>
                  <form className="admin-warehouse-modal" onMouseDown={(event) => event.stopPropagation()} onSubmit={(event) => {
                    event.preventDefault()
                    const data = new FormData(event.currentTarget)
                    const selectedLot = String(data.get('lot') || '')
                    const lostAmount = Number(data.get('amount'))
                    if (!Number.isFinite(lostAmount) || lostAmount < 1) return
                    const selectedItem = warehouseLots.find((item) => item.lot === selectedLot)
                    if (!selectedItem) return
                    const currentAmount = lotQuantityValue(selectedItem)
                    if (lostAmount > currentAmount) return
                    setWarehouseLots((lots) => lots.map((item) => {
                      if (item.lot !== selectedLot) return item
                      const remaining = lotQuantityValue(item) - lostAmount
                      return { ...item, quantityValue: remaining, quantity: formatLotQuantity(remaining, item.unit), status: remaining === 0 ? 'Hết hàng' : item.status, date: formatSqlDate(new Date().toISOString()) }
                    }))
                    setWarehouseHistory((history) => [{ type: 'Ghi nhận hao hụt', lot: selectedItem.lot, name: selectedItem.name, amount: `-${lostAmount} kg`, time: '25/11/2026 · vừa xong' }, ...history])
                    const reason = String(data.get('reason') || 'Hàng không đạt chuẩn')
                    setWriteOffRecords((records) => [{
                      code: `XH-2026-${String(records.length + 1).padStart(3, '0')}`,
                      lot: selectedItem.lot,
                      name: selectedItem.name,
                      amount: `${lostAmount} kg`,
                      reason,
                      date: '25/11/2026',
                      status: 'Đã ghi nhận',
                    }, ...records])
                    setWriteOffOpen(false)
                    setWriteOffPreview('')
                    setWriteOffProof('')
                  }}>
                    <div className="admin-panel-heading"><div><h3>Ghi nhận hao hụt</h3><small>Ghi nhận nông sản không đạt chất lượng để cập nhật số lượng tồn kho.</small></div><button type="button" onClick={() => setWriteOffOpen(false)}>×</button></div>
                    <label>Lô hàng
                      <select name="lot">{warehouseLots.map((item) => <option key={item.lot} value={item.lot}>{item.lot} · {item.name} ({item.quantity})</option>)}</select>
                    </label>
                    <label>Số lượng hao hụt (kg)<input name="amount" type="number" min="1" required placeholder="Ví dụ: 5" /></label>
                    <label>Nguyên nhân<textarea name="reason" rows="3" required placeholder="Dập, hỏng trong quá trình bảo quản">Dập, hỏng trong quá trình bảo quản</textarea></label>
                    <label>Ảnh minh chứng (không bắt buộc)
                      <input className="admin-proof-input" type="file" accept="image/*" onChange={(event) => {
                        const file = event.target.files?.[0]
                        if (!file) return
                        setWriteOffProof(file.name)
                        setWriteOffPreview(URL.createObjectURL(file))
                      }} />
                    </label>
                    {writeOffPreview && <div className="admin-proof-preview"><img src={writeOffPreview} alt="Ảnh minh chứng hao hụt" /><span>{writeOffProof}</span></div>}
                    <p className="admin-proof-note">Thông tin chi tiết trong phiếu ghi nhận được lưu để tiện theo dõi.</p>
                    <button className="admin-modal-submit" type="submit">Xác nhận ghi nhận</button>
                  </form>
                </div>
              )}
            </div>
          </section>
        ) : currentPage === 'about' ? (
          <section className="about-page">
            <div className="about-inner">
              <section className="about-hero">
                <div className="about-hero-copy">
                  <p className="about-kicker">TỪ NÔNG TRẠI ĐẾN BÀN ĂN</p>
                  <h1>Nuôi dưỡng<br/><em>những điều lành.</em></h1>
                  <p>Chúng tôi mang những sản vật tử tế từ cánh đồng Việt đến căn bếp của bạn — tươi mới, minh bạch và thuận theo tự nhiên.</p>
                  <a href="#about-story">Khám phá câu chuyện <span aria-hidden="true">→</span></a>
                </div>
                <div className="about-hero-image">
                  <img src={img.hero} alt="Cánh đồng nông trại xanh trong nắng sớm" />
                  <div className="about-quality"><strong>100%</strong><span>THUẦN TỰ NHIÊN</span></div>
                  <small>NÔNG SẢN VIỆT · TỪ ĐẤT LÀNH</small>
                </div>
              </section>

              <section className="about-story" id="about-story">
                <div>
                  <p className="about-kicker">01 — CHÚNG TÔI LÀ AI</p>
                  <h2>Trân trọng đất mẹ,<br/>gìn giữ vị nguyên bản.</h2>
                </div>
                <div className="about-story-copy">
                  <p>Nông Sản Việt được sinh ra từ một niềm tin giản dị: thực phẩm ngon nhất là thực phẩm được lớn lên đúng cách. Không vội vàng, không đánh đổi, chúng tôi kiên nhẫn cùng người nông dân chăm đất khỏe, giữ nguồn nước lành.</p>
                  <p>Mỗi sản phẩm đều có câu chuyện và nguồn gốc rõ ràng. Đó là cách chúng tôi kết nối người trồng và người dùng bằng sự tử tế.</p>
                  <em>Nông Sản Việt</em>
                </div>
              </section>

              <section className="about-values">
                <img src={img.vegetables} alt="Nông sản tươi được thu hoạch tại vườn" />
                <div>
                  <p className="about-kicker">02 — ĐIỀU CHÚNG TÔI TIN</p>
                  <h2>Ba giá trị<br/>không thỏa hiệp.</h2>
                  <div className="about-value-list">
                    <article><span>01</span><div><h3>Tử tế với đất</h3><p>Nuôi dưỡng đất khỏe và trân trọng nguồn nước tự nhiên.</p></div></article>
                    <article><span>02</span><div><h3>Minh bạch nguồn gốc</h3><p>Rõ ràng về vùng trồng, mùa vụ và hành trình sản phẩm.</p></div></article>
                    <article><span>03</span><div><h3>Chọn điều lành</h3><p>Ưu tiên nông sản tươi ngon, an tâm cho mỗi bữa ăn.</p></div></article>
                  </div>
                </div>
              </section>

              <section className="about-journey">
                <div className="about-journey-heading">
                  <div><p className="about-kicker">03 — HÀNH TRÌNH MỖI NGÀY</p><h2>Từ một mầm xanh<br/>đến bữa cơm nhà.</h2></div>
                </div>
                <div className="about-steps">
                  {[
                    ['01', '⌁', 'Chọn vùng trồng', 'Đất sạch, nguồn nước lành và người trồng chung một cam kết.'],
                    ['02', '◌', 'Chăm theo mùa', 'Tôn trọng nhịp tự nhiên, giảm tác động lên hệ sinh thái.'],
                    ['03', '◇', 'Thu hoạch sớm', 'Chọn bằng tay vào sáng sớm khi nông sản tươi ngon nhất.'],
                    ['04', '□', 'Giao tận tay', 'Đóng gói tối giản và chuyển nhanh đến căn bếp của bạn.'],
                  ].map(([number, icon, title, description]) => (
                    <article key={number}><span>{number}</span><b aria-hidden="true">{icon}</b><h3>{title}</h3><p>{description}</p></article>
                  ))}
                </div>
              </section>
            </div>
          </section>
        ) : currentPage === 'contact' ? (
          <section className="contact-page">
            <div className="contact-content">
              <section className="farm-directory">
                <div className="farm-directory-heading">
                  <p className="contact-eyebrow">Gần bạn, từ nông trại</p>
                  <h2>Ghé thăm các nông trại của chúng mình</h2>
                  <span>Chọn điểm đến gần bạn để xem thông tin và liên hệ trực tiếp.</span>
                </div>
                {showContactForm && (
                  <form ref={contactFormRef} className="contact-form" onSubmit={(event) => { event.preventDefault(); setContactSubmitted(true) }}>
                    <div className="contact-form-heading">
                      <div><p>{selectedFarm || 'Chọn nông trại cần liên hệ'}</p><h2>Liên hệ nông trại</h2></div>
                      <button className="contact-form-close" type="button" onClick={() => setShowContactForm(false)} aria-label="Đóng biểu mẫu">×</button>
                    </div>
                    <div className="contact-fields-row">
                      <label>Họ và tên<input name="name" required placeholder="Tên của bạn" /></label>
                      <label>Số điện thoại<input name="phone" type="tel" required placeholder="090 123 4567" /></label>
                    </div>
                    <label>Nông trại bạn quan tâm
                      <select name="farm" value={selectedFarm} onChange={(event) => setSelectedFarm(event.target.value)} required>
                        <option value="" disabled>Chọn nông trại</option>
                        {farmLocations.map((farm) => <option key={farm.name}>{farm.name}</option>)}
                      </select>
                    </label>
                    <label>Lời nhắn<textarea name="message" required placeholder="Bạn muốn gửi lời nhắn gì?" rows="4" /></label>
                    <button className="contact-submit" type="submit">Gửi lời nhắn</button>
                    <p className={`contact-note${contactSubmitted ? ' submitted' : ''}`} role="status">
                      {contactSubmitted ? 'Cảm ơn bạn! Lời nhắn đã được ghi nhận trong bản demo này.' : 'Bằng cách gửi, bạn đồng ý để Store liên hệ lại qua thông tin trên.'}
                    </p>
                  </form>
                )}
                <div className="farm-location-grid">
                  {farmLocations.map((farm) => (
                    <article className="farm-location-card" key={farm.name}>
                      <span className="farm-location-icon" aria-hidden="true">⌖</span>
                      <p>{farm.region}</p>
                      <h3>{farm.name}</h3>
                      <address>{farm.address}</address>
                      <div><span>Giờ tham quan</span><strong>{farm.hours}</strong></div>
                      <a href={`tel:${farm.phone.replaceAll(' ', '')}`}>☎ {farm.phone}</a>
                      <button className="farm-contact-button" type="button" onClick={() => chooseFarm(farm.name)}>Liên hệ nông trại →</button>
                    </article>
                  ))}
                </div>
                <p className="farm-directory-note">Thông tin địa điểm đang là nội dung minh họa; vui lòng liên hệ trước khi ghé thăm.</p>
              </section>
            </div>
          </section>
        ) : currentPage === 'checkout' ? (
          <section className="checkout-page">
            <div className="checkout-shell">
              <div className="checkout-topline">
                <button type="button" className="checkout-back" onClick={() => { setCurrentPage('products'); setCheckoutComplete(false) }}>Quay lại cửa hàng</button>
                <span>✓ &nbsp;Thanh toán an toàn</span>
              </div>
              <p className="checkout-eyebrow">{checkoutComplete ? 'Đơn hàng đã được tạo' : 'Hoàn tất đơn hàng'}</p>
              <h1 className="checkout-title">{checkoutComplete ? 'Cảm ơn bạn!' : 'Thanh toán'}</h1>
              <div className="checkout-progress" aria-label="Tiến trình thanh toán">
                <span className="complete">✓ Giỏ hàng</span><i />
                <span className={checkoutComplete ? 'complete' : 'active'}>{checkoutComplete ? '✓' : '2'} Thông tin</span><i />
                <span className={checkoutComplete ? 'complete' : ''}>{checkoutComplete ? '✓' : '3'} Hoàn tất</span>
              </div>

              {checkoutComplete ? (
                <section className="checkout-success" role="status">
                  <span>✓</span>
                  <h2>{paymentMethod === 'card' ? 'Đơn hàng đã được tạo' : 'Đặt hàng thành công!'}</h2>
                  <p>Đơn hàng <strong>{createdOrder?.ma_don}</strong> đã được ghi nhận trên hệ thống.</p>
                  {orderMessage && <p role="alert">{orderMessage}</p>}
                  <div className="checkout-success-grid">
                    <div className="checkout-success-info">
                      <h3>Thông tin nhận hàng</h3>
                      <p><strong>{savedDeliveryInfo.recipient || 'Chưa cung cấp'}</strong></p>
                      <p>{savedDeliveryInfo.phone || 'Chưa có số điện thoại'}</p>
                      <p>{savedDeliveryInfo.address || 'Chưa có địa chỉ'}{savedDeliveryInfo.district ? `, ${savedDeliveryInfo.district}` : ''}{savedDeliveryInfo.city ? `, ${savedDeliveryInfo.city}` : ''}</p>
                      {savedDeliveryInfo.note && <p>Ghi chú: {savedDeliveryInfo.note}</p>}
                    </div>
                    <div className="checkout-success-order">
                      <h3>Sản phẩm đã đặt</h3>
                      {completedCartItems.map((item) => (
                        <div className="checkout-success-item" key={item.name}>
                          <span>{item.name} × {item.quantity}</span>
                          <strong>{formatPrice(item.unitPrice * item.quantity)}</strong>
                        </div>
                      ))}
                      <div className="checkout-success-total">
                        <span>Thanh toán</span>
                        <strong>{formatPrice(createdOrder?.tong_thanh_toan ?? checkoutTotal)}</strong>
                      </div>
                      <p>{paymentMethod === 'bank'
                        ? 'VietQR · đang chờ xác nhận thanh toán'
                        : paymentMethod === 'card'
                          ? createdOrder?.trang_thai === 'da_thanh_toan'
                            || paymentInfo?.payment?.trang_thai === 'thanh_cong'
                            ? 'VNPAY · đã thanh toán'
                            : paymentInfo?.payment?.trang_thai === 'cho_xu_ly'
                              ? 'VNPAY · đang chờ xác nhận thanh toán'
                              : 'VNPAY · chưa khởi tạo được giao dịch'
                          : 'Thanh toán khi nhận hàng · đang chờ duyệt'}</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => { setCurrentPage('home'); setCheckoutComplete(false); setCreatedOrder(null); setPaymentInfo(null); setCouponDiscount(0); setCouponInput('') }}>Tiếp tục mua sắm</button>
                </section>
              ) : (
                <form className="checkout-layout" onSubmit={submitOrder}>
                  <div className="checkout-details">
                    <section className="checkout-card delivery-card">
                      <p className="checkout-step">Bước 1</p>
                      <h2><span>⌖</span> Thông tin nhận hàng</h2>
                      {deliveryInfoSaved ? (
                        <div className="checkout-saved-info" role="status">
                          <span aria-hidden="true">✓</span>
                          <p>Thông tin nhận hàng đã được lưu.</p>
                          <button type="button" onClick={() => { setDeliveryInfoSaved(false); setDeliveryInfoMessage('') }}>Chỉnh sửa</button>
                        </div>
                      ) : (
                        <>
                      <div className="checkout-fields-two">
                        <label>Họ và tên<input name="recipient" required value={savedDeliveryInfo.recipient || ''} onChange={(event) => updateDeliveryInfo('recipient', event.target.value)} placeholder="Nguyễn Minh Anh" /></label>
                        <label>Số điện thoại<input name="phone" type="tel" required value={savedDeliveryInfo.phone || ''} onChange={(event) => updateDeliveryInfo('phone', event.target.value)} placeholder="090 123 4567" /></label>
                      </div>
                      <label>Địa chỉ nhận hàng<input name="address" required value={savedDeliveryInfo.address || ''} onChange={(event) => updateDeliveryInfo('address', event.target.value)} placeholder="Số nhà, tên đường, phường/xã" /></label>
                      <div className="checkout-fields-two">
                        <label>Tỉnh/Thành phố<select name="city" required value={savedDeliveryInfo.city || ''} onChange={(event) => updateDeliveryInfo('city', event.target.value)}><option value="" disabled>Chọn tỉnh thành</option><option>TP. Hồ Chí Minh</option><option>Hà Nội</option><option>Đà Lạt - Lâm Đồng</option><option>Cần Thơ</option></select></label>
                        <label>Quận/Huyện<input name="district" required value={savedDeliveryInfo.district || ''} onChange={(event) => updateDeliveryInfo('district', event.target.value)} placeholder="Chọn quận huyện" /></label>
                      </div>
                      <label>Ghi chú (Không bắt buộc)<textarea name="note" value={savedDeliveryInfo.note || ''} onChange={(event) => updateDeliveryInfo('note', event.target.value)} placeholder="Ví dụ: Giao giờ hành chính ..." rows="3" /></label>
                      <div className="checkout-save-info-row">
                        <button className="checkout-save-info" type="button" onClick={(event) => {
                          const form = event.currentTarget.closest('form')
                          if (form) saveDeliveryInfo(form)
                        }}>Lưu thông tin</button>
                        {deliveryInfoMessage && <span role="status">{deliveryInfoMessage}</span>}
                      </div>
                        </>
                      )}
                    </section>

                    <section className="checkout-card">
                      <p className="checkout-step">Bước 2</p>
                      <h2>Phí giao hàng theo địa chỉ</h2>
                      <p>{shippingQuoteLoading ? 'Đang tính phí giao hàng…' : shippingQuote ? `${shippingQuote.khoang_cach_km} km · ${formatPrice(shippingQuote.phi_van_chuyen)}` : 'Nhập địa chỉ nhận hàng để hệ thống tính phí.'}</p>
                    </section>

                    <section className="checkout-card">
                      <p className="checkout-step">Bước 3</p>
                      <h2>Phương thức thanh toán</h2>
                      <div className="checkout-payment-options">
                        <label className={`checkout-payment${paymentMethod === 'cash' ? ' selected' : ''}`}>
                          <input type="radio" name="payment" value="cash" checked={paymentMethod === 'cash'} onChange={() => setPaymentMethod('cash')} />
                          <span><strong>Thanh toán khi nhận hàng</strong><small>Tiền mặt hoặc chuyển khoản cho người giao</small></span><b>COD</b>
                        </label>
                        <label className={`checkout-payment${paymentMethod === 'bank' ? ' selected' : ''}`}>
                          <input type="radio" name="payment" value="bank" checked={paymentMethod === 'bank'} onChange={() => setPaymentMethod('bank')} />
                          <span><strong>Chuyển khoản ngân hàng</strong><small>Quét mã QR sau khi xác nhận đơn</small></span><b>QR</b>
                        </label>
                        <label className={`checkout-payment${paymentMethod === 'card' ? ' selected' : ''}`}>
                          <input type="radio" name="payment" value="card" checked={paymentMethod === 'card'} onChange={() => setPaymentMethod('card')} />
                          <span><strong>Thẻ tín dụng / ghi nợ</strong><small>Thanh toán an toàn qua VNPAY sandbox</small></span><b>VISA</b>
                        </label>
                      </div>
                    </section>
                  </div>

                  <aside className="checkout-summary">
                    <div className="checkout-summary-heading"><h2>Đơn hàng của bạn</h2><span>{cartItems.reduce((sum, item) => sum + item.quantity, 0)} món</span></div>
                    <div className="checkout-summary-items">
                      {cartItems.map((item) => (
                        <article key={item.cartId} className="checkout-summary-item">
                          <img src={item.image} alt="" />
                          <div><h3>{item.name}</h3><p>{item.quantity} kg · {item.category}</p><strong>{formatPrice(item.unitPrice * item.quantity)}</strong></div>
                        </article>
                      ))}
                    </div>
                    <div className="checkout-coupon">
                      <input value={couponInput} onChange={(event) => setCouponInput(event.target.value)} placeholder="Mã ưu đãi" aria-label="Mã ưu đãi" />
                      <button type="button" onClick={applyCoupon}>Áp dụng</button>
                    </div>
                    {couponMessage && <p className={`checkout-coupon-message${couponDiscount ? ' success' : ''}`} role="status">{couponMessage}</p>}
                    <div className="checkout-costs">
                      <div><span>Tạm tính</span><strong>{formatPrice(cartSubtotal)}</strong></div>
                      <div><span>Phí giao hàng</span><strong>{formatPrice(checkoutShipping)}</strong></div>
                      {couponDiscount > 0 && <div><span>Ưu đãi</span><strong>−{formatPrice(couponDiscount)}</strong></div>}
                    </div>
                    <div className="checkout-order-total"><span>Tổng cộng</span><strong>{formatPrice(checkoutTotal)}</strong></div>
                    {orderMessage && <p role="alert">{orderMessage}</p>}
                    <button className="checkout-submit" type="submit" disabled={checkoutSubmitting || shippingQuoteLoading || !shippingQuote || !cartItems.length}>
                      {checkoutSubmitting ? 'ĐANG TẠO ĐƠN…' : `Đặt hàng · ${formatPrice(checkoutTotal)}`}
                    </button>
                    <p className="checkout-secure-note">Thông tin của bạn được bảo mật và mã hóa an toàn.</p>
                  </aside>
                </form>
              )}
            </div>
            {qrPaymentOpen && (
              <div className="qr-payment-backdrop" role="dialog" aria-modal="true" aria-labelledby="qr-payment-title" onMouseDown={(event) => {
                if (event.target === event.currentTarget) setQrPaymentOpen(false)
              }}>
                <section className="qr-payment-modal">
                  <button className="qr-payment-close" type="button" aria-label="Đóng" onClick={() => setQrPaymentOpen(false)}>×</button>
                  <p className="qr-payment-kicker">THANH TOÁN NHANH</p>
                  <h2 id="qr-payment-title">Quét mã để thanh toán</h2>
                  <p className="qr-payment-description">Mở ứng dụng ngân hàng hoặc ví điện tử, chọn quét QR và kiểm tra thông tin trước khi xác nhận.</p>
                  <div className="qr-payment-code">
                    <span className="qr-corner qr-corner-tl" />
                    <span className="qr-corner qr-corner-tr" />
                    <span className="qr-corner qr-corner-bl" />
                    <span className="qr-corner qr-corner-br" />
                    {(paymentInfo?.qr_image_url || paymentQrImage) && (
                      <img src={paymentInfo.qr_image_url || paymentQrImage} alt="Mã QR thanh toán từ backend" />
                    )}
                  </div>
                  {paymentInfo?.payment_url && <a href={paymentInfo.payment_url} target="_blank" rel="noreferrer">Mở trang thanh toán</a>}
                  {!paymentInfo?.qr_image_url && !paymentInfo?.qr_payload && <p>Backend chưa trả về mã QR hoặc đường dẫn thanh toán.</p>}
                  {paymentInfo?.payment?.ma_giao_dich && <p>Mã giao dịch: {paymentInfo.payment.ma_giao_dich}</p>}
                  <button className="qr-payment-confirm" type="button" onClick={() => setQrPaymentOpen(false)}>Đóng · đơn đang chờ xác nhận thanh toán</button>
                  <p className="qr-payment-security"><span aria-hidden="true">▣</span> Trạng thái thanh toán chỉ được cập nhật khi backend nhận xác nhận hợp lệ.</p>
                </section>
              </div>
            )}
          </section>
        ) : currentPage === 'cart' ? (
          <section className="cart-page">
            <div className="cart-panel">
              <header className="cart-heading">
                <a className="cart-logo" href="#" onClick={(event) => { event.preventDefault(); setCurrentPage('home') }}>
                  <span aria-hidden="true">🌿</span><span><strong>Nông Sản Việt</strong><small>Nông trại xanh</small></span>
                </a>
                <div><p>Đơn hàng bạn đã chọn</p><h1>Giỏ Hàng</h1></div>
              </header>

              {cartItems.length ? (
                <>
                  <div className="cart-items">
                    {cartItems.map((item) => (
                      <article className="cart-item" key={item.cartId}>
                        <img src={item.image} alt={item.name} />
                        <div className="cart-item-info">
                          <span>{item.category}</span>
                          <h2>{item.name}</h2>
                          <p>{item.description}</p>
                          <small>{item.price}</small>
                          <div className="cart-quantity">
                            <button type="button" aria-label={`Giảm ${item.name}`} onClick={() => changeCartQuantity(item.cartId, item.quantity - 1)}>−</button>
                            <span>{item.quantity}</span>
                            <button type="button" aria-label={`Tăng ${item.name}`} onClick={() => changeCartQuantity(item.cartId, item.quantity + 1)}>+</button>
                          </div>
                        </div>
                        <strong className="cart-item-price">{formatPrice(item.unitPrice * item.quantity)}</strong>
                        <button className="cart-remove" type="button" aria-label={`Xóa ${item.name}`} onClick={() => changeCartQuantity(item.cartId, 0)}>×</button>
                      </article>
                    ))}
                  </div>

                  <div className="cart-summary">
                    <div><span>Tổng Tiền Sản Phẩm</span><strong>{formatPrice(cartSubtotal)}</strong></div>
                    <div><span>Phí giao hàng</span><strong>Tính tại thanh toán</strong></div>
                  </div>
                  <div className="cart-total"><strong>Tạm tính</strong><strong>{formatPrice(cartSubtotal)}</strong></div>
                  <div className="cart-checkout-wrap">
                    <button className="cart-checkout" type="button" onClick={() => { setCurrentPage('checkout'); setOrderMessage(''); setCheckoutComplete(false); window.scrollTo(0, 0) }}>Đặt Hàng Tại Đây <span aria-hidden="true">→</span></button>
                    {orderMessage && <p role="status">{orderMessage}</p>}
                  </div>
                </>
              ) : (
                <div className="cart-empty">
                  <span aria-hidden="true">🛒</span>
                  <h2>Giỏ hàng đang trống</h2>
                  <p>Chọn những nông sản tươi ngon bạn yêu thích nhé.</p>
                  <button type="button" onClick={() => setCurrentPage('products')}>Tiếp tục mua sắm</button>
                </div>
              )}
            </div>
          </section>
        ) : currentPage === 'productDetail' && selectedProduct ? (
          <section className="product-detail-page">
            <div className="detail-sample">
              <header className="detail-sample-header">
                <button type="button" className="detail-sample-brand" onClick={() => { setCurrentPage('products'); window.scrollTo(0, 0) }}>
                  <span className="detail-sample-brand-icon" aria-hidden="true">🌿</span>
                  <strong>Nông Sản Việt</strong>
                </button>
                <div>
                  <p>Thông tin sản phẩm</p>
                  <h1>Thông Tin</h1>
                </div>
              </header>

              <main className="detail-sample-main">
                <div className="detail-sample-grid">
                  <div className="detail-sample-photo">
                    <img src={selectedProduct.image} alt={selectedProduct.name} />
                    <div>
                      <strong>Không qua kho trung gian</strong>
                      <b>Từ Luống rau, đến bếp cơm nhé.</b>
                    </div>
                  </div>
                  <article className="detail-sample-info">
                    <p>{selectedProduct.category}</p>
                    <h2>{selectedProduct.name}</h2>
                    <p>{selectedProduct.description}</p>
                    <strong className="detail-sample-price">{selectedProduct.price}</strong>
                    <table>
                      <tbody>
                        <tr><th>Lô hàng đang bán</th><th>Thông tin</th></tr>
                        <tr>
                          <td>Mã lô hàng: <b>{selectedBatch?.ma_lo || 'Chưa có lô'}</b><br/>Ngày thu hoạch:<br/><b>{selectedBatch?.ngay_thu_hoach || '—'}</b></td>
                          <td>{selectedBatch?.so_luong_kha_dung ?? 0} {selectedProduct.unit} khả dụng<br/>Hạn sử dụng:<br/><b>{selectedBatch?.ngay_het_han || '—'}</b></td>
                        </tr>
                      </tbody>
                    </table>
                    <div className="detail-sample-preserve">Bảo quản ngăn mát 2–5°C · Dùng ngay nhất trong 3 ngày.</div>
                  </article>
                </div>

                <div className="detail-sample-story">
                  <article className="detail-sample-story-copy">
                    <div>
                      <p>Minh bạch từ gốc</p>
                      <h2>Nhật ký canh tác</h2>
                      <span>{selectedBatch?.qr_code ? `Mã truy xuất lô ${selectedBatch.ma_lo}: ${selectedBatch.qr_code}` : 'Thông tin truy xuất được lấy từ hồ sơ lô hàng trên máy chủ.'}</span>
                    </div>
                    <div className="detail-sample-lot">
                      <b>Lô {selectedBatch?.ma_lo || 'chưa có'}</b>
                      <span>{selectedBatch ? `Thu hoạch ${selectedBatch.ngay_thu_hoach || 'chưa cập nhật'} · Hạn dùng ${selectedBatch.ngay_het_han || 'chưa cập nhật'}` : 'Chưa có lô hàng khả dụng.'}</span>
                    </div>
                  </article>
                  <article className="detail-sample-story-record">
                    {selectedBatch?.farming_logs?.length ? selectedBatch.farming_logs.map((log, index) => (
                      <div className="detail-sample-record-item" key={`${log.thoi_gian}-${index}`}>
                        <div className="detail-sample-record-date"><span>{log.thoi_gian || 'Chưa rõ thời gian'}</span><b>{log.hanh_dong}</b></div>
                        <p>{log.ghi_chu || 'Không có ghi chú.'}</p>
                        {log.hinh_anh_minh_chung && <img src={resolveImageUrl(log.hinh_anh_minh_chung)} alt="Minh chứng nhật ký canh tác" />}
                      </div>
                    )) : <p>Chưa có nhật ký canh tác cho lô hàng này.</p>}
                  </article>
                </div>
              </main>

              <footer className="detail-sample-footer detail-sample-footer-match">
                <p>ĂN SẠCH, SỐNG LÀNH</p>
                <h2>Mùa nào thức nấy,<br/>ngon lành mỗi tuần.</h2>
                <span>Nông sản tươi ngon được tuyển chọn mỗi ngày cho gia đình bạn.</span>
                <div className="detail-sample-footer-social">
                  <a href="#contact" aria-label="Facebook">f</a>
                  <a href="#contact" aria-label="Instagram">◎</a>
                  <a href="#contact" aria-label="Liên hệ">✉</a>
                </div>
              </footer>
              <div className="detail-sample-copyright">
                <span>© 2026 Nông Sản Việt. Tất cả quyền được bảo lưu.</span>
                <span>Chính sách riêng tư &nbsp;·&nbsp; Điều khoản sử dụng</span>
              </div>
            </div>
          </section>
        ) : currentPage === 'products' ? (
          <section className="catalog-page">
            <div className="catalog-inner">
              <section className="catalog-hero">
                <div className="catalog-hero-copy">
                  <span>Thu hoạch mỗi sớm</span>
                  <h1>Tươi lành từ<br/>mảnh đất Việt</h1>
                  <p>Nông sản tươi sạch, được tuyển chọn kỹ càng và giao đến tận nhà.</p>
                  <a href="#catalog-list" onClick={(event) => { event.preventDefault(); browseCategory('Tất cả') }}>Khám phá nông sản <span aria-hidden="true">→</span></a>
                </div>
                <div className="catalog-quality"><strong>100%</strong><span>Tươi sạch<br/>mỗi ngày</span></div>
              </section>

              <section className="catalog-list" id="catalog-list">
                <div className="catalog-heading">
                  <div>
                    <p>Gian hàng sản phẩm tươi</p>
                    <h2>Chọn vị tươi <em>mỗi ngày</em></h2>
                  </div>
                  <label className="catalog-search">
                    <span aria-hidden="true">⌕</span>
                    <input id="product-search" value={productSearch} onChange={(event) => { setProductSearch(event.target.value); setSelectedCategory('Tất cả') }} placeholder="Tìm nông sản" aria-label="Tìm nông sản" />
                  </label>
                </div>

                <div className="catalog-filters" aria-label="Lọc sản phẩm">
                  {[{ id: 'Tất cả', name: 'Tất cả' }, ...catalogCategories].map((category, index) => (
                    <button className={selectedCategory === category.id ? 'selected' : ''} key={category.id} onClick={() => setSelectedCategory(category.id)}>
                      <span aria-hidden="true">{['✦', '◉', '●', '▰'][index % 4]}</span> {category.name}
                    </button>
                  ))}
                </div>

                {catalogLoading ? <p className="catalog-empty">Đang tải sản phẩm từ máy chủ…</p> : visibleProducts.length ? (
                  <div className="catalog-grid">
                    {visibleProducts.map((product) => (
                      <article
                        className="catalog-product"
                        key={product.id}
                        onClick={() => {
                          setSelectedProduct(product)
                          setCurrentPage('productDetail')
                          window.scrollTo(0, 0)
                        }}
                      >
                        <div className="catalog-product-image">
                          <img src={product.image} alt={product.name} />
                          <span className="catalog-product-label">{product.label}</span>
                          <button aria-label={`Thêm ${product.name} vào giỏ hàng`} onClick={(event) => { event.stopPropagation(); addToCart(product) }}>+</button>
                        </div>
                        <h3>{product.name}</h3>
                        <p>{product.price}</p>
                      </article>
                    ))}
                  </div>
                ) : <p className="catalog-empty">{catalogProducts.length ? 'Không tìm thấy sản phẩm phù hợp.' : 'Máy chủ chưa có sản phẩm đang bán.'}</p>}
              </section>
            </div>
          </section>
        ) : (
        <section className="home-showcase">
          <div className="home-inner home-top">
            <section className="home-hero">
              <div className="home-hero-copy">
                <p>NÔNG TRẠI HỮU CƠ</p>
                <h1>Nông sản sạch,<br/><em>tươi ngon</em><br/>mỗi ngày</h1>
                <a href="#products" onClick={(event) => { event.preventDefault(); browseCategory('Tất cả') }}>Đi chợ ngay <span aria-hidden="true">→</span></a>
              </div>
            </section>
          </div>
          <div className="home-inner">
            <section className="farm-stories" id="story">
              <div className="home-section-heading">
                <div>
                  <p>Từ nông trại đến bàn ăn</p>
                  <h1>Chọn món lành mỗi ngày</h1>
                </div>
                <a href="#products">Xem tất cả <span aria-hidden="true">→</span></a>
              </div>
              <div className="story-cards">
                {stories.map((story) => (
                  <article className="story-card" key={story.title}>
                    <img src={story.image} alt={story.alt} />
                    <a href="#products" onClick={(event) => { event.preventDefault(); browseCategory(story.category) }}>{story.title} <span aria-hidden="true">→</span></a>
                    <p>{story.description}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="favorites" id="products">
              <p className="favorites-kicker">Tươi ngon trong tuần</p>
              <h2>Nông sản được yêu thích</h2>
              <div className="favorite-products">
                {catalogProducts.slice(0, 4).map((product) => (
                  <article className="favorite-card" key={product.id}>
                    <img src={product.image} alt={product.name} />
                    <h3>{product.name}</h3>
                    <p>{product.price}</p>
                    <button onClick={() => purchaseNow(product)}>Mua Ngay</button>
                  </article>
                ))}
              </div>
            </section>

            <section className="farm-promo">
              <div className="farm-promo-image">
                <img src={img.asparagus} alt="Măng tây tươi từ nông trại" />
                <div className="freshness-badge">
                  <div>
                    <strong>24h</strong>
                    <span>Từ lúc thu hoạch đến<br/>tay bạn.</span>
                  </div>
                </div>
              </div>
              <div>
                <p className="favorites-kicker">CÂU CHUYỆN HƯƠNG LÀNH</p>
                <h2>Từ mảnh vườn xanh,<br/><span>đến bữa cơm lành.</span></h2>
                <p>Chọn thực phẩm tươi sạch, chăm chút cho sức khỏe và bữa ăn của gia đình bạn.</p>
                <a href="#about-story" onClick={(event) => { event.preventDefault(); openStory() }}>Khám phá ngay <span aria-hidden="true">→</span></a>
              </div>
            </section>
          </div>
        </section>
        )}
      </main>

      <footer className={`home-footer${currentPage === 'contact' ? ' contact-footer' : ''}`} id="contact">
        {currentPage === 'contact' ? (
          <div className="contact-footer-inner">
            <span>© 2026 Nông Lành. Tươi từ vườn, lành từ tâm.</span>
            <div className="contact-footer-social">
              <a href="#contact">◎ Instagram</a>
              <a href="#contact">▣ Zalo</a>
              <a href="#contact">Facebook</a>
            </div>
          </div>
        ) : (
          <>
            <div className="footer-promise">
              <p>ĂN SẠCH, SỐNG LÀNH</p>
              <h2>Mùa nào thức nấy,<br/>ngon lành mỗi tuần.</h2>
              <span>Nông sản tươi ngon được tuyển chọn mỗi ngày cho gia đình bạn.</span>
              <div className="footer-social" aria-label="Kết nối với Nông Sản Việt">
                <a href="#contact" aria-label="Facebook">f</a>
                <a href="#contact" aria-label="Instagram">◎</a>
                <a href="#contact" aria-label="Liên hệ">✉</a>
              </div>
            </div>
            <div className="footer-bottom">
              <span>© 2026 Nông Sản Việt. Tất cả quyền được bảo lưu.</span>
              <span><a href="#contact">Chính sách riêng tư</a><i>·</i><a href="#contact">Điều khoản sử dụng</a></span>
            </div>
          </>
        )}
      </footer>
    </div>
  )
}

export default App
