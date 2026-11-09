<?php

use App\Core\Notification\Notifications\WhatsAppMessageReceivedNotification;
use App\Models\User;
use App\Modules\WhatsApp\Domain\Contracts\WhatsAppGateway;
use App\Modules\WhatsApp\Domain\Enums\MessageStatus;
use App\Modules\WhatsApp\Domain\Exceptions\WhatsAppRequestFailedException;
use App\Modules\WhatsApp\Domain\Models\Conversation;
use App\Modules\WhatsApp\Domain\Models\Message;
use Illuminate\Notifications\DatabaseNotification;
use Spatie\Permission\Models\Role;
use Tests\Support\FakeWhatsAppGateway;

beforeEach(function () {
    Role::findOrCreate('Admin');
    Role::findOrCreate('Commercial');

    $this->fake = new FakeWhatsAppGateway;
    $this->app->instance(WhatsAppGateway::class, $this->fake);

    $this->admin = User::factory()->create();
    $this->admin->assignRole('Admin');
    $this->owner = User::factory()->create();
    $this->owner->assignRole('Commercial');
    $this->stranger = User::factory()->create();
    $this->stranger->assignRole('Commercial');

    $this->conversation = Conversation::factory()->create(['assigned_user_id' => $this->owner->id, 'wa_id' => '212612345678']);
});

test('a guest cannot use the inbox', function () {
    $this->getJson('/api/v1/whatsapp/conversations')->assertStatus(401);
    $this->getJson('/api/v1/whatsapp/status')->assertStatus(401);
    $this->postJson("/api/v1/whatsapp/conversations/{$this->conversation->id}/messages", ['body' => 'x'])->assertStatus(401);
});

test('the status endpoint reports configuration without leaking secrets', function () {
    $this->fake->configured = false;
    $this->fake->webhooks = false;

    $this->actingAs($this->owner)->getJson('/api/v1/whatsapp/status')
        ->assertOk()
        ->assertJsonPath('data.configured', false)
        ->assertJsonPath('data.webhooks_ready', false)
        ->assertJsonMissingPath('data.webhook_url');

    $this->fake->configured = true;
    $this->actingAs($this->admin)->getJson('/api/v1/whatsapp/status')
        ->assertOk()
        ->assertJsonPath('data.configured', true)
        ->assertJsonPath('data.webhook_url', rtrim(config('app.url'), '/').'/api/v1/webhooks/whatsapp');
});

test('with no credentials sending fails cleanly and stores nothing', function () {
    $this->fake->configured = false;

    $this->actingAs($this->admin)
        ->postJson("/api/v1/whatsapp/conversations/{$this->conversation->id}/messages", ['body' => 'Bonjour'])
        ->assertStatus(503)
        ->assertJsonPath('code', 'whatsapp_not_configured');

    $this->actingAs($this->admin)
        ->postJson('/api/v1/whatsapp/conversations/start', ['phone' => '0611111111'])
        ->assertStatus(503)
        ->assertJsonPath('code', 'whatsapp_not_configured');

    expect(Message::count())->toBe(0)->and(Conversation::count())->toBe(1);
});

test('an agent reply is sent through the gateway and stored in the history', function () {
    $response = $this->actingAs($this->owner)
        ->postJson("/api/v1/whatsapp/conversations/{$this->conversation->id}/messages", ['body' => 'Le bien est disponible.']);

    $response->assertCreated()
        ->assertJsonPath('data.direction', 'outbound')
        ->assertJsonPath('data.sender_type', 'agent')
        ->assertJsonPath('data.sender_name', $this->owner->name)
        ->assertJsonPath('data.status', 'sent')
        ->assertJsonPath('data.body', 'Le bien est disponible.');

    expect($this->fake->texts)->toBe([['to' => '212612345678', 'body' => 'Le bien est disponible.']]);

    $message = Message::firstOrFail();
    expect($message->wa_message_id)->toStartWith('wamid.FAKE')
        ->and($message->sender_user_id)->toBe($this->owner->id)
        ->and($message->sent_at)->not->toBeNull()
        ->and($this->conversation->refresh()->last_message_preview)->toBe('Le bien est disponible.');
});

test('free-form replies are blocked once the 24 hour window has closed', function () {
    $closed = Conversation::factory()->windowClosed()->create(['assigned_user_id' => $this->owner->id]);

    $this->actingAs($this->owner)
        ->postJson("/api/v1/whatsapp/conversations/{$closed->id}/messages", ['body' => 'Coucou'])
        ->assertStatus(422)
        ->assertJsonPath('code', 'whatsapp_window_closed');

    expect($this->fake->texts)->toBe([])->and(Message::count())->toBe(0);

    // ...but an approved template still goes through, and is recorded as one.
    $this->actingAs($this->owner)
        ->postJson("/api/v1/whatsapp/conversations/{$closed->id}/templates", ['name' => 'relance_visite', 'language' => 'fr', 'params' => ['Yasmine', 'Samedi']])
        ->assertCreated()
        ->assertJsonPath('data.type', 'template');

    expect($this->fake->templates)->toHaveCount(1)
        ->and($this->fake->templates[0]['params'])->toBe(['Yasmine', 'Samedi'])
        ->and(Message::firstOrFail()->payload['name'])->toBe('relance_visite');
});

test('a Meta failure is reported and kept in the history as a failed message', function () {
    $this->fake->failNextSend = new WhatsAppRequestFailedException('Recipient phone number not in allowed list', 131030);

    $this->actingAs($this->owner)
        ->postJson("/api/v1/whatsapp/conversations/{$this->conversation->id}/messages", ['body' => 'Bonjour'])
        ->assertStatus(502)
        ->assertJsonPath('code', 'whatsapp_request_failed');

    $message = Message::firstOrFail();
    expect($message->status)->toBe(MessageStatus::Failed)
        ->and($message->error_code)->toBe('131030')
        ->and($message->error_message)->toBe('Recipient phone number not in allowed list')
        ->and($message->wa_message_id)->toBeNull();
});

test('a commercial can only see and use conversations assigned to them', function () {
    Conversation::factory()->create(['assigned_user_id' => $this->stranger->id]);
    Conversation::factory()->create(['assigned_user_id' => null]);

    $this->actingAs($this->owner)->getJson('/api/v1/whatsapp/conversations')
        ->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $this->conversation->id);

    $this->actingAs($this->admin)->getJson('/api/v1/whatsapp/conversations')
        ->assertOk()->assertJsonCount(3, 'data');

    $this->actingAs($this->stranger)->getJson("/api/v1/whatsapp/conversations/{$this->conversation->id}")->assertStatus(403);
    $this->actingAs($this->stranger)->getJson("/api/v1/whatsapp/conversations/{$this->conversation->id}/messages")->assertStatus(403);
    $this->actingAs($this->stranger)->postJson("/api/v1/whatsapp/conversations/{$this->conversation->id}/messages", ['body' => 'hack'])->assertStatus(403);
    $this->actingAs($this->stranger)->postJson("/api/v1/whatsapp/conversations/{$this->conversation->id}/read")->assertStatus(403);
    expect($this->fake->texts)->toBe([]);
});

test('the history is returned oldest first with sender details and pages backwards', function () {
    foreach (range(1, 5) as $i) {
        Message::factory()->create(['conversation_id' => $this->conversation->id, 'body' => "m{$i}", 'occurred_at' => now()->addMinutes($i)]);
    }
    Message::factory()->outbound()->create(['conversation_id' => $this->conversation->id, 'body' => 'reply', 'sender_user_id' => $this->owner->id, 'occurred_at' => now()->addMinutes(6)]);

    $latest = $this->actingAs($this->owner)->getJson("/api/v1/whatsapp/conversations/{$this->conversation->id}/messages?limit=3");
    $latest->assertOk()
        ->assertJsonPath('meta.has_more', true)
        ->assertJsonPath('data.0.body', 'm4')
        ->assertJsonPath('data.2.body', 'reply')
        ->assertJsonPath('data.2.sender_name', $this->owner->name)
        ->assertJsonPath('data.2.sender_type', 'agent');

    $firstId = $latest->json('data.0.id');
    $this->actingAs($this->owner)->getJson("/api/v1/whatsapp/conversations/{$this->conversation->id}/messages?limit=3&before_id={$firstId}")
        ->assertOk()->assertJsonPath('meta.has_more', false)->assertJsonCount(3, 'data')->assertJsonPath('data.0.body', 'm1');
});

test('opening a conversation clears unread, the bell and sends a read receipt', function () {
    $this->conversation->update(['unread_count' => 3]);
    Message::factory()->create(['conversation_id' => $this->conversation->id, 'wa_message_id' => 'wamid.LATEST']);
    $this->owner->notifications()->create([
        'id' => (string) Illuminate\Support\Str::uuid(),
        'type' => WhatsAppMessageReceivedNotification::class,
        'data' => ['type' => 'whatsapp_message', 'conversation_id' => $this->conversation->id],
    ]);

    $this->actingAs($this->owner)->postJson("/api/v1/whatsapp/conversations/{$this->conversation->id}/read")
        ->assertOk()->assertJsonPath('data.unread_count', 0);

    expect($this->fake->readReceipts)->toBe(['wamid.LATEST'])
        ->and(DatabaseNotification::whereNull('read_at')->count())->toBe(0);
});

test('starting a conversation opens the thread with the default template', function () {
    $response = $this->actingAs($this->owner)->postJson('/api/v1/whatsapp/conversations/start', [
        'phone' => '06 11 22 33 44',
        'contact_name' => 'Karim',
    ]);

    $response->assertCreated()
        ->assertJsonPath('data.conversation.wa_id', '212611223344')
        ->assertJsonPath('data.conversation.assigned_user_id', $this->owner->id)
        ->assertJsonPath('data.message.type', 'template');

    expect($this->fake->templates)->toHaveCount(1)
        ->and($this->fake->templates[0]['to'])->toBe('212611223344')
        ->and($this->fake->templates[0]['name'])->toBe('hello_world')
        ->and($this->fake->templates[0]['language'])->toBe('en_US');
});

test('starting a conversation rejects an invalid phone and cannot hijack someone else\'s thread', function () {
    $this->actingAs($this->owner)->postJson('/api/v1/whatsapp/conversations/start', ['phone' => 'abc'])
        ->assertStatus(422)->assertJsonValidationErrors(['phone']);

    // Same number as a thread assigned to another commercial.
    $this->actingAs($this->stranger)->postJson('/api/v1/whatsapp/conversations/start', ['phone' => '+212612345678'])
        ->assertStatus(403);

    expect($this->fake->templates)->toBe([]);
});

test('only an admin can reassign a conversation, link it and toggle the ai flag', function () {
    $this->actingAs($this->owner)->patchJson("/api/v1/whatsapp/conversations/{$this->conversation->id}", ['ai_enabled' => true])
        ->assertStatus(403);

    $this->actingAs($this->admin)->patchJson("/api/v1/whatsapp/conversations/{$this->conversation->id}", [
        'assigned_user_id' => $this->stranger->id,
        'ai_enabled' => true,
    ])->assertOk()->assertJsonPath('data.assigned_user_id', $this->stranger->id)->assertJsonPath('data.ai_enabled', true);

    $this->actingAs($this->admin)->patchJson("/api/v1/whatsapp/conversations/{$this->conversation->id}", ['lead_id' => 999999])
        ->assertStatus(422)->assertJsonValidationErrors(['lead_id']);
});

test('media is proxied to authorised users with hardened headers', function () {
    $image = Message::factory()->create([
        'conversation_id' => $this->conversation->id, 'type' => 'image',
        'payload' => ['id' => 'MEDIA1', 'mime_type' => 'image/png'],
    ]);
    $text = Message::factory()->create(['conversation_id' => $this->conversation->id]);

    $response = $this->actingAs($this->owner)->get("/api/v1/whatsapp/messages/{$image->id}/media");
    $response->assertOk()
        ->assertHeader('Content-Type', 'image/png')
        ->assertHeader('X-Content-Type-Options', 'nosniff');
    expect($response->getContent())->toBe('PNGDATA');

    $this->actingAs($this->owner)->get("/api/v1/whatsapp/messages/{$text->id}/media")->assertStatus(404);
    $this->actingAs($this->stranger)->get("/api/v1/whatsapp/messages/{$image->id}/media")->assertStatus(403);

    // A non-whitelisted type is never rendered inline.
    $this->fake->media = ['content' => '<script>alert(1)</script>', 'mime' => 'text/html'];
    $this->actingAs($this->owner)->get("/api/v1/whatsapp/messages/{$image->id}/media")
        ->assertHeader('Content-Type', 'application/octet-stream');
});

test('conversations can be filtered by unread and searched by name or number', function () {
    Conversation::factory()->create(['assigned_user_id' => $this->owner->id, 'contact_name' => 'Zineb', 'unread_count' => 2]);

    $this->actingAs($this->owner)->getJson('/api/v1/whatsapp/conversations?filter[unread]=1')
        ->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.contact_name', 'Zineb');

    $this->actingAs($this->owner)->getJson('/api/v1/whatsapp/conversations?filter[search]=Zin')
        ->assertOk()->assertJsonCount(1, 'data');

    $this->actingAs($this->owner)->getJson('/api/v1/whatsapp/conversations?filter[search]=212612345678')
        ->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $this->conversation->id);
});
