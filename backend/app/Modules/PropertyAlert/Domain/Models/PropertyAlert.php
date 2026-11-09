<?php

namespace App\Modules\PropertyAlert\Domain\Models;

use App\Core\Lookup\Domain\Models\City;
use App\Core\Lookup\Domain\Models\District;
use App\Modules\PropertyAlert\Database\Factories\PropertyAlertFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * A saved search from an anonymous visitor, kept purely by its criteria and
 * a WhatsApp number - no `users` FK at all, no account concept applies.
 * City/District are Core reference data, so real BelongsTo relations are
 * fine here (same treatment as Property::city()/district()).
 *
 * @use HasFactory<PropertyAlertFactory>
 */
class PropertyAlert extends Model
{
    /** @use HasFactory<PropertyAlertFactory> */
    use HasFactory;

    protected $fillable = [
        'email',
        'phone_e164',
        'city_id',
        'district_id',
        'property_type',
        'transaction_type',
        'price_period',
        'budget_max',
        'surface_min',
        'surface_max',
        'locale',
        'fingerprint_hash',
    ];

    protected function casts(): array
    {
        return [
            'budget_max' => 'integer',
            'surface_min' => 'integer',
            'surface_max' => 'integer',
        ];
    }

    public function city(): BelongsTo
    {
        return $this->belongsTo(City::class);
    }

    public function district(): BelongsTo
    {
        return $this->belongsTo(District::class);
    }

    public function matches(): HasMany
    {
        return $this->hasMany(PropertyAlertMatch::class);
    }

    protected static function newFactory(): PropertyAlertFactory
    {
        return PropertyAlertFactory::new();
    }
}
