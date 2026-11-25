<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateCartItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'so_luong' => ['required', 'numeric', 'gt:0', 'decimal:0,2'],
            'product_id' => ['prohibited'],
            'user_id' => ['prohibited'],
        ];
    }
}
