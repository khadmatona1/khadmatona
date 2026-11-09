<?php

use App\Core\Notification\Notifications\LeadCallbackDue;
use App\Models\User;
use App\Modules\Lead\Domain\Models\Lead;
use Illuminate\Support\Facades\Notification;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    Role::findOrCreate('Admin');
    Role::findOrCreate('Commercial');

    $this->admin = User::factory()->create();
    $this->admin->assignRole('Admin');

    $this->commercial = User::factory()->create();
    $this->commercial->assignRole('Commercial');

    $this->makeLead = fn (array $o = []) => Lead::create(array_merge([
        'type' => 'visit_request', 'status' => 'new', 'name' => 'Yasmine', 'email' => 'y@example.com',
        'phone' => '0612345678', 'commercial_id' => $this->commercial->id,
    ], $o));
});

test('setting a lead to "à rappeler" requires a future callback time', function () {
    $lead = ($this->makeLead)();

    $this->actingAs($this->admin)->patchJson("/api/v1/leads/{$lead->id}", ['status' => 'to_call_back'])
        ->assertStatus(422)->assertJsonValidationErrors(['callback_at']);

    $this->actingAs($this->admin)->patchJson("/api/v1/leads/{$lead->id}", ['status' => 'to_call_back', 'callback_at' => now()->subMinute()->toIso8601String()])
        ->assertStatus(422)->assertJsonValidationErrors(['callback_at']);

    expect($lead->refresh()->status->value)->toBe('new');
});

test('scheduling a callback stores the time and leaving the status clears it', function () {
    $lead = ($this->makeLead)();
    $when = now()->addHour()->startOfSecond();

    $this->actingAs($this->commercial)->patchJson("/api/v1/leads/{$lead->id}", ['status' => 'to_call_back', 'callback_at' => $when->toIso8601String()])
        ->assertOk()->assertJsonPath('data.status', 'to_call_back');

    expect($lead->refresh()->callback_at->timestamp)->toBe($when->timestamp);

    $this->actingAs($this->commercial)->patchJson("/api/v1/leads/{$lead->id}", ['status' => 'visit'])
        ->assertOk()->assertJsonPath('data.callback_at', null);

    expect($lead->refresh()->callback_at)->toBeNull();
});

test('a due callback notifies the responsible commercial exactly once', function () {
    Notification::fake();
    $lead = ($this->makeLead)(['status' => 'to_call_back', 'callback_at' => now()->subMinute()]);

    $this->artisan('leads:notify-callbacks')->expectsOutput('Notified 1 due callback(s).')->assertSuccessful();
    $this->artisan('leads:notify-callbacks')->expectsOutput('Notified 0 due callback(s).')->assertSuccessful();

    Notification::assertSentToTimes($this->commercial, LeadCallbackDue::class, 1);
    Notification::assertNotSentTo($this->admin, LeadCallbackDue::class);
    expect($lead->refresh()->callback_notified_at)->not->toBeNull();
});

test('a lead nobody owns notifies the admins', function () {
    Notification::fake();
    ($this->makeLead)(['type' => 'contact', 'commercial_id' => null, 'status' => 'to_call_back', 'callback_at' => now()->subMinute()]);

    $this->artisan('leads:notify-callbacks')->assertSuccessful();

    Notification::assertSentTo($this->admin, LeadCallbackDue::class);
});

test('callbacks that are not due, or no longer "à rappeler", are left alone', function () {
    Notification::fake();
    ($this->makeLead)(['status' => 'to_call_back', 'callback_at' => now()->addHour()]);
    ($this->makeLead)(['status' => 'contacted', 'callback_at' => now()->subHour()]);

    $this->artisan('leads:notify-callbacks')->expectsOutput('Notified 0 due callback(s).')->assertSuccessful();

    Notification::assertNothingSent();
});

test('rescheduling a callback re-arms the reminder', function () {
    Notification::fake();
    $lead = ($this->makeLead)(['status' => 'to_call_back', 'callback_at' => now()->subMinute()]);
    $this->artisan('leads:notify-callbacks')->assertSuccessful();

    $this->actingAs($this->commercial)->patchJson("/api/v1/leads/{$lead->id}", ['status' => 'to_call_back', 'callback_at' => now()->addMinutes(30)->toIso8601String()])
        ->assertOk();

    expect($lead->refresh()->callback_notified_at)->toBeNull();

    $this->travel(31)->minutes();
    $this->artisan('leads:notify-callbacks')->expectsOutput('Notified 1 due callback(s).')->assertSuccessful();

    Notification::assertSentToTimes($this->commercial, LeadCallbackDue::class, 2);
});
