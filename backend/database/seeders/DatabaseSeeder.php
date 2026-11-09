<?php

namespace Database\Seeders;

use App\Core\Lookup\Database\Seeders\CitySeeder;
use App\Core\Permissions\Database\Seeders\PermissionSeeder;
use App\Models\User;
use App\Modules\Property\Database\Seeders\PropertySeeder;
use App\Modules\Settings\Database\Seeders\SettingsSeeder;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    // Deliberately not using WithoutModelEvents: spatie/laravel-permission
    // relies on model "created"/"deleted" events to invalidate its
    // permission cache, and this seeder is small enough that the
    // bulk-insert performance trait isn't worth fighting the package for.

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call(PermissionSeeder::class);
        $this->call(CitySeeder::class);
        $this->call(SettingsSeeder::class);

        // Local/staging convenience only: `db:seed --force` runs on every
        // container boot (see docker/entrypoint.sh), so auto-creating this
        // well-known admin@khadmatona.test / "password" account must never
        // happen in production - it would otherwise recreate a publicly
        // guessable credential on every deploy of a still-empty database.
        // Production admins are created manually (e.g. via `artisan tinker`
        // or a dedicated one-time command), never seeded.
        if (! app()->environment('production') && ! User::where('email', 'admin@khadmatona.test')->exists()) {
            $admin = User::factory()->create([
                'name' => 'KHADMATONA Admin',
                'email' => 'admin@khadmatona.test',
            ]);

            $admin->assignRole('Admin');
        }

        $this->call(PropertySeeder::class);
    }
}
