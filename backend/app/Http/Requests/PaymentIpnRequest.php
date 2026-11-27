<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class PaymentIpnRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'ma_giao_dich' => ['required', 'string', 'max:100'],
            'so_tien' => ['required', 'integer', 'min:1'],
            'trang_thai' => ['required', 'in:thanh_cong,that_bai'],
        ];
    }
}
