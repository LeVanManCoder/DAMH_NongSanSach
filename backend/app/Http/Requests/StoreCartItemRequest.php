<?php

namespace App\Http\Requests;

use App\Models\Product;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StoreCartItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'product_id' => ['required', 'integer', 'exists:products,id'],
            'so_luong' => ['required', 'numeric', 'gt:0', 'decimal:0,2'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $productId = $validator->getData()['product_id'] ?? null;

            if (is_numeric($productId) && ! Product::query()->whereKey($productId)->where('is_active', true)->exists()) {
                $validator->errors()->add('product_id', 'Sản phẩm không tồn tại hoặc hiện không được mở bán.');
            }
        });
    }
}
