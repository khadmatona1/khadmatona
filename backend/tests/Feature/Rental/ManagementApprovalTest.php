<?php

use App\Models\User;
use App\Modules\Property\Domain\Models\Property;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    foreach (['Admin', 'Commercial', 'SeniorCommercial'] as $role) {
        Role::findOrCreate($role);
    }
    $this->admin = User::factory()->create()->assignRole('Admin');
    $this->commercial = User::factory()->create()->assignRole('Commercial');
    $this->senior = User::factory()->create()->assignRole('SeniorCommercial');
    $this->property = Property::factory()->create(['commercial_id' => $this->commercial->id]);
});

test('commercial management requires admin approval and cannot be activated through update or spoofed fields', function () {
    $id = $this->actingAs($this->commercial)->postJson('/api/v1/rental/properties', [
        'property_id' => $this->property->id, 'commission_rate' => 20,
        'is_active' => true, 'approval_status' => 'approved',
    ])->assertCreated()->assertJsonPath('data.approval_status', 'pending')->assertJsonPath('data.is_active', false)->json('data.id');
    $this->getJson('/api/v1/rental/properties')->assertJsonCount(1, 'data');
    $this->getJson('/api/v1/rental/dashboard')->assertJsonPath('data.counts.managed_properties', 0);
    $this->putJson('/api/v1/rental/properties/'.$id, ['commission_rate' => 20, 'is_active' => true, 'approval_status' => 'approved'])
        ->assertOk()->assertJsonPath('data.is_active', false)->assertJsonPath('data.approval_status', 'pending');
    $this->patchJson('/api/v1/rental/properties/'.$id.'/approve')->assertForbidden();
    $this->patchJson('/api/v1/rental/properties/'.$id.'/reject')->assertForbidden();
    $this->postJson('/api/v1/rental/reservations', [
        'rental_property_id' => $id, 'guest_name' => 'Guest', 'channel' => 'direct',
        'check_in_date' => '2026-12-01', 'check_out_date' => '2026-12-03', 'total_amount' => 1000,
    ])->assertUnprocessable();
    $this->postJson('/api/v1/rental/cleanings', [
        'rental_property_id' => $id, 'scheduled_for' => '2026-12-03', 'charged_to' => 'owner',
    ])->assertUnprocessable();
    $this->actingAs($this->admin)->getJson('/api/v1/rental/properties')->assertJsonPath('data.0.approval_status', 'pending');
    $this->patchJson('/api/v1/rental/properties/'.$id.'/approve')->assertOk()->assertJsonPath('data.is_active', true);
    $this->patchJson('/api/v1/rental/properties/'.$id.'/reject')->assertUnprocessable();
    $this->actingAs($this->commercial)->postJson('/api/v1/rental/reservations', [
        'rental_property_id' => $id, 'guest_name' => 'Guest', 'channel' => 'direct',
        'check_in_date' => '2026-12-01', 'check_out_date' => '2026-12-03', 'total_amount' => 1000,
    ])->assertCreated();
    $this->deleteJson('/api/v1/rental/properties/'.$id)->assertOk();
    $this->postJson('/api/v1/rental/properties', ['property_id' => $this->property->id, 'commission_rate' => 20])
        ->assertCreated()->assertJsonPath('data.approval_status', 'pending')->assertJsonPath('data.is_active', false);
});

test('ordinary commercials cannot manage other properties and rejected requests remain inactive', function () {
    $foreign = Property::factory()->create(['commercial_id' => $this->senior->id]);
    $this->actingAs($this->commercial)->postJson('/api/v1/rental/properties', ['property_id' => $foreign->id, 'commission_rate' => 20])->assertForbidden();
    $id = $this->postJson('/api/v1/rental/properties', ['property_id' => $this->property->id, 'commission_rate' => 20])->assertCreated()->json('data.id');
    $this->actingAs($this->senior)->getJson('/api/v1/rental/properties/'.$id)->assertNotFound();
    $this->patchJson('/api/v1/rental/properties/'.$id.'/approve')->assertNotFound();
    $this->actingAs($this->admin)->patchJson('/api/v1/rental/properties/'.$id.'/reject')->assertOk()->assertJsonPath('data.approval_status', 'rejected');
    $this->actingAs($this->commercial)->putJson('/api/v1/rental/properties/'.$id, ['commission_rate' => 20, 'is_active' => true])
        ->assertOk()->assertJsonPath('data.is_active', false);
    $this->actingAs($this->senior)->postJson('/api/v1/rental/properties', ['property_id' => $foreign->id, 'commission_rate' => 20])
        ->assertCreated()->assertJsonPath('data.approval_status', 'approved')->assertJsonPath('data.is_active', true);
    $this->actingAs($this->commercial)->getJson('/api/v1/rental/properties')->assertJsonCount(1, 'data');
});
