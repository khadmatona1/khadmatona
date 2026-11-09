<?php

namespace App\Modules\Rental\Http\Requests;

/**
 * Same terms as on creation - the managed catalog property itself can't change.
 */
class UpdateManagedPropertyRequest extends StoreManagedPropertyRequest
{
    public function rules(): array
    {
        return $this->termsRules();
    }
}
