<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCategoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'ten_danh_muc' => ['required', 'string', 'max:100', Rule::unique('categories', 'ten_danh_muc')],
            'mo_ta' => ['nullable', 'string', 'max:255'],
            'trang_thai' => ['sometimes', 'required', Rule::in(['dang_ban', 'ngung_ban'])],
        ];
    }
}
