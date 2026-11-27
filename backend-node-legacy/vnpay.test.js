import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import test from 'node:test'
import { createVnpayPaymentUrl } from './vnpay.js'

test('creates a VNPAY URL with amount in minor units and a valid signature', () => {
  const hashSecret = 'sandbox-test-secret'
  const returnUrl = 'http://127.0.0.1:5174/?source=checkout&customer=Mai Anh'
  const paymentUrl = createVnpayPaymentUrl({
    payment: { id: 42, so_tien: '12345', ma_giao_dich: 'NL-TEST-42' },
    tmnCode: 'TESTCODE',
    hashSecret,
    returnUrl,
    gatewayUrl: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
    ipAddress: 'not-an-ip',
  })

  const [gateway, rawQuery] = paymentUrl.split('?')
  const signatureStart = rawQuery.lastIndexOf('&vnp_SecureHash=')
  const signedQuery = rawQuery.slice(0, signatureStart)
  const signature = rawQuery.slice(signatureStart).split('=')[1]
  const expectedSignature = createHmac('sha512', hashSecret).update(signedQuery).digest('hex')
  const params = new URLSearchParams(rawQuery)

  assert.equal(gateway, 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html')
  assert.equal(params.get('vnp_Amount'), '1234500')
  assert.equal(params.get('vnp_TxnRef'), '42')
  assert.equal(params.get('vnp_ReturnUrl'), returnUrl)
  assert.equal(params.get('vnp_IpAddr'), '127.0.0.1')
  assert.match(params.get('vnp_CreateDate'), /^\d{14}$/)
  assert.equal(signature, expectedSignature)
})
