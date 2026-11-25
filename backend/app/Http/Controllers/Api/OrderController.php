<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreOrderRequest;
use App\Http\Requests\UpdateOrderStatusRequest;
use App\Models\CartItem;
use App\Models\Order;
use App\Models\OrderDetail;
use App\Services\FefoService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpException;

class OrderController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Order::query()->with(['details.product', 'details.batch']);

        if ($request->user()->role->ten_vai_tro === 'customer') {
            $query->where('user_id', $request->user()->getKey());
        }

        return response()->json($query->latest('ngay_tao')->paginate(20));
    }

    public function store(StoreOrderRequest $request): JsonResponse
    {
        $order = DB::transaction(function () use ($request): Order {
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
            $shippingFee = (int) ($request->validated('phi_van_chuyen') ?? 0);
            $order = Order::query()->create([
                'ma_don' => Str::upper(Str::random(20)),
                'user_id' => $userId,
                'loai_don' => 'le',
                'ten_nguoi_nhan' => $request->validated('ten_nguoi_nhan'),
                'sdt_nguoi_nhan' => $request->validated('sdt_nguoi_nhan'),
                'dia_chi_giao' => $request->validated('dia_chi_giao'),
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

    public function approve(Request $request, int $id, FefoService $fefo): JsonResponse
    {
        $order = DB::transaction(function () use ($request, $id, $fefo): Order {
            $order = Order::query()->lockForUpdate()->findOrFail($id);

            if ($order->trang_thai !== 'cho_duyet') {
                throw new HttpException(409, 'Chỉ đơn hàng đang chờ duyệt mới được xác nhận.');
            }

            $details = $order->details()->get();
            if ($details->isEmpty()) {
                throw ValidationException::withMessages([
                    'order' => ['Đơn hàng chưa có sản phẩm.'],
                ]);
            }

            foreach ($details as $detail) {
                if ($detail->batch_id !== null) {
                    throw new HttpException(409, 'Đơn hàng đã được phân bổ lô hàng.');
                }

                $allocations = $fefo->deduct((int) $detail->product_id, (string) $detail->so_luong);
                foreach ($allocations as $index => $allocation) {
                    if ($index === 0) {
                        $detail->batch_id = $allocation['batch_id'];
                        $detail->so_luong = $allocation['so_luong'];
                        $detail->save();

                        continue;
                    }

                    OrderDetail::query()->create([
                        'order_id' => $order->getKey(),
                        'product_id' => $detail->product_id,
                        'batch_id' => $allocation['batch_id'],
                        'so_luong' => $allocation['so_luong'],
                        'don_gia' => $detail->don_gia,
                    ]);
                }
            }

            $order->trang_thai = 'da_xac_nhan';
            $order->nguoi_duyet_id = $request->user()->getKey();
            $order->ngay_duyet = now();
            $order->save();

            return $order->load('details.product', 'details.batch');
        });

        return response()->json(['data' => $order]);
    }

    public function updateStatus(UpdateOrderStatusRequest $request, int $id): JsonResponse
    {
        $order = DB::transaction(function () use ($request, $id): Order {
            $order = Order::query()->lockForUpdate()->findOrFail($id);
            $role = $request->user()->role->ten_vai_tro;
            $newStatus = $request->validated('trang_thai');

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

            return $order;
        });

        return response()->json(['data' => $order]);
    }
}
