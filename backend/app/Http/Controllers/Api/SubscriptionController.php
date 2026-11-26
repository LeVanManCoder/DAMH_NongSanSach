<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreSubscriptionRequest;
use App\Http\Requests\UpdateSubscriptionStatusRequest;
use App\Models\Address;
use App\Models\Product;
use App\Models\Subscription;
use App\Models\SubscriptionPlan;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use OpenApi\Annotations as OA;

class SubscriptionController extends Controller
{
    /**
     * @OA\Get(
     *     path="/api/subscription-plans",
     *     tags={"Gói định kỳ"},
     *     summary="Danh sách gói định kỳ đang mở",
     *
     *     @OA\Response(response=200, description="Các gói khách hàng có thể đăng ký.")
     * )
     */
    public function plans(): JsonResponse
    {
        return response()->json([
            'data' => SubscriptionPlan::query()
                ->where('is_active', true)
                ->orderBy('chu_ky_ngay')
                ->get(),
        ]);
    }

    /**
     * @OA\Get(
     *     path="/api/subscriptions",
     *     tags={"Gói định kỳ"},
     *     summary="Danh sách gói định kỳ của khách hàng hiện tại",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Response(response=200, description="Các gói kèm sản phẩm, địa chỉ và lịch giao.")
     * )
     */
    public function index(Request $request): JsonResponse
    {
        $subscriptions = Subscription::query()
            ->where('user_id', $request->user()->getKey())
            ->with(['plan', 'address', 'items.product', 'deliveryDays'])
            ->latest('created_at')
            ->paginate(20);

        return response()->json($subscriptions);
    }

    /**
     * @OA\Post(
     *     path="/api/subscriptions",
     *     tags={"Gói định kỳ"},
     *     summary="Đăng ký gói nhận nông sản định kỳ",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\RequestBody(required=true, @OA\JsonContent(
     *         required={"plan_id","address_id","ngay_bat_dau","chu_ky_giao_ngay","items"},
     *
     *         @OA\Property(property="plan_id", type="integer"),
     *         @OA\Property(property="address_id", type="integer"),
     *         @OA\Property(property="ngay_bat_dau", type="string", format="date"),
     *         @OA\Property(property="chu_ky_giao_ngay", type="integer", enum={7,14}),
     *         @OA\Property(property="items", type="array", @OA\Items(type="object"))
     *     )),
     *
     *     @OA\Response(response=201, description="Gói định kỳ đã được đăng ký."),
     *     @OA\Response(response=404, description="Địa chỉ không thuộc tài khoản."),
     *     @OA\Response(response=422, description="Dữ liệu đăng ký không hợp lệ.")
     * )
     */
    public function store(StoreSubscriptionRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $subscription = DB::transaction(function () use ($request, $validated): Subscription {
            $userId = (int) $request->user()->getKey();
            $address = Address::query()
                ->where('user_id', $userId)
                ->findOrFail($validated['address_id']);
            $plan = SubscriptionPlan::query()
                ->where('is_active', true)
                ->find($validated['plan_id']);

            if ($plan === null) {
                throw ValidationException::withMessages([
                    'plan_id' => ['Gói định kỳ này hiện không còn mở đăng ký.'],
                ]);
            }

            $items = collect($validated['items'])->map(function (array $item): array {
                $product = Product::query()->findOrFail($item['product_id']);
                if (! $product->is_active) {
                    throw ValidationException::withMessages([
                        'items' => ['Sản phẩm đã chọn hiện không còn mở bán.'],
                    ]);
                }

                $quantity = (float) $item['so_luong_moi_lan'];

                return [
                    'product_id' => $product->getKey(),
                    'so_luong_moi_lan' => $item['so_luong_moi_lan'],
                    'don_gia' => $product->gia_ban_co_ban,
                    'line_total' => (int) round($quantity * (float) $product->gia_ban_co_ban),
                ];
            });

            $startDate = Carbon::parse($validated['ngay_bat_dau'])->startOfDay();
            $subscription = Subscription::query()->create([
                'user_id' => $userId,
                'plan_id' => $plan->getKey(),
                'address_id' => $address->getKey(),
                'ngay_bat_dau' => $startDate->toDateString(),
                'ngay_ket_thuc' => $startDate->copy()->addDays($plan->chu_ky_ngay)->toDateString(),
                'chu_ky_giao_ngay' => $validated['chu_ky_giao_ngay'],
                'tong_tien' => $items->sum('line_total'),
                'trang_thai' => 'dang_hoat_dong',
            ]);

            foreach ($items as $item) {
                $subscription->items()->create([
                    'product_id' => $item['product_id'],
                    'so_luong_moi_lan' => $item['so_luong_moi_lan'],
                    'don_gia' => $item['don_gia'],
                ]);
            }

            $deliveryDays = $validated['thu_trong_tuan'] ?? [$startDate->dayOfWeekIso];
            foreach ($deliveryDays as $day) {
                $subscription->deliveryDays()->create(['thu_trong_tuan' => $day]);
            }

            return $subscription->load(['plan', 'address', 'items.product', 'deliveryDays']);
        });

        return response()->json(['data' => $subscription], 201);
    }

    /**
     * @OA\Patch(
     *     path="/api/subscriptions/{id}/status",
     *     tags={"Gói định kỳ"},
     *     summary="Tạm dừng, tiếp tục hoặc hủy gói định kỳ",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
     *
     *     @OA\RequestBody(required=true, @OA\JsonContent(
     *         required={"trang_thai"},
     *
     *         @OA\Property(property="trang_thai", type="string", enum={"tam_dung","dang_hoat_dong","da_huy"})
     *     )),
     *
     *     @OA\Response(response=200, description="Trạng thái gói đã được cập nhật."),
     *     @OA\Response(response=404, description="Không tìm thấy gói thuộc tài khoản."),
     *     @OA\Response(response=422, description="Chuyển trạng thái không hợp lệ.")
     * )
     */
    public function updateStatus(
        UpdateSubscriptionStatusRequest $request,
        int $id,
    ): JsonResponse {
        $subscription = DB::transaction(function () use ($request, $id): Subscription {
            $subscription = Subscription::query()
                ->where('user_id', $request->user()->getKey())
                ->lockForUpdate()
                ->findOrFail($id);
            $targetStatus = $request->validated('trang_thai');
            $allowedTransitions = [
                'dang_hoat_dong' => ['tam_dung', 'da_huy'],
                'tam_dung' => ['dang_hoat_dong', 'da_huy'],
            ];

            if (! in_array($targetStatus, $allowedTransitions[$subscription->trang_thai] ?? [], true)) {
                throw ValidationException::withMessages([
                    'trang_thai' => ['Không thể chuyển gói từ trạng thái hiện tại sang trạng thái đã chọn.'],
                ]);
            }

            $subscription->update(['trang_thai' => $targetStatus]);

            return $subscription->load(['plan', 'address', 'items.product', 'deliveryDays']);
        });

        return response()->json(['data' => $subscription]);
    }
}
