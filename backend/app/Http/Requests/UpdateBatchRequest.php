<?php

namespace App\Http\Requests;

use App\Models\Batch;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class UpdateBatchRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'ma_lo' => ['sometimes', 'required', 'string', 'max:30', Rule::unique('batches', 'ma_lo')->ignore($this->route('id'))],
            'product_id' => ['sometimes', 'required', 'integer', 'exists:products,id'],
            'season_id' => ['sometimes', 'nullable', 'integer', 'exists:seasons,id'],
            'ngay_thu_hoach' => ['sometimes', 'nullable', 'date'],
            'ngay_het_han' => ['sometimes', 'nullable', 'date'],
            'trang_thai' => ['sometimes', 'in:dang_canh_tac,da_thu_hoach,con_hang,het_hang,het_han'],
            'so_luong_nhap' => ['prohibited'],
            'so_luong_ton' => ['prohibited'],
            'so_luong_hao_hut' => ['prohibited'],
            'qr_code' => ['prohibited'],
            'created_by' => ['prohibited'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $batch = Batch::query()->find($this->route('id'));
            if ($batch === null) {
                return;
            }

            $data = $validator->getData();
            $harvestDate = $data['ngay_thu_hoach'] ?? $batch->ngay_thu_hoach?->toDateString();
            $expiryDate = $data['ngay_het_han'] ?? $batch->ngay_het_han?->toDateString();
            $status = $data['trang_thai'] ?? $batch->trang_thai;

            if ($status !== 'dang_canh_tac' && ($harvestDate === null || $expiryDate === null)) {
                $validator->errors()->add('ngay_thu_hoach', 'Lô đã thu hoạch hoặc có hàng cần ngày thu hoạch và ngày hết hạn.');
            }

            if (is_string($harvestDate) && is_string($expiryDate)
                && strtotime($harvestDate) !== false
                && strtotime($expiryDate) !== false
                && strtotime($expiryDate) < strtotime($harvestDate)) {
                $validator->errors()->add('ngay_het_han', 'Ngày hết hạn phải bằng hoặc sau ngày thu hoạch.');
            }
        });
    }
}
