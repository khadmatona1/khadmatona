<?php

use App\Models\User;
use App\Modules\Finance\Domain\Models\FinancialEntry;
use App\Modules\Lead\Domain\Models\Lead;
use App\Modules\Property\Domain\Models\Property;
use App\Modules\Task\Domain\Models\TeamTask;
use App\Modules\Visit\Domain\Models\Visit;
use Illuminate\Support\Carbon;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    Carbon::setTestNow('2026-09-28 12:00:00');
    foreach (['Admin', 'Commercial', 'SeniorCommercial', 'Owner'] as $role) {
        Role::findOrCreate($role);
    }
    $this->admin = tap(User::factory()->create())->assignRole('Admin');
    $this->agent = tap(User::factory()->create())->assignRole('Commercial');
    $this->property = Property::factory()->create(['title' => 'Riad Finance']);
    $this->entry = fn (array $overrides = []) => $this->actingAs($this->admin)->postJson('/api/v1/finance/entries', array_merge([
        'kind' => 'fee', 'label' => 'Honoraires vente', 'amount' => '1000.10',
        'occurred_on' => '2026-09-02', 'paid_on' => null,
        'property_id' => $this->property->id, 'commercial_id' => $this->agent->id,
    ], $overrides));
    $this->reportUrl = '/api/v1/finance/dashboard?from=2026-09-01&to=2026-09-28';
});

afterEach(fn () => Carbon::setTestNow());

test('finance endpoints require authentication and admin authorization', function () {
    $this->getJson($this->reportUrl)->assertUnauthorized();
    foreach (['Commercial', 'SeniorCommercial', 'Owner'] as $role) {
        $user = tap(User::factory()->create())->assignRole($role);
        $this->actingAs($user)->getJson($this->reportUrl)->assertForbidden();
        $this->getJson('/api/v1/finance/options')->assertForbidden();
        $this->postJson('/api/v1/finance/entries', [])->assertForbidden();
    }
    $entry = ($this->entry)()->assertCreated()->json('data.id');
    $this->actingAs($this->agent)->putJson('/api/v1/finance/entries/'.$entry, [])->assertForbidden();
    $this->deleteJson('/api/v1/finance/entries/'.$entry)->assertForbidden();
});

test('finance stores decimal amounts exactly in cents and protects audit fields', function () {
    ($this->entry)(['amount' => '0.29', 'created_by' => $this->agent->id, 'amount_cents' => 9999])
        ->assertCreated()->assertJsonPath('data.amount_cents', 29);
    $entry = FinancialEntry::first();
    expect($entry->amount_cents)->toBe(29)->and($entry->created_by)->toBe($this->admin->id);
    $this->assertDatabaseHas('activity_log', ['subject_type' => FinancialEntry::class, 'subject_id' => $entry->id, 'event' => 'created']);
});

test('recognition and payment dates produce different revenue and receipt totals', function () {
    ($this->entry)(['amount' => '1000.10', 'paid_on' => '2026-09-05'])->assertCreated();
    ($this->entry)(['amount' => '200.20'])->assertCreated();
    ($this->entry)(['amount' => '300.30', 'occurred_on' => '2026-08-20', 'paid_on' => '2026-09-01'])->assertCreated();
    ($this->entry)(['kind' => 'commission', 'amount' => '100.01', 'paid_on' => '2026-09-10'])->assertCreated();
    ($this->entry)(['kind' => 'expense', 'amount' => '50.02', 'commercial_id' => null, 'property_id' => null])->assertCreated();
    ($this->entry)(['amount' => '9000', 'occurred_on' => '2026-08-01'])->assertCreated();

    $report = $this->getJson($this->reportUrl)->assertOk()
        ->assertJsonPath('data.totals.revenue', 120030)
        ->assertJsonPath('data.totals.receipts', 130040)
        ->assertJsonPath('data.totals.commissions', 10001)
        ->assertJsonPath('data.totals.expenses', 5002)
        ->assertJsonPath('data.totals.margin', 105027)
        ->assertJsonPath('data.totals.cash_balance', 120039)
        ->assertJsonPath('data.totals.unpaid', 20020)
        ->assertJsonPath('data.totals.fee_count', 2)
        ->assertJsonPath('data.pagination.total', 5)->json('data');
    foreach (['revenue', 'receipts', 'expenses', 'commissions', 'margin'] as $metric) {
        expect(array_sum(array_column($report['properties'], $metric)))->toBe($report['totals'][$metric]);
        expect(array_sum(array_column($report['commercials'], $metric)))->toBe($report['totals'][$metric]);
        expect(array_sum(array_column($report['trend'], $metric)))->toBe($report['totals'][$metric]);
    }
    expect($report['properties'][0]['name'])->toBe('Riad Finance');
});

test('report respects inclusive dates filters and unpaid status at the reporting cutoff', function () {
    ($this->entry)(['amount' => '10', 'occurred_on' => '2026-09-01', 'paid_on' => '2026-09-28'])->assertCreated();
    ($this->entry)(['amount' => '20', 'occurred_on' => '2026-09-28'])->assertCreated();
    $other = Property::factory()->create();
    ($this->entry)(['amount' => '90', 'property_id' => $other->id, 'commercial_id' => null])->assertCreated();
    $this->getJson($this->reportUrl.'&property_id='.$this->property->id.'&commercial_id='.$this->agent->id)
        ->assertOk()->assertJsonPath('data.totals.revenue', 3000)->assertJsonPath('data.totals.receipts', 1000)->assertJsonPath('data.pagination.total', 2);
    $this->getJson('/api/v1/finance/dashboard?from=2026-09-01&to=2026-09-10&property_id='.$this->property->id)
        ->assertOk()->assertJsonPath('data.totals.unpaid', 1000)->assertJsonPath('data.totals.receipts', 0);
});

test('updates and soft deletion immediately change reports', function () {
    $id = ($this->entry)()->assertCreated()->json('data.id');
    $this->putJson('/api/v1/finance/entries/'.$id, [
        'kind' => 'fee', 'label' => 'Corrected', 'amount' => '12.34', 'occurred_on' => '2026-09-02',
        'paid_on' => '2026-09-03', 'property_id' => null, 'commercial_id' => null,
    ])->assertOk()->assertJsonPath('data.amount_cents', 1234);
    $this->getJson($this->reportUrl)->assertJsonPath('data.totals.receipts', 1234);
    $this->deleteJson('/api/v1/finance/entries/'.$id)->assertOk();
    $this->assertSoftDeleted('financial_entries', ['id' => $id]);
    $this->getJson($this->reportUrl)->assertJsonPath('data.totals.revenue', 0)->assertJsonCount(0, 'data.entries');
});

test('invalid money assignments dates and report ranges return validation errors', function () {
    foreach (['-1', '0', '1.001', '1e3', '10000000000', 'abc'] as $amount) {
        ($this->entry)(['amount' => $amount])->assertUnprocessable()->assertJsonValidationErrors('amount');
    }
    ($this->entry)(['kind' => 'commission', 'commercial_id' => null])->assertUnprocessable()->assertJsonValidationErrors('commercial_id');
    ($this->entry)(['commercial_id' => $this->admin->id])->assertUnprocessable()->assertJsonValidationErrors('commercial_id');
    ($this->entry)(['paid_on' => '2026-08-01'])->assertUnprocessable()->assertJsonValidationErrors('paid_on');
    ($this->entry)(['occurred_on' => '2027-01-01'])->assertUnprocessable()->assertJsonValidationErrors('occurred_on');
    ($this->entry)(['property_id' => 99999999])->assertUnprocessable()->assertJsonValidationErrors('property_id');
    foreach ([['bad', '2026-09-28'], ['2026-10-01', '2026-09-01'], ['2020-01-01', '2026-09-28']] as [$from, $to]) {
        $this->getJson('/api/v1/finance/dashboard?from='.$from.'&to='.$to)->assertUnprocessable();
    }
});

test('options include both commercial roles and property search while report retains archived titles', function () {
    $senior = tap(User::factory()->create())->assignRole('SeniorCommercial');
    ($this->entry)()->assertCreated();
    $options = $this->getJson('/api/v1/finance/options?search=Riad')->assertOk()->json('data');
    expect(array_column($options['commercials'], 'id'))->toContain($this->agent->id, $senior->id)->not->toContain($this->admin->id);
    expect(array_column($options['properties'], 'id'))->toContain($this->property->id);
    $this->property->delete();
    $this->getJson($this->reportUrl)->assertOk()->assertJsonPath('data.properties.0.name', 'Riad Finance');
});

test('commission filter scopes both ledger and aggregates before pagination', function () {
    ($this->entry)(['kind' => 'commission', 'amount' => '10.50', 'paid_on' => '2026-09-03'])->assertCreated();
    ($this->entry)(['kind' => 'fee', 'amount' => '200'])->assertCreated();
    ($this->entry)(['kind' => 'expense', 'amount' => '100'])->assertCreated();
    $this->getJson($this->reportUrl.'&kind=commission')->assertOk()
        ->assertJsonPath('data.totals.commissions', 1050)
        ->assertJsonPath('data.totals.disbursements', 1050)
        ->assertJsonPath('data.totals.revenue', 0)
        ->assertJsonPath('data.totals.expenses', 0)
        ->assertJsonPath('data.pagination.total', 1)
        ->assertJsonPath('data.entries.0.kind', 'commission');
    $this->getJson($this->reportUrl.'&kind=invalid')->assertUnprocessable();
});

test('activity report respects local day boundaries assignees statuses and soft deletions', function () {
    $lead = Lead::create([
        'type' => 'contact', 'status' => 'new', 'name' => 'Test', 'email' => '', 'phone' => '0612345678',
        'commercial_id' => $this->agent->id,
    ]);
    $lead->forceFill(['created_at' => '2026-09-01 23:30:00'])->save();
    $outside = $lead->replicate();
    $outside->forceFill(['created_at' => '2026-09-01 22:59:59'])->save();
    $other = $lead->replicate();
    $other->commercial_id = null;
    $other->save();
    $visit = Visit::create([
        'lead_id' => $lead->id, 'property_id' => $this->property->id, 'commercial_id' => $this->agent->id,
        'scheduled_at' => '2026-09-02 12:00:00', 'status' => 'completed',
    ]);
    $task = TeamTask::create([
        'creator_id' => $this->admin->id, 'assignee_id' => $this->agent->id, 'title' => 'Call', 'status' => 'done',
    ]);
    $task->forceFill(['created_at' => '2026-09-02 12:00:00'])->save();
    $url = '/api/v1/finance/activity?from=2026-09-02&to=2026-09-02&commercial_id='.$this->agent->id;
    $this->actingAs($this->admin)->getJson($url)->assertOk()
        ->assertJsonPath('data.totals.leads', 1)->assertJsonPath('data.totals.visits', 1)
        ->assertJsonPath('data.totals.visits_completed', 1)->assertJsonPath('data.totals.tasks', 1)
        ->assertJsonPath('data.totals.tasks_completed', 1)->assertJsonCount(1, 'data.commercials')
        ->assertJsonPath('data.commercials.0.name', $this->agent->name);
    $task->delete();
    $visit->delete();
    $lead->delete();
    $this->getJson($url)->assertOk()->assertJsonPath('data.totals.leads', 0)
        ->assertJsonPath('data.totals.visits', 0)->assertJsonPath('data.totals.tasks', 0);
});

test('activity reports require admin and validate report dates', function () {
    $url = '/api/v1/finance/activity?from=2026-09-02&to=2026-09-02';
    $this->getJson($url)->assertUnauthorized();
    $this->actingAs($this->agent)->getJson($url)->assertForbidden();
    $this->actingAs($this->admin)->getJson('/api/v1/finance/activity?from=bad&to=bad')->assertUnprocessable();
});
