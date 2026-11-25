<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StoreBatchRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'ma_lo' => ['required', 'string', 'max:30', 'unique:batches,ma_lo'],
            'product_id' => ['required', 'integer', 'exists:products,id'],
            'season_id' => ['nullable', 'integer', 'exists:seasons,id'],
            'ngay_thu_hoach' => ['nullable', 'date'],
            'ngay_het_han' => ['nullable', 'date', 'after_or_equal:ngay_thu_hoach'],
            'so_luong_nhap' => ['required', 'numeric', 'min:0', 'decimal:0,2'],
            'so_luong_ton' => ['sometimes', 'numeric', 'min:0', 'decimal:0,2'],
            'so_luong_hao_hut' => ['sometimes', 'numeric', 'min:0', 'decimal:0,2'],
            'trang_thai' => ['sometimes', 'in:dang_canh_tac,da_thu_hoach,con_hang,het_hang,het_han'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $data = $validator->getData();
            $status = $data['trang_thai'] ?? 'dang_canh_tac';
            $harvestDate = $data['ngay_thu_hoach'] ?? null;
            $expiryDate = $data['ngay_het_han'] ?? null;

            if ($status !== 'dang_canh_tac' && ($harvestDate === null || $expiryDate === null)) {
                $validator->errors()->add('ngay_thu_hoach', 'Lô đã thu hoạch hoặc có hàng cần ngày thu hoạch và ngày hết hạn.');
            }

            $received = $data['so_luong_nhap'] ?? null;
            $onHand = $data['so_luong_ton'] ?? ($status === 'dang_canh_tac' ? 0 : $received);
            $waste = $data['so_luong_hao_hut'] ?? 0;

            if (is_numeric($received) && is_numeric($onHand) && is_numeric($waste)
                && (float) $onHand + (float) $waste > (float) $received) {
                $validator->errors()->add('so_luong_ton', 'Tồn kho và hao hụt không được vượt quá số lượng nhập.');
            }
        });
    }
}
