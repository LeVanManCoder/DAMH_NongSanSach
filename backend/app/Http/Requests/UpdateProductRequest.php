<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $id = $this->route('id');

        return [
            'ten_san_pham' => [
                'sometimes',
                'required',
                'string',
                'max:150',
                Rule::unique('products', 'ten_san_pham')->whereNull('deleted_at')->ignore($id),
            ],
            'category_id' => ['sometimes', 'required', 'integer', 'exists:categories,id'],
            'gia_ban' => ['sometimes', 'required', 'integer', 'min:0', 'max:999999999999'],
            'don_vi_tinh' => ['sometimes', 'required', 'string', 'max:20'],
            'mo_ta' => ['sometimes', 'nullable', 'string', 'max:10000'],
            'trang_thai' => ['sometimes', 'required', Rule::in(['dang_ban', 'ngung_ban'])],
            'hinh_anh_dai_dien' => ['sometimes', 'nullable', 'file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ];
    }
}
