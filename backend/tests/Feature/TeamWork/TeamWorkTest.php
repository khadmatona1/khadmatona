<?php

use App\Models\User;
use App\Modules\Task\Domain\Models\TeamTask;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    foreach (['Admin', 'Commercial', 'SeniorCommercial'] as $role) {
        Role::findOrCreate($role);
    }
    $this->admin = User::factory()->create()->assignRole('Admin');
    $this->senior = User::factory()->create()->assignRole('SeniorCommercial');
    $this->commercial = User::factory()->create()->assignRole('Commercial');
    $this->other = User::factory()->create()->assignRole('Commercial');
});

test('team endpoints reject guests and unrelated roles', function () {
    $this->getJson('/api/v1/tasks')->assertUnauthorized();
    $this->getJson('/api/v1/internal-chat/messages')->assertUnauthorized();
    $this->actingAs(User::factory()->create())->getJson('/api/v1/tasks')->assertForbidden();
    $this->getJson('/api/v1/internal-chat/contacts')->assertForbidden();
});

test('admins assign tasks and notify the assignee', function () {
    $response = $this->actingAs($this->admin)->postJson('/api/v1/tasks', [
        'title' => 'Call five owners', 'assignee_id' => $this->commercial->id,
        'checklist' => [['label' => 'First owner', 'done' => false]],
    ])->assertCreated()->assertJsonPath('data.assignee.id', $this->commercial->id);
    $this->assertDatabaseHas('notifications', ['notifiable_id' => $this->commercial->id]);
    $taskId = $response->json('data.id');
    $this->actingAs($this->commercial)->getJson('/api/v1/tasks')->assertJsonCount(1, 'data');
    $this->patchJson('/api/v1/tasks/'.$taskId, [
        'status' => 'in_progress', 'report' => 'One call made', 'checklist' => [['label' => 'First owner', 'done' => true]],
    ])->assertOk()->assertJsonPath('data.checklist.0.done', true);
    $this->patchJson('/api/v1/tasks/'.$taskId, ['assignee_id' => $this->other->id])->assertUnprocessable();
    $this->patchJson('/api/v1/tasks/'.$taskId, ['checklist' => [['label' => 'Replacement', 'done' => true]]])->assertUnprocessable();
    $this->deleteJson('/api/v1/tasks/'.$taskId)->assertForbidden();
    $this->actingAs($this->other)->getJson('/api/v1/tasks')->assertJsonCount(0, 'data');
    $this->patchJson('/api/v1/tasks/'.$taskId, ['status' => 'done'])->assertForbidden();
});

test('senior commercials create only their own tasks and cannot change admin task metadata', function () {
    $this->actingAs($this->senior)->postJson('/api/v1/tasks', ['title' => 'My task', 'assignee_id' => $this->commercial->id])->assertForbidden();
    $own = $this->postJson('/api/v1/tasks', ['title' => 'My task'])->assertCreated()->assertJsonPath('data.assignee_id', $this->senior->id)->json('data.id');
    $this->patchJson('/api/v1/tasks/'.$own, ['title' => 'Updated'])->assertOk();
    $this->patchJson('/api/v1/tasks/'.$own, ['assignee_id' => $this->commercial->id])->assertForbidden();
    $adminTask = TeamTask::create(['creator_id' => $this->admin->id, 'assignee_id' => $this->senior->id, 'title' => 'Assigned']);
    $this->patchJson('/api/v1/tasks/'.$adminTask->id, ['title' => 'Overwrite'])->assertUnprocessable();
    $this->patchJson('/api/v1/tasks/'.$adminTask->id, ['status' => 'done'])->assertOk();
    $this->deleteJson('/api/v1/tasks/'.$adminTask->id)->assertForbidden();
    $this->deleteJson('/api/v1/tasks/'.$own)->assertOk();
});

test('commercials cannot create tasks and inactive assignees are rejected', function () {
    $this->actingAs($this->commercial)->postJson('/api/v1/tasks', ['title' => 'Not allowed'])->assertForbidden();
    $inactive = User::factory()->create(['is_active' => false])->assignRole('Commercial');
    $this->actingAs($this->admin)->postJson('/api/v1/tasks', ['title' => 'Invalid', 'assignee_id' => $inactive->id])->assertUnprocessable();
    $this->postJson('/api/v1/tasks', ['title' => 'Invalid', 'assignee_id' => $this->admin->id])->assertUnprocessable();
    $this->postJson('/api/v1/tasks', ['title' => 'Invalid'])->assertUnprocessable();
    $this->assertDatabaseCount('team_tasks', 0);
});

test('reassignment changes visibility and admin retains access', function () {
    $task = TeamTask::create(['creator_id' => $this->admin->id, 'assignee_id' => $this->commercial->id, 'title' => 'Task']);
    $this->actingAs($this->admin)->patchJson('/api/v1/tasks/'.$task->id, ['assignee_id' => $this->senior->id])->assertOk();
    $this->getJson('/api/v1/tasks')->assertJsonCount(1, 'data');
    $this->actingAs($this->commercial)->getJson('/api/v1/tasks')->assertJsonCount(0, 'data');
    $this->patchJson('/api/v1/tasks/'.$task->id, ['status' => 'done'])->assertForbidden();
    $this->actingAs($this->senior)->getJson('/api/v1/tasks')->assertJsonCount(1, 'data');
});

test('private chat is visible only to the two participants', function () {
    $this->actingAs($this->admin)->postJson('/api/v1/internal-chat/messages', [
        'peer_id' => $this->commercial->id, 'body' => 'Private message', 'client_id' => (string) Str::uuid(),
    ])->assertCreated();
    $this->getJson('/api/v1/internal-chat/messages')->assertJsonCount(0, 'data.messages');
    $this->actingAs($this->commercial)->getJson('/api/v1/internal-chat/messages?peer_id='.$this->admin->id)
        ->assertJsonCount(1, 'data.messages')->assertJsonPath('data.messages.0.body', 'Private message');
    $this->actingAs($this->other)->getJson('/api/v1/internal-chat/messages?peer_id='.$this->admin->id)->assertJsonCount(0, 'data.messages');
});

test('team messages are shared and read markers clear unread flags', function () {
    $id = $this->actingAs($this->admin)->postJson('/api/v1/internal-chat/messages', ['body' => 'Team message', 'client_id' => (string) Str::uuid()])->assertCreated()->json('data.id');
    $this->actingAs($this->commercial)->getJson('/api/v1/internal-chat/contacts')->assertJsonPath('data.team_unread', true);
    $this->postJson('/api/v1/internal-chat/read', ['message_id' => $id])->assertOk();
    $this->getJson('/api/v1/internal-chat/contacts')->assertJsonPath('data.team_unread', false);
    $this->getJson('/api/v1/internal-chat/messages')->assertJsonCount(1, 'data.messages');
});

test('chat retries are idempotent and invalid recipients are rejected', function () {
    $payload = ['peer_id' => $this->commercial->id, 'body' => 'Hello', 'client_id' => (string) Str::uuid()];
    $this->actingAs($this->admin)->postJson('/api/v1/internal-chat/messages', $payload)->assertCreated();
    $this->postJson('/api/v1/internal-chat/messages', $payload)->assertCreated();
    $this->assertDatabaseCount('internal_messages', 1);
    $this->postJson('/api/v1/internal-chat/messages', [...$payload, 'peer_id' => $this->other->id])->assertUnprocessable();
    $this->postJson('/api/v1/internal-chat/messages', [...$payload, 'peer_id' => $this->admin->id])->assertUnprocessable();
    $inactive = User::factory()->create(['is_active' => false])->assignRole('Commercial');
    $this->getJson('/api/v1/internal-chat/messages?peer_id='.$inactive->id)->assertUnprocessable();
});

test('read markers cannot target messages in another private chat', function () {
    $id = $this->actingAs($this->admin)->postJson('/api/v1/internal-chat/messages', ['peer_id' => $this->commercial->id, 'body' => 'Secret', 'client_id' => (string) Str::uuid()])->json('data.id');
    $this->actingAs($this->other)->postJson('/api/v1/internal-chat/read', ['peer_id' => $this->admin->id, 'message_id' => $id])->assertNotFound();
});

test('chat notifications identify unread senders and exclude other private conversations', function () {
    $this->actingAs($this->commercial);
    $id = $this->postJson('/api/v1/internal-chat/messages', ['peer_id' => $this->admin->id, 'body' => 'For admin', 'client_id' => (string) Str::uuid()])->json('data.id');
    $this->postJson('/api/v1/internal-chat/messages', ['peer_id' => $this->other->id, 'body' => 'Not for admin', 'client_id' => (string) Str::uuid()])->assertCreated();
    $this->actingAs($this->admin)->getJson('/api/v1/internal-chat/contacts')
        ->assertJsonPath('data.unread_count', 1)->assertJsonCount(1, 'data.notifications')
        ->assertJsonPath('data.notifications.0.peer_id', $this->commercial->id)
        ->assertJsonPath('data.notifications.0.sender_name', $this->commercial->name)
        ->assertJsonPath('data.notifications.0.preview', 'For admin');
    $this->postJson('/api/v1/internal-chat/read', ['peer_id' => $this->commercial->id, 'message_id' => $id])->assertOk();
    $this->getJson('/api/v1/internal-chat/contacts')->assertJsonPath('data.unread_count', 0)->assertJsonCount(0, 'data.notifications');
});

test('task totals respect ownership and dates with explicit offsets are stored in UTC', function () {
    $id = $this->actingAs($this->admin)->postJson('/api/v1/tasks', [
        'title' => 'Deadline', 'assignee_id' => $this->commercial->id, 'due_at' => '2020-01-02T10:00:00+01:00',
    ])->assertCreated()->json('data.id');
    expect(TeamTask::find($id)->due_at->format('H:i'))->toBe('09:00');
    $this->getJson('/api/v1/tasks')->assertJsonPath('meta.stats.overdue', 1)->assertJsonPath('meta.stats.todo', 1);
    $this->actingAs($this->other)->getJson('/api/v1/tasks')->assertJsonPath('meta.stats.overdue', 0)->assertJsonPath('meta.stats.todo', 0);
    $this->actingAs($this->commercial)->patchJson('/api/v1/tasks/'.$id, ['status' => 'done'])->assertOk();
    $this->getJson('/api/v1/tasks')->assertJsonPath('meta.stats.done', 1)->assertJsonPath('meta.stats.overdue', 0)->assertJsonPath('meta.stats.todo', 0);
});

test('chat history is bounded and older messages can be retrieved without overlap', function () {
    $rows = [];
    for ($i = 0; $i < 55; $i++) {
        $rows[] = ['channel' => 'team', 'sender_id' => $this->admin->id, 'body' => 'Message '.$i, 'client_id' => (string) Str::uuid(), 'created_at' => now(), 'updated_at' => now()];
    }
    DB::table('internal_messages')->insert($rows);
    $recent = $this->actingAs($this->commercial)->getJson('/api/v1/internal-chat/messages')
        ->assertJsonCount(50, 'data.messages')->assertJsonPath('data.has_more', true)->json('data.messages');
    $this->getJson('/api/v1/internal-chat/messages?before='.$recent[0]['id'])
        ->assertJsonCount(5, 'data.messages')->assertJsonPath('data.has_more', false);
});
