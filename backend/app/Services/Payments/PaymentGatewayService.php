<?php

namespace App\Services\Payments;

use App\Models\Payment;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Symfony\Component\HttpKernel\Exception\HttpException;

class PaymentGatewayService
{
    /**
     * @return array<string, mixed>
     */
    public function create(Payment $payment, string $ipAddress): array
    {
        return match ($payment->phuong_thuc) {
            'vietqr' => $this->vietQr($payment),
            'payos' => $this->payOsConfigured()
                ? $this->createPayOs($payment)
                : $this->vietQr($payment),
            'vnpay' => $this->vnpayConfigured()
                ? $this->createVnpay($payment, $ipAddress)
                : $this->mockData($payment),
            default => $this->mockData($payment),
        };
    }

    /**
     * @param  array<string, mixed>  $params
     */
    public function verifyVnpaySignature(array $params): bool
    {
        $provided = $params['vnp_SecureHash'] ?? null;
        if (! is_string($provided) || ! filled(config('services.vnpay.hash_secret'))) {
            return false;
        }

        unset($params['vnp_SecureHash'], $params['vnp_SecureHashType']);
        foreach ($params as $value) {
            if (! is_scalar($value) && $value !== null) {
                return false;
            }
        }

        $canonical = $this->vnpayQuery($params);
        $expected = hash_hmac('sha512', $canonical, (string) config('services.vnpay.hash_secret'));

        return hash_equals(strtolower($expected), strtolower($provided));
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function verifyPayOsSignature(array $data, mixed $signature): bool
    {
        if (! is_string($signature) || ! filled(config('services.payos.checksum_key'))) {
            return false;
        }

        $expected = hash_hmac(
            'sha256',
            $this->payOsCanonicalData($data),
            (string) config('services.payos.checksum_key'),
        );

        return hash_equals(strtolower($expected), strtolower($signature));
    }

    public function canSimulate(Payment $payment): bool
    {
        if (! in_array(config('app.env'), ['local', 'testing'], true)) {
            return false;
        }

        if ($payment->phuong_thuc === 'vnpay' && $this->vnpayConfigured()) {
            return false;
        }

        if ($payment->phuong_thuc === 'payos' && $this->payOsConfigured()) {
            return false;
        }

        return true;
    }

    public function payOsConfigured(): bool
    {
        return filled(config('services.payos.client_id'))
            && filled(config('services.payos.api_key'))
            && filled(config('services.payos.checksum_key'));
    }

    private function vnpayConfigured(): bool
    {
        return filled(config('services.vnpay.tmn_code'))
            && filled(config('services.vnpay.hash_secret'));
    }

    /**
     * @return array<string, mixed>
     */
    private function mockData(Payment $payment): array
    {
        return [
            'payment_url' => null,
            'qr_payload' => implode('|', [
                'NONG-LANH-PAY',
                $payment->phuong_thuc,
                $payment->ma_giao_dich,
                (string) $payment->so_tien,
            ]),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function vietQr(Payment $payment): array
    {
        $bankId = config('services.vietqr.bank_id');
        $accountNo = config('services.vietqr.account_no');
        if (! filled($bankId) || ! filled($accountNo)) {
            throw new HttpException(503, 'Chưa cấu hình tài khoản nhận VietQR.');
        }

        $transferContent = 'NL'.(int) $payment->getKey();
        $template = (string) config('services.vietqr.template', 'compact2');
        $query = [
            'amount' => (int) $payment->so_tien,
            'addInfo' => $transferContent,
        ];
        if (filled(config('services.vietqr.account_name'))) {
            $query['accountName'] = config('services.vietqr.account_name');
        }

        $qrUrl = 'https://img.vietqr.io/image/'
            .rawurlencode((string) $bankId).'-'
            .rawurlencode((string) $accountNo).'-'
            .rawurlencode($template).'.png?'
            .http_build_query($query, '', '&', PHP_QUERY_RFC3986);

        return [
            'payment_url' => $qrUrl,
            'qr_image_url' => $qrUrl,
            'transfer' => [
                'bank_id' => $bankId,
                'account_no' => $accountNo,
                'account_name' => config('services.vietqr.account_name'),
                'amount' => (int) $payment->so_tien,
                'transfer_content' => $transferContent,
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function createPayOs(Payment $payment): array
    {
        $appUrl = rtrim((string) config('app.url'), '/');
        $description = 'NL'.(int) $payment->getKey();
        $payload = [
            'orderCode' => (int) $payment->getKey(),
            'amount' => (int) $payment->so_tien,
            'description' => $description,
            'returnUrl' => $appUrl.'/checkout?payment=success',
            'cancelUrl' => $appUrl.'/checkout?payment=cancelled',
        ];
        $payload['signature'] = hash_hmac(
            'sha256',
            $this->payOsCanonicalData($payload),
            (string) config('services.payos.checksum_key'),
        );

        try {
            $response = Http::acceptJson()
                ->withHeaders([
                    'x-client-id' => config('services.payos.client_id'),
                    'x-api-key' => config('services.payos.api_key'),
                ])
                ->timeout(20)
                ->post((string) config('services.payos.api_url'), $payload);
        } catch (ConnectionException $exception) {
            throw new HttpException(502, 'PayOS hiện không khả dụng.', $exception);
        }

        if (! $response->successful() || $response->json('code') !== '00') {
            throw new HttpException(502, 'Không thể tạo liên kết thanh toán PayOS (HTTP '.$response->status().').');
        }

        $data = $response->json('data');
        if (! is_array($data)
            || ! is_string($data['checkoutUrl'] ?? null)
            || ! is_string($data['qrCode'] ?? null)) {
            throw new HttpException(502, 'PayOS trả về dữ liệu thanh toán không hợp lệ.');
        }

        return [
            'payment_url' => $data['checkoutUrl'],
            'qr_payload' => $data['qrCode'],
            'provider_payment_id' => $data['paymentLinkId'] ?? null,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function createVnpay(Payment $payment, string $ipAddress): array
    {
        $returnUrl = config('services.vnpay.return_url');
        if (! filled($returnUrl)) {
            throw new HttpException(503, 'Chưa cấu hình VNPAY_RETURN_URL.');
        }

        $params = [
            'vnp_Version' => '2.1.0',
            'vnp_Command' => 'pay',
            'vnp_TmnCode' => config('services.vnpay.tmn_code'),
            'vnp_Amount' => (int) $payment->so_tien * 100,
            'vnp_CreateDate' => now()->format('YmdHis'),
            'vnp_CurrCode' => 'VND',
            'vnp_IpAddr' => filter_var($ipAddress, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)
                ? $ipAddress
                : '127.0.0.1',
            'vnp_Locale' => 'vn',
            'vnp_OrderInfo' => 'Thanh toan don hang '.$payment->ma_giao_dich,
            'vnp_OrderType' => 'other',
            'vnp_ReturnUrl' => $returnUrl,
            'vnp_TxnRef' => (string) $payment->getKey(),
        ];
        ksort($params, SORT_STRING);
        $query = http_build_query($params, '', '&', PHP_QUERY_RFC3986);
        $signature = hash_hmac('sha512', $query, (string) config('services.vnpay.hash_secret'));
        $url = rtrim((string) config('services.vnpay.url'), '?')
            .'?'.$query.'&vnp_SecureHash='.$signature;

        return [
            'payment_url' => $url,
            'qr_payload' => null,
        ];
    }

    /**
     * @param  array<string, mixed>  $params
     */
    private function vnpayQuery(array $params): string
    {
        ksort($params, SORT_STRING);

        return http_build_query($params, '', '&', PHP_QUERY_RFC3986);
    }

    /**
     * PayOS signs the alphabetically sorted `key=value` pairs without URL encoding.
     *
     * @param  array<string, mixed>  $data
     */
    private function payOsCanonicalData(array $data): string
    {
        ksort($data, SORT_STRING);
        $pairs = [];
        foreach ($data as $key => $value) {
            if (is_array($value)) {
                $value = implode(',', $value);
            } elseif (is_bool($value)) {
                $value = $value ? 'true' : 'false';
            } elseif ($value === null) {
                $value = '';
            }

            if (! is_scalar($value)) {
                throw new \InvalidArgumentException('Dữ liệu ký PayOS không hợp lệ.');
            }

            $pairs[] = $key.'='.$value;
        }

        return implode('&', $pairs);
    }
}
