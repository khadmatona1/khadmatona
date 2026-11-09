<?php

namespace App\Modules\Rental\Domain\Models;

use App\Core\ActivityLog\Concerns\LogsAllChanges;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StayContract extends Model
{
    use LogsAllChanges;

    protected $table = 'rental_stay_contracts';

    protected $fillable = [
        'booking_request_id', 'reservation_id', 'access_token', 'access_token_hash',
        'nationality', 'identity_number', 'birth_date', 'address', 'estimated_arrival_time',
        'identity_document_path', 'signature_path', 'contract_snapshot',
        'terms_accepted_at', 'signed_at', 'expires_at',
    ];

    protected $hidden = ['access_token', 'access_token_hash', 'identity_document_path', 'signature_path'];

    protected function casts(): array
    {
        return [
            'access_token' => 'encrypted',
            'birth_date' => 'date:Y-m-d',
            'contract_snapshot' => 'array',
            'terms_accepted_at' => 'datetime',
            'signed_at' => 'datetime',
            'expires_at' => 'datetime',
        ];
    }

    public function bookingRequest(): BelongsTo
    {
        return $this->belongsTo(BookingRequest::class);
    }

    public function reservation(): BelongsTo
    {
        return $this->belongsTo(Reservation::class);
    }
}
