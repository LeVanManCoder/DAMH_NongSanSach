<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreReviewRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'order_id' => ['required', 'integer', 'exists:orders,id'],
            'so_sao' => ['required', 'integer', 'between:1,5'],
            'noi_dung' => ['nullable', 'string', 'max:500'],
        ];
    }

    public function messages(): array
    {
        return [
            'order_id.required' => 'Vui lòng chọn đơn hàng đã giao để đánh giá.',
            'so_sao.required' => 'Vui lòng chọn số sao đánh giá.',
            'so_sao.between' => 'Số sao đánh giá phải từ 1 đến 5.',
            'noi_dung.max' => 'Bình luận không được vượt quá 500 ký tự.',
        ];
    }
}
