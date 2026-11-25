<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'ten_nguoi_nhan' => ['required', 'string', 'max:100'],
            'sdt_nguoi_nhan' => ['required', 'string', 'max:15'],
            'dia_chi_giao' => ['required', 'string', 'max:255'],
            'phi_van_chuyen' => ['prohibited'],
            'khoang_cach_km' => ['prohibited'],
            'ngay_giao_du_kien' => ['sometimes', 'nullable', 'date', 'after_or_equal:today'],
            'ghi_chu' => ['sometimes', 'nullable', 'string', 'max:255'],
            'user_id' => ['prohibited'],
            'trang_thai' => ['prohibited'],
            'tong_tien_hang' => ['prohibited'],
            'tong_thanh_toan' => ['prohibited'],
        ];
    }
}
