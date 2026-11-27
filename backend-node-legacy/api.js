import { randomBytes, randomUUID } from 'node:crypto'
import bcrypt from 'bcryptjs'
import express from 'express'
import { config } from './config.js'
import { hashToken, issueToken, requireAuth, requireRole } from './auth.js'
import { pool, transaction } from './db.js'
import { createVnpayPaymentUrl } from './vnpay.js'

export const api = express.Router()

class ApiError extends Error {
  constructor(status, message, errors) {
    super(message)
    this.status = status
    this.errors = errors
  }
}

function validationError(errors) {
  throw new ApiError(422, 'The given data was invalid.', errors)
}

function requiredString(body, field, maxLength) {
  const value = typeof body[field] === 'string' ? body[field].trim() : ''
  if (!value || value.length > maxLength) {
    validationError({ [field]: [`Trường này là bắt buộc và không được vượt quá ${maxLength} ký tự.`] })
  }
  return value
}

function positiveInteger(value, field) {
  const number = Number(value)
  if (!Number.isSafeInteger(number) || number < 1) {
    validationError({ [field]: ['Giá trị phải là số nguyên dương.'] })
  }
  return number
}

function quantityToMinorUnits(value, field = 'so_luong') {
  const text = String(value ?? '')
  if (!/^\d{1,6}(?:\.\d{1,2})?$/.test(text)) {
    validationError({ [field]: ['Số lượng phải lớn hơn 0 và tối đa 2 chữ số thập phân.'] })
  }
  const [whole, fraction = ''] = text.split('.')
  const quantity = Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
  if (quantity < 1) {
    validationError({ [field]: ['Số lượng phải lớn hơn 0.'] })
  }
  return quantity
}

function minorUnitsToDecimal(value) {
  return `${Math.floor(value / 100)}.${String(value % 100).padStart(2, '0')}`
}

function toMinorUnits(value) {
  return Math.round(Number(value || 0) * 100)
}

function userData(user) {
  return {
    id: user.id,
    ho_ten: user.ho_ten,
    email: user.email,
    so_dien_thoai: user.so_dien_thoai,
    diem_tich_luy: user.diem_tich_luy,
    role: user.role,
  }
}

function getPublicUser(user) {
  return {
    id: user.id,
    ho_ten: user.ho_ten,
    email: user.email,
    so_dien_thoai: user.so_dien_thoai,
    diem_tich_luy: user.diem_tich_luy,
    role: user.ten_vai_tro,
  }
}

function currentAvailabilitySql(alias = 'b') {
  return `${alias}.trang_thai = 'con_hang' AND ${alias}.so_luong_ton > 0
    AND ${alias}.ngay_het_han >= CURDATE()`
}

async function loadProducts(productIds) {
  if (!productIds.length) return new Map()
  const placeholders = productIds.map(() => '?').join(',')
  const [products] = await pool.execute(
    `SELECT p.id, p.category_id, p.ten_san_pham, p.slug, p.mo_ta, p.hinh_anh_dai_dien,
            p.gia_ban_co_ban, p.don_vi_tinh, c.ten_danh_muc, c.slug AS category_slug
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     WHERE p.id IN (${placeholders})`,
    productIds,
  )
  const [batches] = await pool.query(
    `SELECT b.id, b.product_id, b.ma_lo, b.ngay_thu_hoach, b.ngay_het_han,
            b.so_luong_ton AS so_luong_kha_dung, b.qr_code
     FROM batches b
     WHERE b.product_id IN (${placeholders}) AND ${currentAvailabilitySql('b')}
     ORDER BY b.ngay_het_han, b.ngay_thu_hoach`,
    productIds,
  )
  const batchIds = batches.map((batch) => batch.id)
  let logs = []
  if (batchIds.length) {
    const batchPlaceholders = batchIds.map(() => '?').join(',')
    ;[logs] = await pool.execute(
      `SELECT id, batch_id, hanh_dong, ghi_chu, hinh_anh_minh_chung, thoi_gian
       FROM farming_logs WHERE batch_id IN (${batchPlaceholders}) ORDER BY thoi_gian`,
      batchIds,
    )
  }

  const logsByBatch = new Map()
  for (const log of logs) {
    const list = logsByBatch.get(log.batch_id) || []
    list.push({
      hanh_dong: log.hanh_dong,
      ghi_chu: log.ghi_chu,
      hinh_anh_minh_chung: log.hinh_anh_minh_chung,
      thoi_gian: log.thoi_gian,
    })
    logsByBatch.set(log.batch_id, list)
  }

  const batchesByProduct = new Map()
  for (const batch of batches) {
    const list = batchesByProduct.get(batch.product_id) || []
    list.push({
      id: batch.id,
      ma_lo: batch.ma_lo,
      ngay_thu_hoach: batch.ngay_thu_hoach,
      ngay_het_han: batch.ngay_het_han,
      so_luong_kha_dung: batch.so_luong_kha_dung,
      don_vi_tinh: products.find((product) => product.id === batch.product_id)?.don_vi_tinh,
      qr_code: batch.qr_code,
      farming_logs: logsByBatch.get(batch.id) || [],
    })
    batchesByProduct.set(batch.product_id, list)
  }

  return new Map(products.map((product) => [product.id, {
    id: product.id,
    ten_san_pham: product.ten_san_pham,
    slug: product.slug,
    mo_ta: product.mo_ta,
    hinh_anh_dai_dien: product.hinh_anh_dai_dien,
    gia_ban_co_ban: product.gia_ban_co_ban,
    don_vi_tinh: product.don_vi_tinh,
    category: product.category_id ? {
      id: product.category_id,
      ten_danh_muc: product.ten_danh_muc,
      slug: product.category_slug,
    } : null,
    batches: batchesByProduct.get(product.id) || [],
  }]))
}

function shippingQuote(body) {
  let distance
  let method = 'uoc_tinh_mac_dinh'
  let note = 'Google Maps chưa được cấu hình; đang dùng khoảng cách ước tính mặc định.'

  if (body.khoang_cach_km !== undefined) {
    distance = Number(body.khoang_cach_km)
    if (!Number.isFinite(distance) || distance < 0 || distance > 10000) {
      validationError({ khoang_cach_km: ['Khoảng cách không hợp lệ.'] })
    }
    method = 'khoang_cach_cung_cap'
    note = null
  } else if (body.vi_do !== undefined || body.kinh_do !== undefined) {
    const latitude = Number(body.vi_do)
    const longitude = Number(body.kinh_do)
    if (
      !Number.isFinite(latitude) || latitude < -90 || latitude > 90
      || !Number.isFinite(longitude) || longitude < -180 || longitude > 180
    ) {
      validationError({ vi_do: ['Tọa độ giao hàng không hợp lệ.'] })
    }

    const originLatitude = Number(config.shipping.originLatitude)
    const originLongitude = Number(config.shipping.originLongitude)
    if (Number.isFinite(originLatitude) && Number.isFinite(originLongitude)) {
      const radians = (degrees) => degrees * Math.PI / 180
      const latDelta = radians(latitude - originLatitude)
      const lonDelta = radians(longitude - originLongitude)
      const a = Math.sin(latDelta / 2) ** 2
        + Math.cos(radians(originLatitude)) * Math.cos(radians(latitude)) * Math.sin(lonDelta / 2) ** 2
      distance = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
      method = 'haversine'
      note = null
    } else {
      distance = config.shipping.fallbackDistanceKm
      note = 'Chưa cấu hình tọa độ nông trại; đang dùng khoảng cách ước tính mặc định.'
    }
  } else {
    distance = config.shipping.fallbackDistanceKm
  }

  distance = Math.round(Math.max(0, distance) * 100) / 100
  return {
    khoang_cach_km: distance.toFixed(2),
    phi_van_chuyen: Math.ceil(distance * config.shipping.pricePerKm),
    phuong_thuc_tinh: method,
    ghi_chu: note,
  }
}

api.get('/health', (_request, response) => {
  response.json({ status: 'ok', service: 'webbannongsan-backend' })
})

api.get('/categories', async (_request, response) => {
  const [categories] = await pool.execute(
    `SELECT id, parent_id, ten_danh_muc, slug, mo_ta
     FROM categories WHERE is_active = 1 ORDER BY ten_danh_muc`,
  )
  response.json({ data: categories })
})

api.get('/products', async (request, response) => {
  const perPage = request.query.per_page === undefined ? 20 : Number(request.query.per_page)
  const page = request.query.page === undefined ? 1 : Number(request.query.page)
  if (!Number.isInteger(perPage) || perPage < 1 || perPage > 100) {
    validationError({ per_page: ['Số sản phẩm mỗi trang phải từ 1 đến 100.'] })
  }
  if (!Number.isInteger(page) || page < 1) {
    validationError({ page: ['Trang phải là số nguyên dương.'] })
  }

  const search = String(request.query.search || '')
  const legacyQuery = String(request.query.q || '')
  if (search.length > 120 || legacyQuery.length > 120) {
    validationError({ search: ['Từ khóa không được vượt quá 120 ký tự.'] })
  }

  const conditions = [
    'p.is_active = 1',
    'p.deleted_at IS NULL',
    `EXISTS (SELECT 1 FROM batches b WHERE b.product_id = p.id AND ${currentAvailabilitySql('b')})`,
  ]
  const params = []
  if (request.query.category_id !== undefined) {
    const categoryId = positiveInteger(request.query.category_id, 'category_id')
    conditions.push('p.category_id = ?')
    params.push(categoryId)
  }
  if (search) {
    conditions.push('p.ten_san_pham LIKE ?')
    params.push(`%${search}%`)
  } else if (legacyQuery) {
    conditions.push('(p.ten_san_pham LIKE ? OR p.mo_ta LIKE ?)')
    params.push(`%${legacyQuery}%`, `%${legacyQuery}%`)
  }
  const sort = request.query.sort || 'name'
  if (!['name', 'newest'].includes(sort)) {
    validationError({ sort: ['Thứ tự sắp xếp không hợp lệ.'] })
  }
  const orderBy = sort === 'newest' ? 'p.created_at DESC' : 'p.ten_san_pham'
  const whereSql = conditions.join(' AND ')
  const [[{ total }]] = await pool.execute(
    `SELECT COUNT(*) AS total FROM products p WHERE ${whereSql}`,
    params,
  )
  const offset = (page - 1) * perPage
  const [rows] = await pool.execute(
    `SELECT p.id FROM products p WHERE ${whereSql} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
    [...params, perPage, offset],
  )
  const productMap = await loadProducts(rows.map((row) => row.id))
  const data = rows.map((row) => productMap.get(row.id)).filter(Boolean)

  response.json({
    current_page: page,
    data,
    from: data.length ? offset + 1 : null,
    last_page: Math.max(1, Math.ceil(total / perPage)),
    per_page: perPage,
    to: data.length ? offset + data.length : null,
    total,
  })
})

api.get('/products/:slug', async (request, response) => {
  const [rows] = await pool.execute(
    `SELECT p.id FROM products p
     WHERE p.slug = ? AND p.is_active = 1 AND p.deleted_at IS NULL
       AND EXISTS (SELECT 1 FROM batches b WHERE b.product_id = p.id AND ${currentAvailabilitySql('b')})
     LIMIT 1`,
    [request.params.slug],
  )
  if (!rows.length) throw new ApiError(404, 'Không tìm thấy sản phẩm đang mở bán.')
  const product = (await loadProducts([rows[0].id])).get(rows[0].id)
  response.json({ data: product })
})

api.post('/auth/register', async (request, response) => {
  const hoTen = requiredString(request.body, 'ho_ten', 100)
  const email = requiredString(request.body, 'email', 150).toLowerCase()
  const password = String(request.body.password || '')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    validationError({ email: ['Email không hợp lệ.'] })
  }
  if (password.length < 8 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
    validationError({ password: ['Mật khẩu cần ít nhất 8 ký tự, gồm chữ hoa, chữ thường và chữ số.'] })
  }
  const phone = request.body.so_dien_thoai ? String(request.body.so_dien_thoai).trim() : null
  if (phone && phone.length > 15) validationError({ so_dien_thoai: ['Số điện thoại quá dài.'] })

  const passwordHash = await bcrypt.hash(password, 12)
  let insertId
  try {
    const [roles] = await pool.execute("SELECT id FROM roles WHERE ten_vai_tro = 'customer' LIMIT 1")
    if (!roles.length) throw new Error('Không tìm thấy vai trò customer trong bảng roles.')
    const [result] = await pool.execute(
      `INSERT INTO users (role_id, ho_ten, email, so_dien_thoai, password, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
      [roles[0].id, hoTen, email, phone, passwordHash],
    )
    insertId = result.insertId
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      validationError({ email: ['Email hoặc số điện thoại đã được sử dụng.'] })
    }
    throw error
  }

  const [users] = await pool.execute(
    `SELECT u.id, u.ho_ten, u.email, u.so_dien_thoai, u.diem_tich_luy, r.ten_vai_tro
     FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = ?`,
    [insertId],
  )
  response.status(201).json({ message: 'Tạo tài khoản thành công.', data: getPublicUser(users[0]) })
})

api.post('/auth/login', async (request, response) => {
  const email = requiredString(request.body, 'email', 150).toLowerCase()
  const password = String(request.body.password || '')
  if (!password) validationError({ password: ['Mật khẩu là bắt buộc.'] })

  const result = await transaction(async (connection) => {
    const [users] = await connection.execute(
      `SELECT u.id, u.ho_ten, u.email, u.so_dien_thoai, u.diem_tich_luy, u.password,
              u.is_active, u.deleted_at, u.so_lan_dang_nhap_sai, u.khoa_den, r.ten_vai_tro
       FROM users u JOIN roles r ON r.id = u.role_id
       WHERE u.email = ? LIMIT 1 FOR UPDATE`,
      [email],
    )
    const user = users[0]
    if (!user || !user.is_active || user.deleted_at) {
      return { error: new ApiError(401, 'Thông tin đăng nhập không chính xác.') }
    }
    if (user.khoa_den && new Date(user.khoa_den).getTime() > Date.now()) {
      return { error: new ApiError(429, 'Tài khoản tạm khóa do đăng nhập sai quá nhiều lần.') }
    }

    if (!await bcrypt.compare(password, user.password)) {
      const failedAttempts = Math.min(5, Number(user.so_lan_dang_nhap_sai) + 1)
      const lockSeconds = failedAttempts >= 5 ? 900 : null
      await connection.execute(
        `UPDATE users
         SET so_lan_dang_nhap_sai = ?,
             khoa_den = IF(? = 1, DATE_ADD(NOW(), INTERVAL 15 MINUTE), NULL)
         WHERE id = ?`,
        [failedAttempts, lockSeconds ? 1 : 0, user.id],
      )
      return {
        error: new ApiError(
          lockSeconds ? 429 : 401,
          lockSeconds ? 'Tài khoản tạm khóa do đăng nhập sai quá nhiều lần.' : 'Thông tin đăng nhập không chính xác.',
        ),
      }
    }

    await connection.execute(
      'UPDATE users SET so_lan_dang_nhap_sai = 0, khoa_den = NULL WHERE id = ?',
      [user.id],
    )
    const token = await issueToken(connection, user.id)
    return { token, user: getPublicUser(user) }
  })

  if (result.error) throw result.error
  response.json({
    token_type: 'Bearer',
    access_token: result.token,
    expires_in: config.jwt.ttl,
    user: result.user,
  })
})

api.get('/auth/me', requireAuth, (request, response) => {
  response.json({ data: userData(request.user) })
})

api.post('/auth/logout', requireAuth, async (request, response) => {
  await pool.execute('DELETE FROM personal_access_tokens WHERE token = ?', [hashToken(request.accessToken)])
  response.json({ message: 'Đăng xuất thành công.' })
})

api.get('/cart', requireAuth, requireRole('customer'), async (request, response) => {
  const [rows] = await pool.execute(
    `SELECT ci.id, ci.product_id, ci.so_luong, p.category_id, p.ten_san_pham, p.slug,
            p.mo_ta, p.hinh_anh_dai_dien, p.gia_ban_co_ban, p.don_vi_tinh,
            c.ten_danh_muc, c.slug AS category_slug
     FROM cart_items ci
     JOIN products p ON p.id = ci.product_id
     LEFT JOIN categories c ON c.id = p.category_id
     WHERE ci.user_id = ? ORDER BY ci.id`,
    [request.user.id],
  )
  const products = await loadProducts(rows.map((row) => row.product_id))
  response.json({
    data: rows.map((item) => ({
      id: item.id,
      product_id: item.product_id,
      so_luong: item.so_luong,
      product: products.get(item.product_id),
    })),
  })
})

api.post('/cart', requireAuth, requireRole('customer'), async (request, response) => {
  const productId = positiveInteger(request.body.product_id, 'product_id')
  const requestedUnits = quantityToMinorUnits(request.body.so_luong)
  const item = await transaction(async (connection) => {
    const [products] = await connection.execute(
      `SELECT id, is_active FROM products WHERE id = ? AND deleted_at IS NULL FOR UPDATE`,
      [productId],
    )
    if (!products.length || !products[0].is_active) {
      throw new ApiError(422, 'Sản phẩm không còn được mở bán.', { product_id: ['Sản phẩm không hợp lệ.'] })
    }
    const [batches] = await connection.execute(
      `SELECT b.so_luong_ton FROM batches b
       WHERE b.product_id = ? AND ${currentAvailabilitySql('b')} FOR UPDATE`,
      [productId],
    )
    const availableUnits = batches.reduce((sum, batch) => sum + toMinorUnits(batch.so_luong_ton), 0)
    const [items] = await connection.execute(
      'SELECT id, so_luong FROM cart_items WHERE user_id = ? AND product_id = ? FOR UPDATE',
      [request.user.id, productId],
    )
    const currentUnits = items.length ? toMinorUnits(items[0].so_luong) : 0
    const newUnits = currentUnits + requestedUnits
    if (newUnits > availableUnits) {
      throw new ApiError(422, 'Số lượng yêu cầu vượt quá tồn kho khả dụng.', {
        so_luong: ['Số lượng yêu cầu vượt quá tồn kho khả dụng.'],
      })
    }

    if (items.length) {
      await connection.execute(
        'UPDATE cart_items SET so_luong = ?, updated_at = NOW() WHERE id = ?',
        [minorUnitsToDecimal(newUnits), items[0].id],
      )
      return { id: items[0].id, product_id: productId, so_luong: minorUnitsToDecimal(newUnits) }
    }

    const [result] = await connection.execute(
      'INSERT INTO cart_items (user_id, product_id, so_luong, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())',
      [request.user.id, productId, minorUnitsToDecimal(newUnits)],
    )
    return { id: result.insertId, product_id: productId, so_luong: minorUnitsToDecimal(newUnits) }
  })
  const product = (await loadProducts([productId])).get(productId)
  response.status(201).json({ data: { ...item, product } })
})

async function updateCartItem(request, response) {
  const itemId = positiveInteger(request.params.itemId, 'itemId')
  const quantity = quantityToMinorUnits(request.body.so_luong)
  const updated = await transaction(async (connection) => {
    const [items] = await connection.execute(
      `SELECT ci.id, ci.product_id FROM cart_items ci
       WHERE ci.id = ? AND ci.user_id = ? FOR UPDATE`,
      [itemId, request.user.id],
    )
    if (!items.length) throw new ApiError(404, 'Không tìm thấy sản phẩm trong giỏ hàng.')
    const [batches] = await connection.execute(
      `SELECT b.so_luong_ton FROM batches b
       WHERE b.product_id = ? AND ${currentAvailabilitySql('b')} FOR UPDATE`,
      [items[0].product_id],
    )
    const availableUnits = batches.reduce((sum, batch) => sum + toMinorUnits(batch.so_luong_ton), 0)
    if (quantity > availableUnits) {
      throw new ApiError(422, 'Số lượng yêu cầu vượt quá tồn kho khả dụng.', {
        so_luong: ['Số lượng yêu cầu vượt quá tồn kho khả dụng.'],
      })
    }
    await connection.execute(
      'UPDATE cart_items SET so_luong = ?, updated_at = NOW() WHERE id = ?',
      [minorUnitsToDecimal(quantity), itemId],
    )
    return { id: itemId, product_id: items[0].product_id, so_luong: minorUnitsToDecimal(quantity) }
  })
  const product = (await loadProducts([updated.product_id])).get(updated.product_id)
  response.json({ data: { ...updated, product } })
}

api.put('/cart/:itemId', requireAuth, requireRole('customer'), updateCartItem)
api.patch('/cart/:itemId', requireAuth, requireRole('customer'), updateCartItem)

api.delete('/cart/:itemId', requireAuth, requireRole('customer'), async (request, response) => {
  const itemId = positiveInteger(request.params.itemId, 'itemId')
  const [result] = await pool.execute(
    'DELETE FROM cart_items WHERE id = ? AND user_id = ?',
    [itemId, request.user.id],
  )
  if (!result.affectedRows) throw new ApiError(404, 'Không tìm thấy sản phẩm trong giỏ hàng.')
  response.status(204).end()
})

api.post('/shipping/calculate', requireAuth, requireRole('customer'), (request, response) => {
  const address = request.body.dia_chi_giao
  if (address !== undefined && (typeof address !== 'string' || address.trim().length > 255)) {
    validationError({ dia_chi_giao: ['Địa chỉ giao hàng không hợp lệ.'] })
  }
  if (request.body.khoang_cach_km === undefined && !address && request.body.vi_do === undefined) {
    validationError({ dia_chi_giao: ['Cần cung cấp địa chỉ giao hàng hoặc khoảng cách hợp lệ.'] })
  }
  response.json({ data: shippingQuote(request.body) })
})

api.post('/orders', requireAuth, requireRole('customer'), async (request, response) => {
  const recipient = requiredString(request.body, 'ten_nguoi_nhan', 100)
  const phone = requiredString(request.body, 'sdt_nguoi_nhan', 15)
  const address = requiredString(request.body, 'dia_chi_giao', 255)
  const note = request.body.ghi_chu == null ? null : String(request.body.ghi_chu).trim()
  if (note && note.length > 255) validationError({ ghi_chu: ['Ghi chú không được vượt quá 255 ký tự.'] })
  const shipping = shippingQuote({ ...request.body, dia_chi_giao: address })

  const order = await transaction(async (connection) => {
    const [cartItems] = await connection.execute(
      `SELECT ci.product_id, ci.so_luong, p.ten_san_pham, p.gia_ban_co_ban, p.is_active
       FROM cart_items ci JOIN products p ON p.id = ci.product_id
       WHERE ci.user_id = ? FOR UPDATE`,
      [request.user.id],
    )
    if (!cartItems.length) {
      validationError({ cart: ['Giỏ hàng đang trống.'] })
    }
    if (cartItems.some((item) => !item.is_active)) {
      validationError({ cart: ['Giỏ hàng có sản phẩm không còn được mở bán.'] })
    }

    const subtotal = cartItems.reduce(
      (sum, item) => sum + Math.round(Number(item.so_luong) * Number(item.gia_ban_co_ban)),
      0,
    )
    const total = subtotal + shipping.phi_van_chuyen
    const orderCode = randomBytes(10).toString('hex').toUpperCase()
    const [result] = await connection.execute(
      `INSERT INTO orders
        (ma_don, user_id, loai_don, ten_nguoi_nhan, sdt_nguoi_nhan, dia_chi_giao,
         khoang_cach_km, phi_van_chuyen, tong_tien_hang, tong_thanh_toan,
         trang_thai, ghi_chu, ngay_tao)
       VALUES (?, ?, 'le', ?, ?, ?, ?, ?, ?, ?, 'cho_duyet', ?, NOW())`,
      [
        orderCode,
        request.user.id,
        recipient,
        phone,
        address,
        shipping.khoang_cach_km,
        shipping.phi_van_chuyen,
        subtotal,
        total,
        note,
      ],
    )
    const orderId = result.insertId
    for (const item of cartItems) {
      await connection.execute(
        `INSERT INTO order_details (order_id, product_id, batch_id, so_luong, don_gia)
         VALUES (?, ?, NULL, ?, ?)`,
        [orderId, item.product_id, item.so_luong, item.gia_ban_co_ban],
      )
    }
    await connection.execute('DELETE FROM cart_items WHERE user_id = ?', [request.user.id])
    return {
      id: orderId,
      ma_don: orderCode,
      user_id: request.user.id,
      ten_nguoi_nhan: recipient,
      sdt_nguoi_nhan: phone,
      dia_chi_giao: address,
      khoang_cach_km: shipping.khoang_cach_km,
      phi_van_chuyen: shipping.phi_van_chuyen,
      tong_tien_hang: subtotal,
      tong_thanh_toan: total,
      trang_thai: 'cho_duyet',
      ghi_chu: note,
      details: cartItems.map((item) => ({
        product_id: item.product_id,
        so_luong: item.so_luong,
        don_gia: item.gia_ban_co_ban,
        thanh_tien: Math.round(Number(item.so_luong) * Number(item.gia_ban_co_ban)),
      })),
    }
  })
  response.status(201).json({ data: order })
})

api.get('/orders', requireAuth, requireRole('customer'), async (request, response) => {
  const [rows] = await pool.execute(
    `SELECT id, ma_don, ten_nguoi_nhan, sdt_nguoi_nhan, dia_chi_giao, tong_tien_hang,
            phi_van_chuyen, tong_thanh_toan, trang_thai, ngay_tao
     FROM orders WHERE user_id = ? ORDER BY ngay_tao DESC LIMIT 100`,
    [request.user.id],
  )
  response.json({ data: rows })
})

api.get('/payments/:paymentId', requireAuth, requireRole('customer'), async (request, response) => {
  const paymentId = positiveInteger(request.params.paymentId, 'paymentId')
  const [rows] = await pool.execute(
    `SELECT p.id AS payment_id, p.order_id, p.phuong_thuc, p.so_tien, p.trang_thai AS payment_status,
            p.ma_giao_dich, p.thoi_gian_thanh_toan, o.user_id, o.ma_don, o.ten_nguoi_nhan,
            o.sdt_nguoi_nhan, o.dia_chi_giao, o.khoang_cach_km, o.phi_van_chuyen,
            o.tong_tien_hang, o.tong_thanh_toan, o.trang_thai AS order_status, o.ngay_tao
     FROM payments p JOIN orders o ON o.id = p.order_id
     WHERE p.id = ? AND o.user_id = ? LIMIT 1`,
    [paymentId, request.user.id],
  )
  if (!rows.length) throw new ApiError(404, 'Không tìm thấy giao dịch.')
  const paymentRow = rows[0]
  const [details] = await pool.execute(
    `SELECT od.id, od.product_id, od.so_luong, od.don_gia, od.thanh_tien
     FROM order_details od WHERE od.order_id = ? ORDER BY od.id`,
    [paymentRow.order_id],
  )
  const products = await loadProducts(details.map((detail) => detail.product_id))
  response.json({
    data: {
      payment: {
        id: paymentRow.payment_id,
        order_id: paymentRow.order_id,
        phuong_thuc: paymentRow.phuong_thuc,
        so_tien: paymentRow.so_tien,
        trang_thai: paymentRow.payment_status,
        ma_giao_dich: paymentRow.ma_giao_dich,
        thoi_gian_thanh_toan: paymentRow.thoi_gian_thanh_toan,
      },
      order: {
        id: paymentRow.order_id,
        ma_don: paymentRow.ma_don,
        ten_nguoi_nhan: paymentRow.ten_nguoi_nhan,
        sdt_nguoi_nhan: paymentRow.sdt_nguoi_nhan,
        dia_chi_giao: paymentRow.dia_chi_giao,
        khoang_cach_km: paymentRow.khoang_cach_km,
        phi_van_chuyen: paymentRow.phi_van_chuyen,
        tong_tien_hang: paymentRow.tong_tien_hang,
        tong_thanh_toan: paymentRow.tong_thanh_toan,
        trang_thai: paymentRow.order_status,
        ngay_tao: paymentRow.ngay_tao,
        details: details.map((detail) => ({
          ...detail,
          product: products.get(detail.product_id),
        })),
      },
    },
  })
})

api.post('/payments/create', requireAuth, requireRole('customer'), async (request, response) => {
  const orderId = positiveInteger(request.body.order_id, 'order_id')
  const method = request.body.phuong_thuc
  if (!['vietqr', 'vnpay'].includes(method)) {
    validationError({ phuong_thuc: ['Phương thức thanh toán không hợp lệ.'] })
  }
  if (method === 'vnpay' && (!config.vnpay.tmnCode || !config.vnpay.hashSecret)) {
    throw new ApiError(503, 'Chưa cấu hình VNPAY sandbox (VNPAY_TMN_CODE, VNPAY_HASH_SECRET).')
  }
  if (method === 'vietqr' && (!config.vietQr.bankId || !config.vietQr.accountNo)) {
    throw new ApiError(503, 'Chưa cấu hình tài khoản nhận VietQR.')
  }

  const payment = await transaction(async (connection) => {
    const [orders] = await connection.execute(
      `SELECT id, tong_thanh_toan, trang_thai FROM orders
       WHERE id = ? AND user_id = ? FOR UPDATE`,
      [orderId, request.user.id],
    )
    const order = orders[0]
    if (!order) throw new ApiError(404, 'Không tìm thấy đơn hàng.')
    if (order.trang_thai !== 'cho_duyet') {
      throw new ApiError(409, 'Đơn hàng không còn ở trạng thái chờ thanh toán.')
    }
    const amount = Number(order.tong_thanh_toan)
    if (amount <= 0) validationError({ order_id: ['Tổng thanh toán phải lớn hơn 0.'] })

    const [payments] = await connection.execute(
      `SELECT id, order_id, phuong_thuc, so_tien, trang_thai, ma_giao_dich
       FROM payments WHERE order_id = ? AND trang_thai = 'cho_xu_ly'
       ORDER BY id DESC LIMIT 1 FOR UPDATE`,
      [orderId],
    )
    if (payments.length) {
      if (payments[0].phuong_thuc !== method) {
        throw new ApiError(409, 'Đơn hàng đã có giao dịch đang chờ xử lý.')
      }
      return payments[0]
    }
    const [successful] = await connection.execute(
      "SELECT id FROM payments WHERE order_id = ? AND trang_thai = 'thanh_cong' LIMIT 1",
      [orderId],
    )
    if (successful.length) throw new ApiError(409, 'Đơn hàng đã được thanh toán.')

    const transactionCode = `NL-${randomUUID().toUpperCase()}`
    const [result] = await connection.execute(
      `INSERT INTO payments
        (order_id, subscription_id, phuong_thuc, so_tien, trang_thai, ma_giao_dich, created_at)
       VALUES (?, NULL, ?, ?, 'cho_xu_ly', ?, NOW())`,
      [orderId, method, amount, transactionCode],
    )
    return {
      id: result.insertId,
      order_id: orderId,
      phuong_thuc: method,
      so_tien: amount,
      trang_thai: 'cho_xu_ly',
      ma_giao_dich: transactionCode,
    }
  })

  if (method === 'vnpay') {
    const paymentUrl = createVnpayPaymentUrl({
      payment,
      tmnCode: config.vnpay.tmnCode,
      hashSecret: config.vnpay.hashSecret,
      returnUrl: config.vnpay.returnUrl,
      gatewayUrl: config.vnpay.url,
      ipAddress: request.ip,
    })
    return response.status(201).json({
      data: {
        payment,
        payment_url: paymentUrl,
        qr_payload: null,
        qr_image_url: null,
        can_simulate: false,
      },
    })
  }

  const transferContent = `NL${payment.id}`
  const query = new URLSearchParams({
    amount: String(payment.so_tien),
    addInfo: transferContent,
  })
  if (config.vietQr.accountName) query.set('accountName', config.vietQr.accountName)
  const qrUrl = `https://img.vietqr.io/image/${encodeURIComponent(config.vietQr.bankId)}-${encodeURIComponent(config.vietQr.accountNo)}-${encodeURIComponent(config.vietQr.template)}.png?${query}`
  response.status(201).json({
    data: {
      payment,
      qr_payload: null,
      payment_url: qrUrl,
      qr_image_url: qrUrl,
      transfer: {
        bank_id: config.vietQr.bankId,
        account_no: config.vietQr.accountNo,
        account_name: config.vietQr.accountName || null,
        amount: Number(payment.so_tien),
        transfer_content: transferContent,
      },
      can_simulate: false,
    },
  })
})

async function forwardVnpayIpn(request, response) {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(request.query)) {
    if (typeof value === 'string') query.append(key, value)
  }
  const queryString = query.toString()
  const target = `${config.laravelApiUrl}/payments/vnpay/ipn${queryString ? `?${queryString}` : ''}`
  const headers = { Accept: 'application/json' }
  let body

  if (request.method === 'POST') {
    if (request.is('application/x-www-form-urlencoded')) {
      headers['Content-Type'] = 'application/x-www-form-urlencoded'
      body = new URLSearchParams(request.body).toString()
    } else {
      headers['Content-Type'] = 'application/json'
      body = JSON.stringify(request.body || {})
    }
  }

  const upstream = await fetch(target, { method: request.method, headers, body })
  const responseBody = await upstream.text()
  response.status(upstream.status)
  response.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json')
  response.send(responseBody)
}

api.route('/payments/vnpay/ipn').get(forwardVnpayIpn).post(forwardVnpayIpn)

export function errorHandler(error, _request, response, _next) {
  if (error instanceof ApiError) {
    return response.status(error.status).json({
      message: error.message,
      ...(error.errors ? { errors: error.errors } : {}),
    })
  }
  if (error.code === 'ER_DUP_ENTRY') {
    return response.status(409).json({ message: 'Dữ liệu đã tồn tại.' })
  }
  if (error.type === 'entity.parse.failed') {
    return response.status(400).json({ message: 'JSON request không hợp lệ.' })
  }
  console.error(error.message)
  return response.status(500).json({ message: 'Lỗi máy chủ nội bộ.' })
}
