<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreSubscriptionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'plan_id' => ['required', 'integer', 'exists:subscription_plans,id'],
            'address_id' => ['required', 'integer', 'exists:addresses,id'],
            'ngay_bat_dau' => ['required', 'date', 'after_or_equal:today'],
            'chu_ky_giao_ngay' => ['required', 'integer', 'in:7,14'],
            'thu_trong_tuan' => ['sometimes', 'array', 'min:1', 'max:7'],
            'thu_trong_tuan.*' => ['required', 'integer', 'between:1,7', 'distinct'],
            'items' => ['required', 'array', 'min:1', 'max:20'],
            'items.*.product_id' => ['required', 'integer', 'distinct', 'exists:products,id'],
            'items.*.so_luong_moi_lan' => ['required', 'numeric', 'gt:0', 'max:1000'],
        ];
    }

    public function messages(): array
    {
        return [
            'plan_id.required' => 'Vui lòng chọn gói định kỳ.',
            'address_id.required' => 'Vui lòng chọn địa chỉ giao hàng.',
            'ngay_bat_dau.after_or_equal' => 'Ngày bắt đầu phải từ hôm nay trở đi.',
            'chu_ky_giao_ngay.in' => 'Chu kỳ giao hàng chỉ có thể là 7 hoặc 14 ngày.',
            'items.required' => 'Vui lòng chọn ít nhất một sản phẩm.',
            'items.*.so_luong_moi_lan.gt' => 'Số lượng mỗi lần giao phải lớn hơn 0.',
        ];
    }
}
