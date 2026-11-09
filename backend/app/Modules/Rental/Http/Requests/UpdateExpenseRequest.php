<?php

namespace App\Modules\Rental\Http\Requests;

class UpdateExpenseRequest extends StoreExpenseRequest
{
    public function rules(): array
    {
        return $this->expenseRules();
    }
}
