<?php

namespace App\Modules\Rental\Http\Resources;

use App\Modules\Rental\Domain\Models\Reservation;
use App\Modules\Rental\Domain\Support\Money;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Admin view - guest contact details included. Owners get
 * OwnerReservationResource instead.
 *
 * @mixin Reservation
 */
class ReservationResource extends JsonResource
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
            'rental_property_id' => $this->rental_property_id,
            'property_id' => $this->property_id,
            'property_title' => $this->property_title ?? null,
            'guest_name' => $this->guest_name,
            'guest_phone' => $this->guest_phone,
            'guest_email' => $this->guest_email,
            'guests_count' => $this->guests_count,
            'channel' => $this->channel->value,
            'check_in_date' => $this->check_in_date->toDateString(),
            'check_out_date' => $this->check_out_date->toDateString(),
            'nights' => $this->nights(),
            'total_amount' => Money::toMad($this->total_amount),
            'platform_fee' => Money::toMad($this->platform_fee),
            'net_revenue' => Money::toMad($net),
            'commission_rate' => Money::basisPointsToPercent($this->commission_rate_bp),
            'commission' => Money::toMad($commission),
            'status' => $this->status->value,
            'checked_in_at' => $this->checked_in_at,
            'checked_out_at' => $this->checked_out_at,
            'check_in_notes' => $this->check_in_notes,
            'check_out_notes' => $this->check_out_notes,
            'notes' => $this->notes,
            'created_at' => $this->created_at,
        ];
    }
}
