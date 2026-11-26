<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Http\JsonResponse;
use OpenApi\Annotations as OA;

class CategoryController extends Controller
{
    /**
     * @OA\Get(
     *     path="/api/categories",
     *     tags={"Danh mục"},
     *     summary="Danh sách danh mục sản phẩm đang hoạt động",
     *
     *     @OA\Response(response=200, description="Danh sách danh mục.")
     * )
     */
    public function index(): JsonResponse
    {
        $categories = Category::query()
            ->where('is_active', true)
            ->orderBy('ten_danh_muc')
            ->get(['id', 'parent_id', 'ten_danh_muc', 'slug']);

        return response()->json(['data' => $categories]);
    }
}
