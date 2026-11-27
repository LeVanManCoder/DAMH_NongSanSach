import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto'
import { config } from './config.js'
import { pool } from './db.js'

const userMorphType = 'App\\Models\\User'

function encode(value) {
  return Buffer.from(value).toString('base64url')
}

function decode(value) {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return null
  try {
    return Buffer.from(value, 'base64url').toString('utf8')
  } catch {
    return null
  }
}

export function hashToken(token) {
  return createHash('sha256').update(token).digest('hex')
}

export async function issueToken(connection, userId) {
  const now = Math.floor(Date.now() / 1000)
  const claims = {
    iss: config.jwt.issuer,
    sub: String(userId),
    iat: now,
    exp: now + config.jwt.ttl,
    jti: randomUUID(),
  }
  const unsignedToken = `${encode(JSON.stringify({ typ: 'JWT', alg: 'HS256' }))}.${encode(JSON.stringify(claims))}`
  const signature = createHmac('sha256', config.jwt.secret).update(unsignedToken).digest('base64url')
  const token = `${unsignedToken}.${signature}`

  await connection.execute(
    `INSERT INTO personal_access_tokens
      (tokenable_type, tokenable_id, name, token, abilities, expires_at, created_at, updated_at)
     VALUES (?, ?, 'web-access', ?, '["*"]', DATE_ADD(NOW(), INTERVAL ? SECOND), NOW(), NOW())`,
    [userMorphType, userId, hashToken(token), config.jwt.ttl],
  )

  return token
}

export async function authenticateToken(token) {
  if (token.length > 8192) return null

  const parts = token.split('.')
  if (parts.length !== 3) return null

  const [encodedHeader, encodedPayload, encodedSignature] = parts
  const headerJson = decode(encodedHeader)
  const claimsJson = decode(encodedPayload)
  if (!headerJson || !claimsJson || !/^[A-Za-z0-9_-]+$/.test(encodedSignature)) return null

  let header
  let claims
  try {
    header = JSON.parse(headerJson)
    claims = JSON.parse(claimsJson)
  } catch {
    return null
  }

  if (header?.typ !== 'JWT' || header?.alg !== 'HS256') return null
  const expected = createHmac('sha256', config.jwt.secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest()
  const supplied = Buffer.from(encodedSignature, 'base64url')
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return null

  const now = Math.floor(Date.now() / 1000)
  if (
    claims?.iss !== config.jwt.issuer
    || typeof claims.sub !== 'string'
    || !/^\d+$/.test(claims.sub)
    || !Number.isInteger(claims.iat)
    || claims.iat > now
    || !Number.isInteger(claims.exp)
    || claims.exp <= now
    || claims.exp > claims.iat + config.jwt.ttl
    || typeof claims.jti !== 'string'
    || !claims.jti
  ) {
    return null
  }

  const [rows] = await pool.execute(
    `SELECT u.id, u.ho_ten, u.email, u.so_dien_thoai, u.diem_tich_luy, r.ten_vai_tro AS role
     FROM personal_access_tokens pat
     JOIN users u ON u.id = pat.tokenable_id
     JOIN roles r ON r.id = u.role_id
     WHERE pat.token = ? AND pat.tokenable_type = ? AND pat.tokenable_id = ?
       AND pat.expires_at > NOW() AND u.is_active = 1 AND u.deleted_at IS NULL
     LIMIT 1`,
    [hashToken(token), userMorphType, Number(claims.sub)],
  )

  return rows[0] || null
}

export async function requireAuth(request, response, next) {
  const match = /^Bearer\s+(\S+)$/i.exec(request.get('authorization') || '')
  if (!match) {
    return response.status(401).json({ status: 'error', message: 'Chưa xác thực hoặc token không hợp lệ.' })
  }

  try {
    const user = await authenticateToken(match[1])
    if (!user) {
      return response.status(401).json({ status: 'error', message: 'Chưa xác thực hoặc token không hợp lệ.' })
    }
    request.user = user
    request.accessToken = match[1]
    return next()
  } catch (error) {
    return next(error)
  }
}

export function requireRole(...roles) {
  return (request, response, next) => {
    if (!request.user || !roles.includes(request.user.role)) {
      return response.status(403).json({ status: 'error', message: 'Bạn không có quyền thực hiện thao tác này.' })
    }
    return next()
  }
}
