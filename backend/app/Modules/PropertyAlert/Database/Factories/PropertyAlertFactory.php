<?php

namespace App\Modules\PropertyAlert\Database\Factories;

use App\Modules\PropertyAlert\Domain\Models\PropertyAlert;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<PropertyAlert>
 */
class PropertyAlertFactory extends Factory
{
    protected $model = PropertyAlert::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $phone = '+2126'.fake()->numerify('########');

        return [
            'email' => fake()->boolean(50) ? fake()->safeEmail() : null,
            'phone_e164' => $phone,
            'city_id' => null,
            'district_id' => null,
            'property_type' => null,
            'budget_max' => null,
            'surface_min' => null,
            'surface_max' => null,
            'locale' => 'fr',
            'fingerprint_hash' => hash('sha256', $phone.fake()->unique()->uuid()),
        ];
    }
}
