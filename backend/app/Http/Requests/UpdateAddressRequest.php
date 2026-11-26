<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateAddressRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'ten_nguoi_nhan' => ['required', 'string', 'max:100'],
            'so_dien_thoai' => ['required', 'string', 'max:15'],
            'dia_chi' => ['required', 'string', 'max:255'],
            'vi_do' => ['nullable', 'required_with:kinh_do', 'numeric', 'between:-90,90'],
            'kinh_do' => ['nullable', 'required_with:vi_do', 'numeric', 'between:-180,180'],
        ];
    }
}
