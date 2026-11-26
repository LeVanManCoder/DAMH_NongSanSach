<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCategoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $id = $this->route('id');

        return [
            'ten_danh_muc' => [
                'sometimes',
                'required',
                'string',
                'max:100',
                Rule::unique('categories', 'ten_danh_muc')->ignore($id),
            ],
            'mo_ta' => ['sometimes', 'nullable', 'string', 'max:255'],
            'trang_thai' => ['sometimes', 'required', Rule::in(['dang_ban', 'ngung_ban'])],
        ];
    }
}
