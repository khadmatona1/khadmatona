<?php

namespace App\Core\Lookup\Database\Factories;

use App\Core\Lookup\Domain\Models\City;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<City>
 */
class CityFactory extends Factory
{
    protected $model = City::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [];
    }

    /**
     * A plain factory-created city has no translations (the seeded 8 real
     * cities get theirs from CitySeeder) - tests that just need *a* city to
     * attach to a property can give it an English name via this state.
     */
    public function withName(string $name): static
    {
        return $this->afterCreating(function (City $city) use ($name) {
            $city->setTranslation('name', 'en', $name);
            $city->setTranslation('name', 'fr', $name);
            $city->setTranslation('name', 'ar', $name);
        });
    }
}
