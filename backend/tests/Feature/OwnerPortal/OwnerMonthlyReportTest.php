<?php

use App\Models\User;
use App\Modules\Contact\Domain\Models\Contact;
use App\Modules\Lead\Domain\Models\Lead;
use App\Modules\Property\Domain\Models\Property;
use App\Modules\Visit\Domain\Models\Visit;
use Illuminate\Support\Carbon;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    Role::findOrCreate('Owner');

    $this->contact = Contact::factory()->create(['type' => 'landlord']);
    $this->owner = User::factory()->create(['contact_id' => $this->contact->id]);
    $this->owner->assignRole('Owner');
    $this->propertyOne = Property::factory()->create(['owner_contact_id' => $this->contact->id]);
    $this->propertyTwo = Property::factory()->create(['owner_contact_id' => $this->contact->id]);
});

test('the monthly report always returns exactly 12 months, zero-filled', function () {
    $response = $this->actingAs($this->owner)->getJson('/api/v1/owner/reports/monthly');

    $response->assertOk()->assertJsonCount(12, 'data.months');
    foreach ($response->json('data.months') as $month) {
        expect($month)->toHaveKeys(['month', 'leads_count', 'completed_visits_count']);
    }
});

test('counts are correctly bucketed by month and aggregated across all owned properties', function () {
    $twoMonthsAgo = Carbon::now()->subMonths(2);

    // `created_at`/`completed_at` aren't mass-assignable (not in $fillable),
    // so the backdating below is a direct attribute set + save, not create().
    $lead = Lead::create([
        'type' => 'visit_request', 'status' => 'new', 'name' => 'T', 'email' => 't1@example.com',
        'property_id' => $this->propertyOne->id,
    ]);
    $lead->created_at = $twoMonthsAgo;
    $lead->save();

    $leadTwo = Lead::create([
        'type' => 'visit_request', 'status' => 'new', 'name' => 'T2', 'email' => 't2@example.com',
        'property_id' => $this->propertyTwo->id,
    ]);
    $leadTwo->created_at = $twoMonthsAgo;
    $leadTwo->save();

    $visit = Visit::create([
        'lead_id' => $lead->id, 'property_id' => $this->propertyOne->id,
        'scheduled_at' => $twoMonthsAgo, 'status' => 'completed', 'completed_at' => $twoMonthsAgo,
    ]);
    $visit->completed_at = $twoMonthsAgo;
    $visit->save();

    $response = $this->actingAs($this->owner)->getJson('/api/v1/owner/reports/monthly');

    $months = collect($response->json('data.months'));
    $bucket = $months->firstWhere('month', $twoMonthsAgo->format('Y-m'));

    expect($bucket['leads_count'])->toBe(2);
    expect($bucket['completed_visits_count'])->toBe(1);

    // Every other month stays zero.
    $otherMonths = $months->reject(fn ($m) => $m['month'] === $twoMonthsAgo->format('Y-m'));
    expect($otherMonths->every(fn ($m) => $m['leads_count'] === 0 && $m['completed_visits_count'] === 0))->toBeTrue();
});

test('another owner\'s activity never leaks into this owner\'s report', function () {
    $otherContact = Contact::factory()->create(['type' => 'seller']);
    $otherProperty = Property::factory()->create(['owner_contact_id' => $otherContact->id]);
    Lead::create([
        'type' => 'visit_request', 'status' => 'new', 'name' => 'Other', 'email' => 'other@example.com',
        'property_id' => $otherProperty->id,
    ]);

    $response = $this->actingAs($this->owner)->getJson('/api/v1/owner/reports/monthly');

    $currentMonth = collect($response->json('data.months'))->last();
    expect($currentMonth['leads_count'])->toBe(0);
});
