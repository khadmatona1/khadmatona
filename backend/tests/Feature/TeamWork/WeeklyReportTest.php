<?php

use App\Models\User;
use App\Modules\Task\Domain\Models\DailyReport;
use App\Modules\Task\Domain\Models\WeeklyReport;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    foreach (['Admin', 'Commercial', 'SeniorCommercial'] as $role) {
        Role::findOrCreate($role);
    }
    $this->admin = User::factory()->create()->assignRole('Admin');
    $this->commercial = User::factory()->create()->assignRole('Commercial');
    $this->other = User::factory()->create()->assignRole('SeniorCommercial');
});

test('weekly reports normalize dates to Monday and update the same week without changing daily reports', function () {
    DailyReport::create(['user_id' => $this->commercial->id, 'report_date' => '2026-01-05', 'content' => 'Daily']);
    $id = $this->actingAs($this->commercial)->postJson('/api/v1/weekly-reports', [
        'report_date' => '2026-01-07', 'content' => 'Weekly', 'user_id' => $this->other->id,
    ])->assertOk()->assertJsonPath('data.report_date', '2026-01-05')->assertJsonPath('data.user_id', $this->commercial->id)->json('data.id');
    $this->postJson('/api/v1/weekly-reports', ['report_date' => '2026-01-11', 'content' => 'Updated'])
        ->assertOk()->assertJsonPath('data.id', $id)->assertJsonPath('data.content', 'Updated');
    $this->getJson('/api/v1/weekly-reports?date=2026-01-09')->assertJsonCount(1, 'data');
    $this->getJson('/api/v1/weekly-reports?date=2026-01-12')->assertJsonCount(0, 'data');
    expect(WeeklyReport::count())->toBe(1);
    expect(DailyReport::first()->content)->toBe('Daily');
    $this->assertDatabaseHas('activity_log', ['subject_type' => WeeklyReport::class, 'subject_id' => $id, 'event' => 'updated']);
});

test('weekly reports are private and admins can filter reports from senior commercials', function () {
    $this->actingAs($this->other)->postJson('/api/v1/weekly-reports', ['report_date' => '2026-01-04', 'content' => 'Year boundary'])
        ->assertOk()->assertJsonPath('data.report_date', '2025-12-29');
    $this->actingAs($this->commercial)->getJson('/api/v1/weekly-reports?user_id='.$this->other->id)->assertJsonCount(0, 'data');
    $this->actingAs($this->admin)->getJson('/api/v1/weekly-reports?user_id='.$this->other->id.'&date=2026-01-01')
        ->assertJsonCount(1, 'data')->assertJsonPath('data.0.user.id', $this->other->id);
    $this->postJson('/api/v1/weekly-reports', ['report_date' => '2026-01-01', 'content' => 'Admin'])->assertForbidden();
});

test('weekly reports reject guests unrelated users and invalid submissions', function () {
    $this->getJson('/api/v1/weekly-reports')->assertUnauthorized();
    $this->postJson('/api/v1/weekly-reports', [])->assertUnauthorized();
    $this->actingAs(User::factory()->create())->getJson('/api/v1/weekly-reports')->assertForbidden();
    $this->postJson('/api/v1/weekly-reports', [])->assertForbidden();
    $this->actingAs($this->commercial);
    foreach ([
        ['report_date' => now()->addWeek()->toDateString(), 'content' => 'Future'],
        ['report_date' => 'invalid', 'content' => 'Report'],
        ['report_date' => '2026-01-01', 'content' => ' '],
        ['report_date' => '2026-01-01', 'content' => str_repeat('x', 10001)],
    ] as $payload) {
        $this->postJson('/api/v1/weekly-reports', $payload)->assertUnprocessable();
    }
    expect(WeeklyReport::count())->toBe(0);
});
