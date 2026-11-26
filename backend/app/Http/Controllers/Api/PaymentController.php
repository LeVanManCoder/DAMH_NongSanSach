<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\CreatePaymentRequest;
use App\Http\Requests\PaymentIpnRequest;
use App\Models\Order;
use App\Models\Payment;
use App\Services\FefoService;
use App\Services\Payments\PaymentGatewayService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use OpenApi\Annotations as OA;
use Symfony\Component\HttpKernel\Exception\HttpException;

class PaymentController extends Controller
{
    /**
     * @OA\Post(
     *     path="/api/payments/create",
     *     tags={"Thanh toán"},
     *     summary="Tạo giao dịch thanh toán",
     *     description="Tạo giao dịch MoMo mô phỏng, VietQR, PayOS hoặc VNPay Sandbox cho đơn hàng hiện tại.",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\RequestBody(
     *         required=true,
     *
     *         @OA\JsonContent(
     *             required={"order_id","phuong_thuc"},
     *
     *             @OA\Property(property="order_id", type="integer", example=1),
     *             @OA\Property(property="phuong_thuc", type="string", enum={"momo","vnpay","vietqr","payos"}, example="vietqr")
     *         )
     *     ),
     *
     *     @OA\Response(response=201, description="Giao dịch và QR payload đã được tạo."),
     *     @OA\Response(response=401, description="Thiếu hoặc token không hợp lệ."),
     *     @OA\Response(response=403, description="Chỉ chủ đơn hàng được tạo giao dịch."),
     *     @OA\Response(response=409, description="Đơn không còn chờ thanh toán hoặc đã có giao dịch khác."),
     *     @OA\Response(response=422, description="Dữ liệu thanh toán không hợp lệ.")
     * )
     */
    public function create(
        CreatePaymentRequest $request,
        PaymentGatewayService $gateways,
    ): JsonResponse {
        [$payment, $created] = DB::transaction(function () use ($request): array {
            $order = Order::query()
                ->where('user_id', $request->user()->getKey())
                ->lockForUpdate()
                ->findOrFail($request->validated('order_id'));

            if ($order->trang_thai !== 'cho_duyet') {
                throw new HttpException(409, 'Đơn hàng không còn ở trạng thái chờ thanh toán.');
            }

            if ((int) $order->tong_thanh_toan <= 0) {
                throw ValidationException::withMessages([
                    'order_id' => ['Tổng thanh toán phải lớn hơn 0.'],
                ]);
            }

            if ($order->payments()->where('trang_thai', 'thanh_cong')->exists()) {
                throw new HttpException(409, 'Đơn hàng đã được thanh toán.');
            }

            $pendingPayment = $order->payments()
                ->where('trang_thai', 'cho_xu_ly')
                ->lockForUpdate()
                ->first();

            if ($pendingPayment !== null) {
                if ($pendingPayment->phuong_thuc !== $request->validated('phuong_thuc')) {
                    throw new HttpException(409, 'Đơn hàng đã có giao dịch đang chờ xử lý.');
                }

                return [$pendingPayment, false];
            }

            $payment = Payment::query()->create([
                'order_id' => $order->getKey(),
                'subscription_id' => null,
                'phuong_thuc' => $request->validated('phuong_thuc'),
                'so_tien' => $order->tong_thanh_toan,
                'trang_thai' => 'cho_xu_ly',
                'ma_giao_dich' => 'NL-'.Str::upper((string) Str::uuid()),
            ]);

            return [$payment, true];
        });

        $gatewayData = $gateways->create($payment, (string) $request->ip());

        return response()->json([
            'data' => [
                'payment' => [
                    'id' => $payment->getKey(),
                    'order_id' => $payment->order_id,
                    'phuong_thuc' => $payment->phuong_thuc,
                    'so_tien' => $payment->so_tien,
                    'trang_thai' => $payment->trang_thai,
                    'ma_giao_dich' => $payment->ma_giao_dich,
                ],
                'qr_payload' => $gatewayData['qr_payload'] ?? null,
                'payment_url' => $gatewayData['payment_url'] ?? null,
                'qr_image_url' => $gatewayData['qr_image_url'] ?? null,
                'transfer' => $gatewayData['transfer'] ?? null,
                'can_simulate' => $gateways->canSimulate($payment),
            ],
        ], $created ? 201 : 200);
    }

    /**
     * @OA\Post(
     *     path="/api/payments/ipn",
     *     tags={"Thanh toán"},
     *     summary="Nhận callback thanh toán mô phỏng",
     *     description="Callback demo chỉ chấp nhận mã giao dịch tồn tại và khớp số tiền. Khi thành công, cập nhật trạng thái đơn và phân bổ FEFO trong cùng transaction. Production phải xác minh chữ ký của cổng thanh toán.",
     *
     *     @OA\RequestBody(
     *         required=true,
     *
     *         @OA\JsonContent(
     *             required={"ma_giao_dich","so_tien","trang_thai"},
     *
     *             @OA\Property(property="ma_giao_dich", type="string", example="NL-6B53C05E-5DD2-4A4D-A869-7C4AFB0D1BA0"),
     *             @OA\Property(property="so_tien", type="integer", example=475000),
     *             @OA\Property(property="trang_thai", type="string", enum={"thanh_cong","that_bai"}, example="thanh_cong")
     *         )
     *     ),
     *
     *     @OA\Response(response=200, description="Callback được xử lý; lặp lại callback thành công không trừ kho lần nữa."),
     *     @OA\Response(response=404, description="Không tìm thấy giao dịch."),
     *     @OA\Response(response=409, description="Giao dịch hoặc đơn hàng không thể chuyển trạng thái."),
     *     @OA\Response(response=422, description="Số tiền callback không khớp hoặc dữ liệu không hợp lệ.")
     * )
     */
    public function ipn(
        PaymentIpnRequest $request,
        FefoService $fefo,
        PaymentGatewayService $gateways,
    ): JsonResponse {
        $result = DB::transaction(function () use ($request, $fefo, $gateways): array {
            $data = $request->validated();
            $payment = Payment::query()
                ->where('ma_giao_dich', $data['ma_giao_dich'])
                ->lockForUpdate()
                ->firstOrFail();

            if (! $gateways->canSimulate($payment)) {
                throw new HttpException(403, 'Giao dịch này chỉ được xác nhận bởi callback đã ký của cổng thanh toán.');
            }

            if ((int) $payment->so_tien !== (int) $data['so_tien']) {
                throw ValidationException::withMessages([
                    'so_tien' => ['Số tiền callback không khớp với giao dịch.'],
                ]);
            }

            if ($payment->trang_thai === 'thanh_cong') {
                if ($data['trang_thai'] !== 'thanh_cong') {
                    throw new HttpException(409, 'Giao dịch đã thanh toán thành công.');
                }

                return [
                    'payment' => $payment,
                    'order' => $payment->order,
                    'duplicate' => true,
                ];
            }

            if ($payment->trang_thai === 'that_bai') {
                if ($data['trang_thai'] !== 'that_bai') {
                    throw new HttpException(409, 'Giao dịch đã được ghi nhận thất bại.');
                }

                return [
                    'payment' => $payment,
                    'order' => $payment->order,
                    'duplicate' => true,
                ];
            }

            if ($payment->order_id === null) {
                throw new HttpException(409, 'Giao dịch này không gắn với đơn hàng.');
            }

            if ($data['trang_thai'] === 'that_bai') {
                $payment->trang_thai = 'that_bai';
                $payment->save();

                return [
                    'payment' => $payment,
                    'order' => $payment->order,
                    'duplicate' => false,
                ];
            }

            $order = $payment->order;
            if ($order === null || $order->trang_thai !== 'cho_duyet') {
                throw new HttpException(409, 'Đơn hàng không còn chờ thanh toán.');
            }

            $order = $fefo->approveAndAllocateOrder(
                (int) $order->getKey(),
                null,
                'da_thanh_toan',
            );
            $payment->trang_thai = 'thanh_cong';
            $payment->thoi_gian_thanh_toan = now();
            $payment->save();

            return [
                'payment' => $payment,
                'order' => $order,
                'duplicate' => false,
            ];
        });

        return response()->json([
            'message' => $result['duplicate']
                ? 'Callback thanh toán đã được xử lý trước đó.'
                : 'Thanh toán đã được xác nhận.',
            'data' => [
                'payment' => $result['payment'],
                'order' => $result['order'],
            ],
        ]);
    }

    /**
     * @OA\Post(
     *     path="/api/payments/payos/webhook",
     *     tags={"Thanh toán"},
     *     summary="PayOS webhook đã xác thực chữ ký",
     *
     *     @OA\Response(response=200, description="Webhook hợp lệ đã được xử lý idempotent."),
     *     @OA\Response(response=401, description="Chữ ký không hợp lệ.")
     * )
     */
    public function payOsWebhook(
        Request $request,
        PaymentGatewayService $gateways,
        FefoService $fefo,
    ): JsonResponse {
        $data = $request->input('data');
        if (! is_array($data)
            || ! $gateways->verifyPayOsSignature($data, $request->input('signature'))) {
            return response()->json(['code' => '97', 'desc' => 'Invalid signature'], 401);
        }

        $orderCode = filter_var($data['orderCode'] ?? null, FILTER_VALIDATE_INT);
        $amount = filter_var($data['amount'] ?? null, FILTER_VALIDATE_INT);
        if ($orderCode === false || $amount === false || $orderCode <= 0 || $amount <= 0) {
            return response()->json(['code' => '04', 'desc' => 'Invalid payment data'], 422);
        }

        $payment = Payment::query()->find($orderCode);
        if ($payment === null || $payment->phuong_thuc !== 'payos') {
            return response()->json(['code' => '01', 'desc' => 'Order not found'], 404);
        }

        $success = ($request->input('success') === true || $request->input('success') === 'true')
            && (string) ($data['code'] ?? '') === '00';

        try {
            $this->settleProviderPayment((int) $payment->getKey(), $amount, $success, $fefo);
        } catch (ValidationException) {
            return response()->json(['code' => '04', 'desc' => 'Amount mismatch'], 422);
        } catch (HttpException $exception) {
            return response()->json(['code' => '99', 'desc' => $exception->getMessage()], $exception->getStatusCode());
        }

        return response()->json(['code' => '00', 'desc' => 'success']);
    }

    /**
     * @OA\Get(
     *     path="/api/payments/vnpay/ipn",
     *     tags={"Thanh toán"},
     *     summary="VNPay Sandbox IPN",
     *
     *     @OA\Response(response=200, description="Phản hồi theo định dạng chuẩn VNPay.")
     * )
     *
     * @OA\Post(
     *     path="/api/payments/vnpay/ipn",
     *     tags={"Thanh toán"},
     *     summary="VNPay Sandbox IPN",
     *
     *     @OA\Response(response=200, description="Phản hồi theo định dạng chuẩn VNPay.")
     * )
     */
    public function vnpayIpn(
        Request $request,
        PaymentGatewayService $gateways,
        FefoService $fefo,
    ): JsonResponse {
        $params = $request->all();
        if (! $gateways->verifyVnpaySignature($params)) {
            return response()->json(['RspCode' => '97', 'Message' => 'Invalid signature']);
        }

        if ((string) ($params['vnp_TmnCode'] ?? '') !== (string) config('services.vnpay.tmn_code')) {
            return response()->json(['RspCode' => '97', 'Message' => 'Invalid merchant']);
        }

        $paymentId = filter_var($params['vnp_TxnRef'] ?? null, FILTER_VALIDATE_INT);
        $amountMinor = filter_var($params['vnp_Amount'] ?? null, FILTER_VALIDATE_INT);
        if ($paymentId === false || $amountMinor === false || $paymentId <= 0 || $amountMinor <= 0 || $amountMinor % 100 !== 0) {
            return response()->json(['RspCode' => '04', 'Message' => 'Invalid amount']);
        }

        $payment = Payment::query()->find($paymentId);
        if ($payment === null || $payment->phuong_thuc !== 'vnpay') {
            return response()->json(['RspCode' => '01', 'Message' => 'Order not found']);
        }

        $successful = (string) ($params['vnp_ResponseCode'] ?? '') === '00'
            && (! array_key_exists('vnp_TransactionStatus', $params)
                || (string) $params['vnp_TransactionStatus'] === '00');

        try {
            $this->settleProviderPayment((int) $payment->getKey(), intdiv($amountMinor, 100), $successful, $fefo);
        } catch (ValidationException) {
            return response()->json(['RspCode' => '04', 'Message' => 'Invalid amount']);
        } catch (HttpException) {
            return response()->json(['RspCode' => '99', 'Message' => 'Payment processing failed']);
        }

        return response()->json(['RspCode' => '00', 'Message' => 'Confirm Success']);
    }

    private function settleProviderPayment(
        int $paymentId,
        int $amount,
        bool $successful,
        FefoService $fefo,
    ): void {
        DB::transaction(function () use ($paymentId, $amount, $successful, $fefo): void {
            $payment = Payment::query()->lockForUpdate()->findOrFail($paymentId);
            if ((int) $payment->so_tien !== $amount) {
                throw ValidationException::withMessages([
                    'so_tien' => ['Số tiền callback không khớp với giao dịch.'],
                ]);
            }

            if ($payment->trang_thai === 'thanh_cong') {
                return;
            }

            if ($payment->trang_thai === 'that_bai') {
                return;
            }

            if (! $successful) {
                $payment->trang_thai = 'that_bai';
                $payment->save();

                return;
            }

            if ($payment->order_id === null) {
                throw new HttpException(409, 'Giao dịch này không gắn với đơn hàng.');
            }

            $order = $payment->order;
            if ($order === null || $order->trang_thai !== 'cho_duyet') {
                throw new HttpException(409, 'Đơn hàng không còn chờ thanh toán.');
            }

            $fefo->approveAndAllocateOrder((int) $order->getKey(), null, 'da_thanh_toan');
            $payment->trang_thai = 'thanh_cong';
            $payment->thoi_gian_thanh_toan = now();
            $payment->save();
        });
    }
}
