<?php

namespace App\Modules\Rental\Http\Resources;

use App\Modules\Rental\Domain\Models\Expense;
use App\Modules\Rental\Domain\Support\Money;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Expense
 */
class ExpenseResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'rental_property_id' => $this->rental_property_id,
            'property_id' => $this->property_id,
            'property_title' => $this->property_title ?? null,
            'category' => $this->category->value,
            'label' => $this->label,
            'amount' => Money::toMad($this->amount),
            'incurred_on' => $this->incurred_on->toDateString(),
            'charged_to' => $this->charged_to->value,
            'notes' => $this->notes,
        ];
    }
}
