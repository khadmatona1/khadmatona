<?php

namespace App\Modules\Property\Database\Seeders;

use App\Modules\Property\Domain\Models\Property;
use Illuminate\Database\Seeder;

class PropertySeeder extends Seeder
{
    public function run(): void
    {
        if (Property::count() > 0) {
            return;
        }

        // Real listings are a mix of single-photo and full-gallery
        // properties - seed roughly a third with multiple photos so
        // the gallery UI has genuine demo data, not just cover images.
        Property::factory()->count(13)->withGalleryPhoto()->create();
        Property::factory()->count(7)->withGalleryPhotos()->create();
    }
}
