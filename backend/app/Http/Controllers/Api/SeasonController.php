<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreSeasonRequest;
use App\Models\Season;
use Illuminate\Http\JsonResponse;
use OpenApi\Annotations as OA;

class SeasonController extends Controller
{
    /**
     * @OA\Get(
     *     path="/api/seasons",
     *     tags={"Mùa vụ"},
     *     summary="Danh sách mùa vụ",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Response(response=200, description="Danh sách mùa vụ cho Farm Staff."),
     *     @OA\Response(response=403, description="Chỉ Farm Staff được xem mùa vụ.")
     * )
     */
    public function index(): JsonResponse
    {
        $seasons = Season::query()->latest('created_at')->get();

        return response()->json(['data' => $seasons]);
    }

    /**
     * @OA\Post(
     *     path="/api/seasons",
     *     tags={"Mùa vụ"},
     *     summary="Tạo mùa vụ",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\RequestBody(required=true, @OA\JsonContent(
     *         required={"ten_mua_vu","ngay_bat_dau"},
     *
     *         @OA\Property(property="ten_mua_vu", type="string", maxLength=120),
     *         @OA\Property(property="khu_vuc_canh_tac", type="string", nullable=true, maxLength=100),
     *         @OA\Property(property="ngay_bat_dau", type="string", format="date"),
     *         @OA\Property(property="ngay_ket_thuc_du_kien", type="string", format="date", nullable=true)
     *     )),
     *
     *     @OA\Response(response=201, description="Mùa vụ đã được tạo."),
     *     @OA\Response(response=403, description="Chỉ Farm Staff được tạo mùa vụ."),
     *     @OA\Response(response=422, description="Dữ liệu mùa vụ không hợp lệ.")
     * )
     */
    public function store(StoreSeasonRequest $request): JsonResponse
    {
        $season = Season::query()->create([
            ...$request->validated(),
            'created_by' => $request->user()->getKey(),
        ]);

        return response()->json(['data' => $season], 201);
    }
}
