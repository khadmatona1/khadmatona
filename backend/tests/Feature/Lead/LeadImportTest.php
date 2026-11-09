<?php

use App\Models\User;
use App\Modules\Property\Domain\Models\Property;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    Role::findOrCreate('Admin');
    Role::findOrCreate('Commercial');
    $this->admin = User::factory()->create()->assignRole('Admin');
    $this->row = ['type' => 'contact', 'name' => 'Imported contact', 'email' => 'import@example.com', 'phone' => '0612345678', 'address' => 'Marrakech', 'status' => 'new'];
});

test('only authorized roles may import leads', function () {
    foreach (['leads', 'commercial-leads'] as $path) {
        $this->postJson("/api/v1/$path/import", ['rows' => [$this->row]])->assertUnauthorized();
        $this->actingAs(User::factory()->create())->postJson("/api/v1/$path/import", ['rows' => [$this->row]])->assertForbidden();
        auth()->forgetGuards();
    }
});

test('a commercial can import their own leads', function () {
    $commercial = User::factory()->create()->assignRole('Commercial');

    $this->actingAs($commercial)->postJson('/api/v1/leads/import', ['rows' => [$this->row]])
        ->assertCreated()->assertJsonPath('data.imported', 1);

    $this->assertDatabaseHas('leads', ['email' => 'import@example.com', 'commercial_id' => $commercial->id]);
});

test('an admin imports multiple lead types without changing existing leads', function () {
    $rows = [$this->row, [...$this->row, 'type' => 'sell_request', 'address' => 'Marrakech', 'status' => 'closed']];
    $this->actingAs($this->admin)->postJson('/api/v1/leads/import', ['rows' => $rows])
        ->assertCreated()->assertJsonPath('data.imported', 2);
    $this->assertDatabaseCount('leads', 2);
    $this->assertDatabaseHas('leads', ['type' => 'sell_request', 'status' => 'closed', 'address' => 'Marrakech']);
});

test('the import restores the zero Excel removes from Moroccan numeric phones', function () {
    $this->actingAs($this->admin)->postJson('/api/v1/leads/import', ['rows' => [
        [...$this->row, 'phone' => '612345678'],
    ]])->assertCreated();

    $this->assertDatabaseHas('leads', ['phone' => '0612345678']);
});

test('the import accepts international phone numbers', function () {
    $this->actingAs($this->admin)->postJson('/api/v1/leads/import', ['rows' => [
        [...$this->row, 'phone' => '+217 5 00 00 00'],
        [...$this->row, 'email' => 'us@example.com', 'phone' => '+1 (411) 685-7594'],
    ]])->assertCreated()->assertJsonPath('data.imported', 2);
});

test('import preserves legacy phone text and malformed numbers without rejecting the batch', function () {
    $phones = ["Watsap = 0676335432\n24/24.... هاتف عادي... ؟0679426907", 'مرحبا', '066132i906', 'o'];
    $rows = array_map(fn ($phone) => [...$this->row, 'phone' => $phone], $phones);
    $this->actingAs($this->admin)->postJson('/api/v1/leads/import', ['rows' => $rows])
        ->assertCreated()->assertJsonPath('data.imported', 4);
    foreach ($phones as $phone) {
        $this->assertDatabaseHas('leads', ['phone' => $phone]);
    }
});

test('invalid rows reject the entire batch and identify the row', function () {
    $this->actingAs($this->admin)->postJson('/api/v1/leads/import', ['rows' => [$this->row, [...$this->row, 'email' => 'invalid']]])
        ->assertUnprocessable()->assertJsonValidationErrors('rows.1.email');
    $this->assertDatabaseCount('leads', 0);
});

test('only phone and address are required for a contact import', function () {
    $this->actingAs($this->admin)->postJson('/api/v1/leads/import', ['rows' => [
        ['phone' => '0612345678', 'address' => 'Marrakech'],
        ['phone' => '0612345679', 'address' => 'Rabat', 'email' => null, 'name' => null],
    ]])->assertCreated()->assertJsonPath('data.imported', 2);

    $this->assertDatabaseHas('leads', ['phone' => '0612345678', 'email' => '', 'name' => '', 'type' => 'contact', 'status' => 'new']);
});

test('import preserves the property type independently from the lead type', function () {
    $this->actingAs($this->admin)->postJson('/api/v1/leads/import', ['rows' => [
        [...$this->row, 'type' => 'sell_request', 'property_type' => 'apartment'],
    ]])->assertCreated();
    $this->assertDatabaseHas('leads', ['type' => 'sell_request', 'property_type' => 'apartment']);
    $this->postJson('/api/v1/leads/import', ['rows' => [[...$this->row, 'property_type' => 'unknown']]])
        ->assertUnprocessable()->assertJsonValidationErrors('rows.0.property_type');
});

test('imports reject missing phone or address without creating any leads', function () {
    $this->actingAs($this->admin)->postJson('/api/v1/leads/import', ['rows' => [
        ['address' => 'Marrakech'],
        ['phone' => '0612345678'],
    ]])->assertUnprocessable()->assertJsonValidationErrors(['rows.0.phone', 'rows.1.address']);
    $this->assertDatabaseCount('leads', 0);
});

test('visits require a property and callbacks from old exports become due now', function () {
    $this->actingAs($this->admin)->postJson('/api/v1/leads/import', ['rows' => [
        [...$this->row, 'type' => 'visit_request'],
    ]])->assertUnprocessable()->assertJsonValidationErrors('rows.0.property_id');
    $this->assertDatabaseCount('leads', 0);

    $this->actingAs($this->admin)->postJson('/api/v1/leads/import', ['rows' => [
        [...$this->row, 'status' => 'to_call_back'],
    ]])->assertCreated();
    expect(DB::table('leads')->value('callback_at'))->not->toBeNull();
});

test('visit imports preserve the commercial assignment', function () {
    $commercial = User::factory()->create();
    $property = Property::factory()->create(['commercial_id' => $commercial->id]);
    $this->actingAs($this->admin)->postJson('/api/v1/leads/import', ['rows' => [
        [...$this->row, 'type' => 'visit_request', 'property_id' => $property->id],
    ]])->assertCreated();
    $this->assertDatabaseHas('leads', ['property_id' => $property->id, 'commercial_id' => $commercial->id]);
});

test('an admin can import partner leads and invalid batches create nothing', function () {
    $row = ['full_name' => 'Partner', 'phone' => '0612345678', 'professional_type' => 'agency', 'status' => 'qualified'];
    $this->actingAs($this->admin)->postJson('/api/v1/commercial-leads/import', ['rows' => [$row]])
        ->assertCreated()->assertJsonPath('data.imported', 1);
    $this->postJson('/api/v1/commercial-leads/import', ['rows' => [$row, [...$row, 'phone' => 'invalid']]])
        ->assertUnprocessable()->assertJsonValidationErrors('rows.1.phone');
    $this->assertDatabaseCount('commercial_leads', 1);
});

test('imports cannot assign arbitrary contacts and batch sizes are bounded', function () {
    $this->actingAs($this->admin)->postJson('/api/v1/leads/import', ['rows' => [[...$this->row, 'contact_id' => 1]]])
        ->assertUnprocessable();
    $this->postJson('/api/v1/leads/import', ['rows' => array_fill(0, 501, $this->row)])
        ->assertUnprocessable()->assertJsonValidationErrors('rows');
    $this->assertDatabaseCount('leads', 0);
});
