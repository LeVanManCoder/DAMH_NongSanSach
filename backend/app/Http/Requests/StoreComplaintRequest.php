<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreComplaintRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'ly_do' => ['required', 'in:dap_nat,hu_hong,thieu_hang,sai_san_pham,khac'],
            'mo_ta' => ['nullable', 'string', 'max:2000'],
            'anh_minh_chung' => [
                'required',
                'file',
                'image',
                'mimes:jpg,jpeg,png',
                'extensions:jpg,jpeg,png',
                'max:5120',
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'ly_do.required' => 'Vui lòng chọn lý do khiếu nại.',
            'ly_do.in' => 'Lý do khiếu nại không hợp lệ.',
            'mo_ta.max' => 'Mô tả không được vượt quá 2.000 ký tự.',
            'anh_minh_chung.required' => 'Vui lòng chọn ảnh minh chứng.',
            'anh_minh_chung.image' => 'Tệp minh chứng phải là ảnh hợp lệ.',
            'anh_minh_chung.mimes' => 'Ảnh minh chứng chỉ chấp nhận JPG, JPEG hoặc PNG.',
            'anh_minh_chung.extensions' => 'Đuôi ảnh minh chứng chỉ chấp nhận .jpg, .jpeg hoặc .png.',
            'anh_minh_chung.max' => 'Ảnh minh chứng không được vượt quá 5 MB.',
        ];
    }
}
