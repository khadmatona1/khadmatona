<?php

namespace App\Modules\Rental\Http\Resources;

use App\Modules\Rental\Domain\Models\Reservation;
use App\Modules\Rental\Domain\Support\Money;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Owner Portal view of a stay: dates and money only. Guests' names and
 * contact details are never exposed to property owners.
 *
 * @mixin Reservation
 */
class OwnerReservationResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $net = $this->netRevenue();
        $commission = Money::commission($net, $this->commission_rate_bp);

        return [
            'id' => $this->id,
            'property_id' => $this->property_id,
            'property_title' => $this->property_title ?? null,
            'channel' => $this->channel->value,
            'guests_count' => $this->guests_count,
            'check_in_date' => $this->check_in_date->toDateString(),
            'check_out_date' => $this->check_out_date->toDateString(),
            'nights' => $this->nights(),
            'status' => $this->status->value,
            'net_revenue' => Money::toMad($net),
            'commission' => Money::toMad($commission),
        ];
    }
}
