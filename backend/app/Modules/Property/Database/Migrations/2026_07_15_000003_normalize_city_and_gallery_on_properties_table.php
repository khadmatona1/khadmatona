<?php

use App\Core\Lookup\Domain\Models\City;
use App\Modules\Property\Domain\Models\Property;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('properties', function (Blueprint $table) {
            $table->foreignId('city_id')->nullable()->after('type')->constrained();
            $table->foreignId('district_id')->nullable()->after('city_id')->constrained()->nullOnDelete();
        });

        // Backfill: match each property's free-text `city` string against
        // the French translation of a Core\Lookup city (CitySeeder's `fr`
        // values are, by construction, identical to the strings
        // PropertyFactory has always generated) - written against
        // DB::table(), not Eloquent, per migration convention.
        $cityIdsByName = DB::table('cities')
            ->join('translations', function ($join) {
                $join->on('translations.translatable_id', '=', 'cities.id')
                    ->where('translations.translatable_type', City::class)
                    ->where('translations.locale', 'fr')
                    ->where('translations.field', 'name');
            })
            ->pluck('cities.id', 'translations.value');

        foreach ($cityIdsByName as $name => $cityId) {
            DB::table('properties')->where('city', $name)->update(['city_id' => $cityId]);
        }

        // Any property whose `city` string didn't match a seeded city
        // (shouldn't happen with the current fixed 8-city demo data, but
        // migrations must not silently corrupt real data) falls back to
        // the first city rather than leaving city_id null before the
        // column is made required below.
        $fallbackCityId = DB::table('cities')->orderBy('id')->value('id');
        if ($fallbackCityId !== null) {
            DB::table('properties')->whereNull('city_id')->update(['city_id' => $fallbackCityId]);
        }

        // Move each property's single legacy `image` URL into a real media
        // record before the column is dropped, so no existing photo is
        // lost. Requires Property to already implement HasMedia (it does,
        // as of this same change) - wrapped per-row so one failed fetch
        // doesn't abort the whole migration.
        Property::query()->whereNotNull('image')->where('image', '!=', '')->each(function (Property $property) {
            try {
                $property->addMediaFromUrl($property->image)->toMediaCollection('gallery');
            } catch (Throwable $e) {
                Log::warning('Could not migrate legacy property image to media library', [
                    'property_id' => $property->id,
                    'image' => $property->image,
                    'error' => $e->getMessage(),
                ]);
            }
        });

        Schema::table('properties', function (Blueprint $table) {
            $table->unsignedBigInteger('city_id')->nullable(false)->change();
            $table->dropColumn(['city', 'image']);
        });
    }

    public function down(): void
    {
        Schema::table('properties', function (Blueprint $table) {
            $table->string('city')->nullable()->after('type');
            $table->string('image')->nullable()->after('description');
        });

        DB::table('properties as p')
            ->join('cities', 'cities.id', '=', 'p.city_id')
            ->join('translations', function ($join) {
                $join->on('translations.translatable_id', '=', 'cities.id')
                    ->where('translations.translatable_type', City::class)
                    ->where('translations.locale', 'fr')
                    ->where('translations.field', 'name');
            })
            ->update(['p.city' => DB::raw('translations.value')]);

        Schema::table('properties', function (Blueprint $table) {
            $table->dropConstrainedForeignId('district_id');
            $table->dropConstrainedForeignId('city_id');
        });
    }
};
