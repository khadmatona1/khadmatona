<?php

namespace App\Modules\Rental\Http\Requests;

/**
 * A reservation stays on its property - to move a stay, cancel and rebook.
 */
class UpdateReservationRequest extends StoreReservationRequest
{
    public function rules(): array
    {
        return $this->stayRules();
    }
}
