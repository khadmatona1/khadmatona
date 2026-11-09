<?php

namespace App\Core\Lookup\Database\Seeders;

use App\Core\Lookup\Domain\Models\City;
use Illuminate\Database\Seeder;

/**
 * The 8 real Moroccan cities already used as demo data across the app
 * (App\Modules\Property\Database\Factories\PropertyFactory::CITIES) -
 * kept in sync with that list deliberately, since PropertyFactory attaches
 * a real city_id from these rows.
 */
class CitySeeder extends Seeder
{
    /**
     * @var array<string, array{fr: string, en: string, ar: string}>
     */
    private const CITIES = [
        'Marrakech' => ['fr' => 'Marrakech', 'en' => 'Marrakech', 'ar' => 'مراكش'],
        'Casablanca' => ['fr' => 'Casablanca', 'en' => 'Casablanca', 'ar' => 'الدار البيضاء'],
        'Rabat' => ['fr' => 'Rabat', 'en' => 'Rabat', 'ar' => 'الرباط'],
        'Tanger' => ['fr' => 'Tanger', 'en' => 'Tangier', 'ar' => 'طنجة'],
        'Agadir' => ['fr' => 'Agadir', 'en' => 'Agadir', 'ar' => 'أكادير'],
        'Fès' => ['fr' => 'Fès', 'en' => 'Fez', 'ar' => 'فاس'],
        'Essaouira' => ['fr' => 'Essaouira', 'en' => 'Essaouira', 'ar' => 'الصويرة'],
        'Meknès' => ['fr' => 'Meknès', 'en' => 'Meknes', 'ar' => 'مكناس'],
    ];

    public function run(): void
    {
        if (City::query()->exists()) {
            return;
        }

        foreach (self::CITIES as $names) {
            $city = City::create();

            foreach ($names as $locale => $name) {
                $city->setTranslation('name', $locale, $name);
            }
        }
    }
}
