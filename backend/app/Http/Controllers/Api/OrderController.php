<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreOrderRequest;
use App\Http\Requests\UpdateOrderStatusRequest;
use App\Models\CartItem;
use App\Models\Order;
use App\Services\AuditLogService;
use App\Services\FefoService;
use App\Services\Payments\PaymentGatewayService;
use App\Services\ShippingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use OpenApi\Annotations as OA;
use Symfony\Component\HttpKernel\Exception\HttpException;

class OrderController extends Controller
{
    /**
     * @OA\Get(
     *     path="/api/orders",
     *     tags={"Đơn hàng"},
     *     summary="Danh sách đơn hàng",
     *     description="Khách hàng chỉ xem đơn của mình; Sales và Admin xem toàn bộ đơn hàng.",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Response(response=200, description="Danh sách đơn hàng phân trang, kèm chi tiết sản phẩm và lô."),
     *     @OA\Response(response=401, description="Thiếu hoặc token không hợp lệ."),
     *     @OA\Response(response=403, description="Vai trò không được phép xem đơn hàng.")
     * )
     */
    public function index(Request $request): JsonResponse
    {
        $query = Order::query()->with(['details.product', 'details.batch']);

        if ($request->user()->role->ten_vai_tro === 'customer') {
            $query->where('user_id', $request->user()->getKey())
                ->with(['complaint.media', 'reviews']);
        } else {
            $query->with('user:id,ho_ten')
                ->with(['payments' => fn ($payments) => $payments
                    ->select(['id', 'order_id', 'phuong_thuc', 'so_tien', 'trang_thai', 'created_at'])
                    ->latest('id')]);
        }

        return response()->json($query->latest('ngay_tao')->paginate(20));
    }

    /**
     * @OA\Post(
     *     path="/api/orders",
     *     tags={"Đơn hàng"},
     *     summary="Tạo đơn hàng từ giỏ hàng",
     *     description="Customer tạo đơn ở trạng thái chờ duyệt; backend tự tính phí giao hàng theo địa chỉ, chụp giá và làm trống giỏ hàng.",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\RequestBody(
     *         required=true,
     *
     *         @OA\JsonContent(
     *             required={"ten_nguoi_nhan","sdt_nguoi_nhan","dia_chi_giao"},
     *
     *             @OA\Property(property="ten_nguoi_nhan", type="string", example="Nguyễn Thị An"),
     *             @OA\Property(property="sdt_nguoi_nhan", type="string", example="0901234567"),
     *             @OA\Property(property="dia_chi_giao", type="string", example="12 Đường Xanh, Đà Lạt"),
     *             @OA\Property(property="ngay_giao_du_kien", type="string", format="date", nullable=true, example="2026-11-28"),
     *             @OA\Property(property="ghi_chu", type="string", nullable=true, example="Giao giờ hành chính")
     *         )
     *     ),
     *
     *     @OA\Response(response=201, description="Đơn hàng đã được tạo và đang chờ duyệt."),
     *     @OA\Response(response=401, description="Thiếu hoặc token không hợp lệ."),
     *     @OA\Response(response=403, description="Chỉ khách hàng được tạo đơn."),
     *     @OA\Response(response=422, description="Giỏ hàng trống hoặc dữ liệu giao hàng không hợp lệ.")
     * )
     */
    public function store(StoreOrderRequest $request, ShippingService $shipping): JsonResponse
    {
        $validated = $request->validated();
        $shippingQuote = $shipping->calculate(
            $validated['dia_chi_giao'],
            null,
            isset($validated['vi_do']) ? (float) $validated['vi_do'] : null,
            isset($validated['kinh_do']) ? (float) $validated['kinh_do'] : null,
        );

        $order = DB::transaction(function () use ($request, $shippingQuote): Order {
            $userId = $request->user()->getKey();
            $cartItems = CartItem::query()
                ->where('user_id', $userId)
                ->with('product')
                ->lockForUpdate()
                ->get();

            if ($cartItems->isEmpty()) {
                throw ValidationException::withMessages([
                    'cart' => ['Giỏ hàng đang trống.'],
                ]);
            }

            foreach ($cartItems as $item) {
                if ($item->product === null || ! $item->product->is_active) {
                    throw ValidationException::withMessages([
                        'cart' => ['Giỏ hàng có sản phẩm không còn được mở bán.'],
                    ]);
                }
            }

            $details = $cartItems->map(function (CartItem $item): array {
                $quantity = (float) $item->so_luong;
                $unitPrice = (float) $item->product->gia_ban_co_ban;

                return [
                    'product_id' => $item->product_id,
                    'so_luong' => $item->so_luong,
                    'don_gia' => $item->product->gia_ban_co_ban,
                    'thanh_tien' => (int) round($quantity * $unitPrice),
                ];
            });

            $subtotal = (int) $details->sum('thanh_tien');
            $shippingFee = $shippingQuote['phi_van_chuyen'];
            $order = Order::query()->create([
                'ma_don' => Str::upper(Str::random(20)),
                'user_id' => $userId,
                'loai_don' => 'le',
                'ten_nguoi_nhan' => $request->validated('ten_nguoi_nhan'),
                'sdt_nguoi_nhan' => $request->validated('sdt_nguoi_nhan'),
                'dia_chi_giao' => $request->validated('dia_chi_giao'),
                'khoang_cach_km' => $shippingQuote['khoang_cach_km'],
                'phi_van_chuyen' => $shippingFee,
                'tong_tien_hang' => $subtotal,
                'tong_thanh_toan' => $subtotal + $shippingFee,
                'trang_thai' => 'cho_duyet',
                'ngay_giao_du_kien' => $request->validated('ngay_giao_du_kien'),
                'ghi_chu' => $request->validated('ghi_chu'),
            ]);

            foreach ($details as $detail) {
                $order->details()->create($detail);
            }

            CartItem::query()->where('user_id', $userId)->delete();

            return $order->load('details.product');
        });

        return response()->json(['data' => $order], 201);
    }

    /**
     * @OA\Patch(
     *     path="/api/orders/{id}/approve",
     *     tags={"Đơn hàng"},
     *     summary="Duyệt đơn và phân bổ tồn kho theo FEFO",
     *     description="Chỉ Sales được duyệt đơn. Hệ thống trừ hàng từ các lô còn hạn theo ngày hết hạn gần nhất và lưu chi tiết phân bổ.",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Parameter(name="id", in="path", required=true, description="ID đơn hàng.", @OA\Schema(type="integer")),
     *
     *     @OA\Response(response=200, description="Đơn được duyệt và hàng đã được phân bổ theo FEFO."),
     *     @OA\Response(response=401, description="Thiếu hoặc token không hợp lệ."),
     *     @OA\Response(response=403, description="Chỉ Sales được duyệt đơn."),
     *     @OA\Response(response=404, description="Không tìm thấy đơn hàng."),
     *     @OA\Response(response=409, description="Đơn hàng không ở trạng thái chờ duyệt."),
     *     @OA\Response(
     *         response=422,
     *         description="Tồn kho khả dụng không đủ; giao dịch được rollback.",
     *
     *         @OA\JsonContent(
     *
     *             @OA\Property(property="status", type="string", example="error"),
     *             @OA\Property(property="message", type="string", example="Số lượng tồn kho không đủ")
     *         )
     *     )
     * )
     */
    public function approve(
        Request $request,
        int $id,
        FefoService $fefo,
        AuditLogService $auditLogs,
    ): JsonResponse {
        $order = DB::transaction(function () use ($request, $id, $fefo, $auditLogs): Order {
            $pendingOrder = Order::query()->lockForUpdate()->findOrFail($id);
            $order = $fefo->approveAndAllocateOrder($id, (int) $request->user()->getKey());
            $auditLogs->record(
                $request->user(),
                'duyet_don_hang',
                'orders',
                $id,
                ['trang_thai' => $pendingOrder->trang_thai],
                [
                    'trang_thai' => $order->trang_thai,
                    'nguoi_duyet_id' => $order->nguoi_duyet_id,
                ],
                $request->ip(),
            );

            return $order;
        });

        return response()->json(['data' => $order]);
    }

    /**
     * @OA\Put(
     *     path="/api/orders/{id}/status",
     *     tags={"Đơn hàng"},
     *     summary="Cập nhật trạng thái đơn hàng bằng PUT",
     *     description="Sales/Admin cập nhật tiến trình giao hàng; Customer chỉ được hủy đơn đang chờ duyệt.",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Parameter(name="id", in="path", required=true, description="ID đơn hàng.", @OA\Schema(type="integer")),
     *
     *     @OA\RequestBody(required=true, @OA\JsonContent(
     *         required={"trang_thai"},
     *
     *         @OA\Property(property="trang_thai", type="string", enum={"da_huy","dang_giao","da_giao","giao_bu"}, example="da_giao")
     *     )),
     *
     *     @OA\Response(response=200, description="Trạng thái đơn hàng đã được cập nhật."),
     *     @OA\Response(response=401, description="Thiếu hoặc token không hợp lệ."),
     *     @OA\Response(response=403, description="Vai trò không được phép cập nhật trạng thái."),
     *     @OA\Response(response=404, description="Không tìm thấy đơn hàng."),
     *     @OA\Response(response=409, description="Không thể chuyển trạng thái theo yêu cầu."),
     *     @OA\Response(response=422, description="Trạng thái không hợp lệ.")
     * )
     *
     * @OA\Patch(
     *     path="/api/orders/{id}/status",
     *     tags={"Đơn hàng"},
     *     summary="Cập nhật trạng thái đơn hàng",
     *     description="Customer chỉ được hủy đơn đang chờ duyệt; Sales/Admin cập nhật các bước giao hàng hợp lệ.",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Parameter(name="id", in="path", required=true, description="ID đơn hàng.", @OA\Schema(type="integer")),
     *
     *     @OA\RequestBody(
     *         required=true,
     *
     *         @OA\JsonContent(
     *             required={"trang_thai"},
     *
     *             @OA\Property(property="trang_thai", type="string", enum={"da_huy","dang_giao","da_giao","giao_bu"}, example="dang_giao")
     *         )
     *     ),
     *
     *     @OA\Response(response=200, description="Trạng thái đơn hàng đã được cập nhật."),
     *     @OA\Response(response=401, description="Thiếu hoặc token không hợp lệ."),
     *     @OA\Response(response=403, description="Vai trò không được phép cập nhật trạng thái."),
     *     @OA\Response(response=404, description="Không tìm thấy đơn hàng."),
     *     @OA\Response(response=409, description="Không thể chuyển trạng thái theo yêu cầu."),
     *     @OA\Response(response=422, description="Trạng thái không hợp lệ.")
     * )
     */
    public function updateStatus(
        UpdateOrderStatusRequest $request,
        int $id,
        AuditLogService $auditLogs,
    ): JsonResponse {
        $order = DB::transaction(function () use ($request, $id, $auditLogs): Order {
            $order = Order::query()->lockForUpdate()->findOrFail($id);
            $role = $request->user()->role->ten_vai_tro;
            $newStatus = $request->validated('trang_thai');
            $oldData = [
                'trang_thai' => $order->trang_thai,
                'ngay_giao_thuc_te' => $order->ngay_giao_thuc_te?->toISOString(),
            ];

            if ($role === 'customer') {
                if ((int) $order->user_id !== (int) $request->user()->getKey()) {
                    throw new HttpException(404, 'Không tìm thấy đơn hàng yêu cầu.');
                }

                if ($newStatus !== 'da_huy' || $order->trang_thai !== 'cho_duyet') {
                    throw new HttpException(409, 'Khách hàng chỉ được hủy đơn hàng đang chờ duyệt.');
                }
            } else {
                $transitions = [
                    'da_xac_nhan' => ['dang_giao', 'da_huy'],
                    'da_thanh_toan' => ['dang_giao', 'da_huy'],
                    'dang_giao' => ['da_giao', 'giao_bu', 'da_huy'],
                    'giao_bu' => ['dang_giao', 'da_giao'],
                ];

                if (! in_array($newStatus, $transitions[$order->trang_thai] ?? [], true)) {
                    throw new HttpException(409, 'Trạng thái đơn hàng không thể chuyển theo yêu cầu.');
                }
            }

            $order->trang_thai = $newStatus;
            if ($newStatus === 'da_giao') {
                $order->ngay_giao_thuc_te = now();
            }
            $order->save();

            if ($role !== 'customer') {
                $auditLogs->record(
                    $request->user(),
                    'cap_nhat_trang_thai_don_hang',
                    'orders',
                    (int) $order->getKey(),
                    $oldData,
                    [
                        'trang_thai' => $order->trang_thai,
                        'ngay_giao_thuc_te' => $order->ngay_giao_thuc_te?->toISOString(),
                    ],
                    $request->ip(),
                );
            }

            return $order;
        });

        return response()->json(['data' => $order]);
    }

    /**
     * @OA\Patch(
     *     path="/api/orders/{id}/confirm-payment",
     *     tags={"Đơn hàng"},
     *     summary="Sales/Admin xác nhận đã nhận tiền VietQR",
     *     description="Xác nhận giao dịch VietQR đang chờ, phân bổ tồn kho theo FEFO và ghi audit log theo cách idempotent.",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
     *
     *     @OA\Response(response=200, description="Thanh toán đã được xác nhận."),
     *     @OA\Response(response=403, description="Chỉ Sales/Admin được xác nhận."),
     *     @OA\Response(response=404, description="Không tìm thấy đơn hàng."),
     *     @OA\Response(response=409, description="Không có giao dịch VietQR chờ xử lý hoặc đơn không còn chờ thanh toán.")
     * )
     */
    public function confirmPayment(
        Request $request,
        int $id,
        PaymentGatewayService $payments,
        FefoService $fefo,
        AuditLogService $auditLogs,
    ): JsonResponse {
        $order = $payments->confirmVietQrPayment(
            $id,
            (int) $request->user()->getKey(),
            $request->ip(),
            $fefo,
            $auditLogs,
        );

        return response()->json(['data' => $order]);
    }
}
