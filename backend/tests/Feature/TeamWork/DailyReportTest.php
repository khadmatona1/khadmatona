<?php

use App\Models\User;
use App\Modules\Task\Domain\Models\DailyReport;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    foreach (['Admin', 'Commercial', 'SeniorCommercial'] as $role) {
        Role::findOrCreate($role);
    }
    $this->admin = User::factory()->create()->assignRole('Admin');
    $this->commercial = User::factory()->create()->assignRole('Commercial');
    $this->other = User::factory()->create()->assignRole('SeniorCommercial');
});

test('daily reports reject guests and unrelated roles and admins cannot submit for others', function () {
    $this->getJson('/api/v1/daily-reports')->assertUnauthorized();
    $this->postJson('/api/v1/daily-reports', [])->assertUnauthorized();
    $this->actingAs(User::factory()->create())->getJson('/api/v1/daily-reports')->assertForbidden();
    $this->postJson('/api/v1/daily-reports', [])->assertForbidden();
    $this->actingAs($this->admin)->postJson('/api/v1/daily-reports', [])->assertForbidden();
});

test('commercials save one audited report per day and cannot choose another author', function () {
    $payload = ['report_date' => '2026-01-01', 'content' => 'Five calls', 'user_id' => $this->other->id];
    $id = $this->actingAs($this->commercial)->postJson('/api/v1/daily-reports', $payload)
        ->assertOk()->assertJsonPath('data.user_id', $this->commercial->id)->json('data.id');
    $this->postJson('/api/v1/daily-reports', [...$payload, 'content' => 'Six calls'])
        ->assertOk()->assertJsonPath('data.id', $id)->assertJsonPath('data.content', 'Six calls');
    expect(DailyReport::count())->toBe(1);
    $this->assertDatabaseHas('activity_log', ['subject_type' => DailyReport::class, 'subject_id' => $id, 'event' => 'updated']);
    $this->actingAs($this->other)->postJson('/api/v1/daily-reports', $payload)
        ->assertOk()->assertJsonPath('data.user_id', $this->other->id);
    expect(DailyReport::count())->toBe(2);
});

test('report history is private to its author and admins can filter the team', function () {
    DailyReport::create(['user_id' => $this->commercial->id, 'report_date' => '2026-01-01', 'content' => 'Private report']);
    DailyReport::create(['user_id' => $this->other->id, 'report_date' => '2026-01-02', 'content' => 'Other report']);
    $this->actingAs($this->commercial)->getJson('/api/v1/daily-reports?user_id='.$this->other->id)
        ->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.content', 'Private report');
    $this->getJson('/api/v1/daily-reports?date=2026-01-02')->assertJsonCount(0, 'data');
    $this->actingAs($this->admin)->getJson('/api/v1/daily-reports')->assertJsonCount(2, 'data');
    $this->getJson('/api/v1/daily-reports?user_id='.$this->other->id.'&date=2026-01-02')
        ->assertJsonCount(1, 'data')->assertJsonPath('data.0.user.id', $this->other->id);
});

test('daily reports validate dates and content before saving', function () {
    $this->actingAs($this->commercial);
    foreach ([
        ['report_date' => 'invalid', 'content' => 'Report'],
        ['report_date' => now()->addDays(2)->toDateString(), 'content' => 'Report'],
        ['report_date' => '2026-01-01', 'content' => '   '],
        ['report_date' => '2026-01-01', 'content' => str_repeat('a', 10001)],
    ] as $payload) {
        $this->postJson('/api/v1/daily-reports', $payload)->assertUnprocessable();
    }
    expect(DailyReport::count())->toBe(0);
});
