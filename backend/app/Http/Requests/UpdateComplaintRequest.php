<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateComplaintRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'trang_thai' => ['required', 'in:chap_nhan,hoan_tien,giao_bu,tu_choi'],
            'phan_hoi' => ['required', 'string', 'max:2000'],
        ];
    }

    public function messages(): array
    {
        return [
            'trang_thai.required' => 'Vui lòng chọn kết quả xử lý khiếu nại.',
            'trang_thai.in' => 'Kết quả xử lý khiếu nại không hợp lệ.',
            'phan_hoi.required' => 'Vui lòng nhập ghi chú phản hồi cho khách hàng.',
            'phan_hoi.max' => 'Ghi chú phản hồi không được vượt quá 2.000 ký tự.',
        ];
    }
}
