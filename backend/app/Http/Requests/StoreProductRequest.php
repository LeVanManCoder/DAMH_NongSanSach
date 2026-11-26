<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'ten_san_pham' => [
                'required',
                'string',
                'max:150',
                Rule::unique('products', 'ten_san_pham')->whereNull('deleted_at'),
            ],
            'category_id' => ['required', 'integer', 'exists:categories,id'],
            'gia_ban' => ['required', 'integer', 'min:0', 'max:999999999999'],
            'don_vi_tinh' => ['required', 'string', 'max:20'],
            'mo_ta' => ['nullable', 'string', 'max:10000'],
            'trang_thai' => ['sometimes', 'required', Rule::in(['dang_ban', 'ngung_ban'])],
            'hinh_anh_dai_dien' => ['sometimes', 'nullable', 'file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ];
    }
}
