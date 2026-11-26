<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreAddressRequest;
use App\Http\Requests\UpdateAddressRequest;
use App\Models\Address;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use OpenApi\Annotations as OA;

class AddressController extends Controller
{
    /**
     * @OA\Get(
     *     path="/api/addresses",
     *     tags={"Địa chỉ"},
     *     summary="Danh sách địa chỉ giao hàng của khách hàng",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Response(response=200, description="Danh sách địa chỉ, địa chỉ mặc định đứng đầu.")
     * )
     */
    public function index(Request $request): JsonResponse
    {
        $addresses = Address::query()
            ->where('user_id', $request->user()->getKey())
            ->orderByDesc('la_mac_dinh')
            ->latest('id')
            ->get();

        return response()->json(['data' => $addresses]);
    }

    /**
     * @OA\Post(
     *     path="/api/addresses",
     *     tags={"Địa chỉ"},
     *     summary="Thêm địa chỉ giao hàng",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\RequestBody(required=true, @OA\JsonContent(
     *         required={"ten_nguoi_nhan","so_dien_thoai","dia_chi"},
     *
     *         @OA\Property(property="ten_nguoi_nhan", type="string"),
     *         @OA\Property(property="so_dien_thoai", type="string"),
     *         @OA\Property(property="dia_chi", type="string"),
     *         @OA\Property(property="vi_do", type="number", nullable=true),
     *         @OA\Property(property="kinh_do", type="number", nullable=true),
     *         @OA\Property(property="la_mac_dinh", type="boolean")
     *     )),
     *
     *     @OA\Response(response=201, description="Địa chỉ đã được lưu.")
     * )
     */
    public function store(StoreAddressRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $address = DB::transaction(function () use ($request, $validated): Address {
            $userId = (int) $request->user()->getKey();
            User::query()->lockForUpdate()->findOrFail($userId);
            $userAddresses = Address::query()
                ->where('user_id', $userId)
                ->lockForUpdate();
            $isFirstAddress = ! $userAddresses->exists();
            $makeDefault = (bool) ($validated['la_mac_dinh'] ?? false) || $isFirstAddress;

            if ($makeDefault) {
                Address::query()
                    ->where('user_id', $userId)
                    ->update(['la_mac_dinh' => false]);
            }

            return Address::query()->create([
                ...$validated,
                'user_id' => $userId,
                'la_mac_dinh' => $makeDefault,
            ]);
        });

        return response()->json(['data' => $address], 201);
    }

    /**
     * @OA\Put(
     *     path="/api/addresses/{id}",
     *     tags={"Địa chỉ"},
     *     summary="Cập nhật địa chỉ thuộc tài khoản",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
     *
     *     @OA\RequestBody(required=true, @OA\JsonContent(
     *         required={"ten_nguoi_nhan","so_dien_thoai","dia_chi"},
     *
     *         @OA\Property(property="ten_nguoi_nhan", type="string"),
     *         @OA\Property(property="so_dien_thoai", type="string"),
     *         @OA\Property(property="dia_chi", type="string"),
     *         @OA\Property(property="vi_do", type="number", nullable=true),
     *         @OA\Property(property="kinh_do", type="number", nullable=true)
     *     )),
     *
     *     @OA\Response(response=200, description="Địa chỉ đã cập nhật."),
     *     @OA\Response(response=404, description="Không tìm thấy địa chỉ thuộc tài khoản.")
     * )
     */
    public function update(UpdateAddressRequest $request, int $id): JsonResponse
    {
        $address = Address::query()
            ->where('user_id', $request->user()->getKey())
            ->findOrFail($id);
        $address->update($request->validated());

        return response()->json(['data' => $address->refresh()]);
    }

    /**
     * @OA\Delete(
     *     path="/api/addresses/{id}",
     *     tags={"Địa chỉ"},
     *     summary="Xóa địa chỉ thuộc tài khoản",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
     *
     *     @OA\Response(response=204, description="Địa chỉ đã xóa."),
     *     @OA\Response(response=404, description="Không tìm thấy địa chỉ thuộc tài khoản.")
     * )
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        DB::transaction(function () use ($request, $id): void {
            $address = Address::query()
                ->where('user_id', $request->user()->getKey())
                ->lockForUpdate()
                ->findOrFail($id);
            if ($address->subscriptions()->exists()) {
                throw ValidationException::withMessages([
                    'address' => ['Không thể xóa địa chỉ đang được dùng cho gói định kỳ.'],
                ]);
            }
            $wasDefault = $address->la_mac_dinh;
            $address->delete();

            if ($wasDefault) {
                $nextAddress = Address::query()
                    ->where('user_id', $request->user()->getKey())
                    ->latest('id')
                    ->first();
                $nextAddress?->update(['la_mac_dinh' => true]);
            }
        });

        return response()->json(null, 204);
    }

    /**
     * @OA\Patch(
     *     path="/api/addresses/{id}/default",
     *     tags={"Địa chỉ"},
     *     summary="Đặt địa chỉ mặc định",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
     *
     *     @OA\Response(response=200, description="Địa chỉ mặc định đã được cập nhật."),
     *     @OA\Response(response=404, description="Không tìm thấy địa chỉ thuộc tài khoản.")
     * )
     */
    public function setDefault(Request $request, int $id): JsonResponse
    {
        $address = DB::transaction(function () use ($request, $id): Address {
            Address::query()
                ->where('user_id', $request->user()->getKey())
                ->lockForUpdate()
                ->get();
            $address = Address::query()
                ->where('user_id', $request->user()->getKey())
                ->findOrFail($id);

            Address::query()
                ->where('user_id', $request->user()->getKey())
                ->update(['la_mac_dinh' => false]);
            $address->update(['la_mac_dinh' => true]);

            return $address->refresh();
        });

        return response()->json(['data' => $address]);
    }
}
