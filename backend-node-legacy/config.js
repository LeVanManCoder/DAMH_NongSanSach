import { readFileSync } from 'node:fs'
import dotenv from 'dotenv'

dotenv.config()

if (process.env.LARAVEL_ENV_PATH) {
  let laravelEnvironment
  try {
    laravelEnvironment = dotenv.parse(readFileSync(process.env.LARAVEL_ENV_PATH))
  } catch (error) {
    throw new Error(`Không đọc được LARAVEL_ENV_PATH: ${error.message}`)
  }
  const inheritedKeys = [
    'DB_HOST',
    'DB_PORT',
    'DB_DATABASE',
    'DB_USERNAME',
    'DB_PASSWORD',
    'APP_URL',
    'APP_KEY',
    'JWT_SECRET',
    'JWT_TTL',
    'SHIPPING_FALLBACK_DISTANCE_KM',
    'SHIPPING_ORIGIN_LATITUDE',
    'SHIPPING_ORIGIN_LONGITUDE',
    'VIETQR_BANK_ID',
    'VIETQR_ACCOUNT_NO',
    'VIETQR_ACCOUNT_NAME',
    'VIETQR_TEMPLATE',
    'VNPAY_TMN_CODE',
    'VNPAY_HASH_SECRET',
    'VNPAY_URL',
    'VNPAY_RETURN_URL',
  ]
  for (const key of inheritedKeys) {
    if (!process.env[key] && laravelEnvironment[key] !== undefined) {
      process.env[key] = laravelEnvironment[key]
    }
  }
}

export const config = {
  port: Number(process.env.PORT || 3001),
  frontendOrigin: process.env.FRONTEND_ORIGIN || 'http://127.0.0.1:5174',
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    database: process.env.DB_DATABASE,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD || '',
  },
  jwt: {
    secret: process.env.JWT_SECRET || process.env.APP_KEY || '',
    issuer: process.env.APP_URL || 'http://localhost',
    ttl: Number(process.env.JWT_TTL || 3600),
  },
  shipping: {
    pricePerKm: Number(process.env.SHIPPING_PRICE_PER_KM || 5000),
    fallbackDistanceKm: Number(process.env.SHIPPING_FALLBACK_DISTANCE_KM || 5),
    originLatitude: process.env.SHIPPING_ORIGIN_LATITUDE,
    originLongitude: process.env.SHIPPING_ORIGIN_LONGITUDE,
  },
  vietQr: {
    bankId: process.env.VIETQR_BANK_ID,
    accountNo: process.env.VIETQR_ACCOUNT_NO,
    accountName: process.env.VIETQR_ACCOUNT_NAME,
    template: process.env.VIETQR_TEMPLATE || 'compact2',
  },
  vnpay: {
    tmnCode: process.env.VNPAY_TMN_CODE,
    hashSecret: process.env.VNPAY_HASH_SECRET,
    url: process.env.VNPAY_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
    returnUrl: process.env.VNPAY_RETURN_URL || `${process.env.FRONTEND_ORIGIN || 'http://127.0.0.1:5174'}/`,
  },
  laravelApiUrl: (process.env.LARAVEL_API_URL || 'http://127.0.0.1:8000/api').replace(/\/+$/, ''),
}

if (!config.db.database || !config.db.user) {
  throw new Error('Thiếu DB_DATABASE hoặc DB_USERNAME. Cấu hình .env hoặc LARAVEL_ENV_PATH trước khi chạy.')
}

if (!config.jwt.secret) {
  throw new Error('Thiếu JWT_SECRET hoặc APP_KEY trong cấu hình backend Laravel.')
}

if (!Number.isInteger(config.jwt.ttl) || config.jwt.ttl < 60) {
  throw new Error('JWT_TTL phải là số nguyên từ 60 giây trở lên.')
}

if (config.jwt.secret.startsWith('base64:')) {
  const decodedSecret = Buffer.from(config.jwt.secret.slice(7), 'base64')
  if (decodedSecret.length < 32) {
    throw new Error('JWT_SECRET hoặc APP_KEY phải giải mã thành ít nhất 32 byte.')
  }
  config.jwt.secret = decodedSecret
} else {
  config.jwt.secret = Buffer.from(config.jwt.secret)
  if (config.jwt.secret.length < 32) {
    throw new Error('JWT_SECRET hoặc APP_KEY phải có ít nhất 32 byte.')
  }
}
