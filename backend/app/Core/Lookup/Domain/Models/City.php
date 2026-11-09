<?php

namespace App\Core\Lookup\Domain\Models;

use App\Core\Localization\Concerns\HasTranslations;
use App\Core\Lookup\Database\Factories\CityFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Cross-cutting reference data (Core, not a business module) - a city's
 * translated `name` lives in the shared `translations` table via
 * HasTranslations, the same mechanism every other translatable field in
 * the app already uses.
 *
 * @use HasFactory<CityFactory>
 */
class City extends Model
{
    /** @use HasFactory<CityFactory> */
    use HasFactory, HasTranslations;

    public function districts(): HasMany
    {
        return $this->hasMany(District::class);
    }

    protected static function newFactory(): CityFactory
    {
        return CityFactory::new();
    }
}
