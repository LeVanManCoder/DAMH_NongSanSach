<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreFarmingLogRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'hanh_dong' => ['required', 'in:gieo_hat,bon_phan,tuoi_nuoc,phun_thuoc,cham_soc,thu_hoach,khac'],
            'ghi_chu' => ['required', 'string', 'max:5000'],
            'thoi_gian' => ['required', 'date'],
            'hinh_anh_minh_chung' => [
                'nullable',
                'file',
                'image',
                'mimes:jpg,jpeg,png,webp',
                'extensions:jpg,jpeg,png,webp',
                'max:5120',
            ],
        ];
    }
}
