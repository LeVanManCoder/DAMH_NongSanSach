<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreSeasonRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'ten_mua_vu' => ['required', 'string', 'max:120'],
            'khu_vuc_canh_tac' => ['nullable', 'string', 'max:100'],
            'ngay_bat_dau' => ['required', 'date'],
            'ngay_ket_thuc_du_kien' => ['nullable', 'date', 'after_or_equal:ngay_bat_dau'],
        ];
    }
}
