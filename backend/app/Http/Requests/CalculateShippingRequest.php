<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CalculateShippingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'dia_chi_giao' => ['nullable', 'required_without:khoang_cach_km', 'string', 'max:255'],
            'khoang_cach_km' => ['nullable', 'required_without:dia_chi_giao', 'numeric', 'min:0', 'max:1000', 'decimal:0,2'],
            'vi_do' => ['nullable', 'required_with:kinh_do', 'numeric', 'between:-90,90'],
            'kinh_do' => ['nullable', 'required_with:vi_do', 'numeric', 'between:-180,180'],
        ];
    }
}
