import { createHmac } from 'node:crypto'

function encodeRfc3986(value) {
  return encodeURIComponent(String(value)).replace(/[!'()*]/g, (character) => (
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`
  ))
}

function vietnameseTimestamp(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]))
  return `${values.year}${values.month}${values.day}${values.hour}${values.minute}${values.second}`
}

export function createVnpayPaymentUrl({
  payment,
  tmnCode,
  hashSecret,
  returnUrl,
  gatewayUrl,
  ipAddress,
}) {
  const params = {
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: tmnCode,
    vnp_Amount: String(Number(payment.so_tien) * 100),
    vnp_CreateDate: vietnameseTimestamp(),
    vnp_CurrCode: 'VND',
    vnp_IpAddr: /^\d{1,3}(?:\.\d{1,3}){3}$/.test(ipAddress || '') ? ipAddress : '127.0.0.1',
    vnp_Locale: 'vn',
    vnp_OrderInfo: `Thanh toan don hang ${payment.ma_giao_dich}`,
    vnp_OrderType: 'other',
    vnp_ReturnUrl: returnUrl,
    vnp_TxnRef: String(payment.id),
  }
  const canonicalQuery = Object.keys(params)
    .sort()
    .map((key) => `${encodeRfc3986(key)}=${encodeRfc3986(params[key])}`)
    .join('&')
  const signature = createHmac('sha512', hashSecret).update(canonicalQuery).digest('hex')
  const separator = gatewayUrl.includes('?') ? '&' : '?'

  return `${gatewayUrl}${separator}${canonicalQuery}&vnp_SecureHash=${signature}`
}
