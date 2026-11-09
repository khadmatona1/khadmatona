<?php

use App\Models\User;
use App\Modules\Property\Domain\Models\Property;
use Illuminate\Support\Carbon;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    Role::findOrCreate('Admin');
    $this->admin = User::factory()->create();
    $this->admin->assignRole('Admin');
});

test('a guest cannot view dashboard stats', function () {
    $this->getJson('/api/v1/dashboard/stats')->assertStatus(401);
});

test('an authenticated user without the Admin role cannot view dashboard stats', function () {
    $nonAdmin = User::factory()->create();

    $this->actingAs($nonAdmin)->getJson('/api/v1/dashboard/stats')->assertStatus(403);
});

test('an admin sees real, database-computed dashboard stats', function () {
    Property::factory()->create(['status' => 'disponible', 'price' => 100_000]);
    Property::factory()->create(['status' => 'disponible', 'price' => 200_000]);
    Property::factory()->create(['status' => 'vendu', 'price' => 300_000]);
    Property::factory()->create(['status' => 'loue', 'price' => 50_000]);

    $response = $this->actingAs($this->admin)->getJson('/api/v1/dashboard/stats');

    $response->assertOk()
        ->assertJsonPath('data.total_properties', 4)
        ->assertJsonPath('data.available_properties', 2)
        ->assertJsonPath('data.sold_properties', 1)
        ->assertJsonPath('data.rented_properties', 1)
        ->assertJsonPath('data.new_properties_this_month', 4);

    // 300_000 + 50_000 cents = 3 500 MAD, since both are freshly
    // created/updated this month. Whole-number floats collapse to a bare
    // integer over JSON (PHP's json_encode default), so this decodes as
    // an int, not 3500.0 - PropertyResource's `price` field has the same
    // characteristic.
    $response->assertJsonPath('data.monthly_revenue', 3500);
});

test('dashboard stats only count this month\'s new properties in the current month bucket', function () {
    Property::factory()->create(['created_at' => Carbon::now()->subMonths(2)]);
    Property::factory()->create(['created_at' => Carbon::now()]);

    $response = $this->actingAs($this->admin)->getJson('/api/v1/dashboard/stats');

    $response->assertOk()->assertJsonPath('data.new_properties_this_month', 1);
});

test('dashboard stats include a 6-month trend ending on the current month', function () {
    Property::factory()->create();

    $response = $this->actingAs($this->admin)->getJson('/api/v1/dashboard/stats');

    $response->assertOk()
        ->assertJsonCount(6, 'data.monthly_trend')
        ->assertJsonPath('data.monthly_trend.5.month', Carbon::now()->format('Y-m'));
});
