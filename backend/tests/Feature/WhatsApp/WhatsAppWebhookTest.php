<?php

use App\Core\Notification\Notifications\WhatsAppMessageReceivedNotification;
use App\Models\User;
use App\Modules\Contact\Domain\Models\Contact;
use App\Modules\Lead\Domain\Models\Lead;
use App\Modules\WhatsApp\Domain\Contracts\AutoReplyStrategy;
use App\Modules\WhatsApp\Domain\Enums\MessageStatus;
use App\Modules\WhatsApp\Domain\Models\Conversation;
use App\Modules\WhatsApp\Domain\Models\Message;
use Illuminate\Support\Facades\Notification;
use Spatie\Permission\Models\Role;

/*
 * These tests use the REAL MetaCloudApiGateway (no fake bound) so webhook
 * signature verification is exercised end to end with real HMACs.
 */

beforeEach(function () {
    Role::findOrCreate('Admin');
    Role::findOrCreate('Commercial');

    config([
        'services.whatsapp.access_token' => 'test-token',
        'services.whatsapp.phone_number_id' => '111222333',
        'services.whatsapp.app_secret' => 'app-secret',
        'services.whatsapp.verify_token' => 'my-verify-token',
    ]);

    $this->admin = User::factory()->create();
    $this->admin->assignRole('Admin');

    /** Builds a Meta webhook body with the given `value` contents. */
    $this->payload = fn (array $value) => ['object' => 'whatsapp_business_account', 'entry' => [[
        'id' => 'WABA',
        'changes' => [['field' => 'messages', 'value' => array_merge([
            'messaging_product' => 'whatsapp',
            'metadata' => ['display_phone_number' => '15550001111', 'phone_number_id' => '111222333'],
        ], $value)]],
    ]]];

    /** Posts a payload with a (by default valid) signature. */
    $this->deliver = function (array $body, ?string $secret = 'app-secret', bool $sign = true) {
        $json = json_encode($body);
        $server = ['CONTENT_TYPE' => 'application/json', 'HTTP_ACCEPT' => 'application/json'];

        if ($sign) {
            $server['HTTP_X_HUB_SIGNATURE_256'] = 'sha256='.hash_hmac('sha256', $json, (string) $secret);
        }

        return $this->call('POST', '/api/v1/webhooks/whatsapp', [], [], [], $server, $json);
    };

    $this->inboundText = fn (string $id = 'wamid.IN1', string $from = '212612345678', string $text = 'Bonjour', ?int $ts = null) => ($this->payload)([
        'contacts' => [['profile' => ['name' => 'Yasmine'], 'wa_id' => $from]],
        'messages' => [['from' => $from, 'id' => $id, 'timestamp' => (string) ($ts ?? now()->timestamp), 'type' => 'text', 'text' => ['body' => $text]]],
    ]);
});

test('meta verification echoes the challenge only for the right token', function () {
    $this->get('/api/v1/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=my-verify-token&hub.challenge=abc123')
        ->assertOk()
        ->assertSee('abc123', false);

    $this->get('/api/v1/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=abc123')
        ->assertStatus(403);

    config(['services.whatsapp.verify_token' => null]);
    $this->get('/api/v1/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=&hub.challenge=abc123')
        ->assertStatus(403);
});

test('webhooks are rejected without a valid signature or when unconfigured', function () {
    $body = ($this->inboundText)();

    ($this->deliver)($body, sign: false)->assertStatus(403);
    ($this->deliver)($body, secret: 'not-the-secret')->assertStatus(403);
    expect(Message::count())->toBe(0);

    config(['services.whatsapp.app_secret' => null]);
    ($this->deliver)($body)->assertStatus(403);
    expect(Message::count())->toBe(0);
});

test('an inbound text message creates the conversation and stores the message', function () {
    Notification::fake();

    ($this->deliver)(($this->inboundText)('wamid.IN1', '212612345678', 'Bonjour, ce bien est disponible ?', 1_780_000_000))
        ->assertOk();

    $conversation = Conversation::firstOrFail();
    expect($conversation->wa_id)->toBe('212612345678')
        ->and($conversation->phone)->toBe('+212612345678')
        ->and($conversation->contact_name)->toBe('Yasmine')
        ->and($conversation->unread_count)->toBe(1)
        ->and($conversation->last_message_preview)->toBe('Bonjour, ce bien est disponible ?')
        ->and($conversation->last_inbound_at->timestamp)->toBe(1_780_000_000);

    $message = Message::firstOrFail();
    expect($message->wa_message_id)->toBe('wamid.IN1')
        ->and($message->direction->value)->toBe('inbound')
        ->and($message->sender_type->value)->toBe('customer')
        ->and($message->status)->toBe(MessageStatus::Received)
        ->and($message->body)->toBe('Bonjour, ce bien est disponible ?')
        ->and($message->occurred_at->timestamp)->toBe(1_780_000_000);
});

test('a redelivered webhook is stored exactly once', function () {
    $body = ($this->inboundText)('wamid.DUP');

    ($this->deliver)($body)->assertOk();
    ($this->deliver)($body)->assertOk();

    expect(Message::count())->toBe(1)
        ->and(Conversation::first()->unread_count)->toBe(1);
});

test('messages for another phone number id are ignored', function () {
    $body = ($this->inboundText)();
    $body['entry'][0]['changes'][0]['value']['metadata']['phone_number_id'] = '999';

    ($this->deliver)($body)->assertOk();

    expect(Message::count())->toBe(0);
});

test('a second message keeps one thread and increments unread, notifying only the first', function () {
    Notification::fake();

    ($this->deliver)(($this->inboundText)('wamid.A'))->assertOk();
    ($this->deliver)(($this->inboundText)('wamid.B', text: 'Vous êtes là ?'))->assertOk();

    expect(Conversation::count())->toBe(1)
        ->and(Conversation::first()->unread_count)->toBe(2)
        ->and(Message::count())->toBe(2);

    // Unassigned thread -> every Admin, and only for the first unread message.
    Notification::assertSentToTimes($this->admin, WhatsAppMessageReceivedNotification::class, 1);
});

test('an inbound number matching exactly one lead is linked and assigned to its commercial', function () {
    Notification::fake();
    $commercial = User::factory()->create();
    $commercial->assignRole('Commercial');

    $lead = Lead::create(['type' => 'visit_request', 'status' => 'new', 'name' => 'Yasmine', 'email' => 'y@example.com', 'phone' => '06 12 34 56 78', 'commercial_id' => $commercial->id]);

    ($this->deliver)(($this->inboundText)())->assertOk();

    $conversation = Conversation::firstOrFail();
    expect($conversation->lead_id)->toBe($lead->id)
        ->and($conversation->assigned_user_id)->toBe($commercial->id);

    Notification::assertSentTo($commercial, WhatsAppMessageReceivedNotification::class);
    Notification::assertNotSentTo($this->admin, WhatsAppMessageReceivedNotification::class);
});

test('an ambiguous number never guesses a lead, but can still link a unique contact', function () {
    Lead::create(['type' => 'contact', 'status' => 'new', 'name' => 'A', 'email' => 'a@example.com', 'phone' => '0612345678']);
    Lead::create(['type' => 'contact', 'status' => 'new', 'name' => 'B', 'email' => 'b@example.com', 'phone' => '+212 612 345 678']);
    $contact = Contact::factory()->create(['phone' => '0612345678']);

    ($this->deliver)(($this->inboundText)())->assertOk();

    $conversation = Conversation::firstOrFail();
    expect($conversation->lead_id)->toBeNull()
        ->and($conversation->contact_id)->toBe($contact->id);
});

test('media, location and interactive messages are stored with their details', function () {
    ($this->deliver)(($this->payload)([
        'contacts' => [['profile' => ['name' => 'Yasmine'], 'wa_id' => '212612345678']],
        'messages' => [
            ['from' => '212612345678', 'id' => 'wamid.IMG', 'timestamp' => '1780000001', 'type' => 'image', 'image' => ['id' => 'MEDIA1', 'mime_type' => 'image/jpeg', 'caption' => 'Le salon']],
            ['from' => '212612345678', 'id' => 'wamid.LOC', 'timestamp' => '1780000002', 'type' => 'location', 'location' => ['latitude' => 31.6, 'longitude' => -8.0, 'name' => 'Guéliz']],
            ['from' => '212612345678', 'id' => 'wamid.BTN', 'timestamp' => '1780000003', 'type' => 'interactive', 'interactive' => ['button_reply' => ['id' => 'x', 'title' => 'Oui']]],
        ],
    ]))->assertOk();

    $image = Message::where('wa_message_id', 'wamid.IMG')->firstOrFail();
    expect($image->type)->toBe('image')
        ->and($image->body)->toBe('Le salon')
        ->and($image->mediaId())->toBe('MEDIA1')
        ->and($image->payload['mime_type'])->toBe('image/jpeg');

    expect(Message::where('wa_message_id', 'wamid.LOC')->first()->body)->toBe('Guéliz')
        ->and(Message::where('wa_message_id', 'wamid.BTN')->first()->body)->toBe('Oui');
});

test('delivery statuses advance an outbound message and never move backwards', function () {
    $conversation = Conversation::factory()->create(['wa_id' => '212612345678']);
    $message = Message::factory()->outbound()->create(['conversation_id' => $conversation->id, 'wa_message_id' => 'wamid.OUT', 'status' => MessageStatus::Sent]);

    $status = fn (string $s, int $ts, array $extra = []) => ($this->payload)(['statuses' => [array_merge(
        ['id' => 'wamid.OUT', 'status' => $s, 'timestamp' => (string) $ts, 'recipient_id' => '212612345678'], $extra,
    )]]);

    // "read" arrives before "delivered" - the late "delivered" must not regress it.
    ($this->deliver)($status('read', 1_780_000_300))->assertOk();
    ($this->deliver)($status('delivered', 1_780_000_200))->assertOk();

    $message->refresh();
    expect($message->status)->toBe(MessageStatus::Read)
        ->and($message->read_at->timestamp)->toBe(1_780_000_300)
        ->and($message->delivered_at->timestamp)->toBe(1_780_000_300);

    // A failure can't override a message that already reached the customer.
    ($this->deliver)($status('failed', 1_780_000_400, ['errors' => [['code' => 131026, 'title' => 'Undeliverable']]]))->assertOk();
    expect($message->refresh()->status)->toBe(MessageStatus::Read);
});

test('a failed status stores Meta\'s error on a message that never got delivered', function () {
    $conversation = Conversation::factory()->create();
    $message = Message::factory()->outbound()->create(['conversation_id' => $conversation->id, 'wa_message_id' => 'wamid.BAD', 'status' => MessageStatus::Sent]);

    ($this->deliver)(($this->payload)(['statuses' => [[
        'id' => 'wamid.BAD', 'status' => 'failed', 'timestamp' => (string) now()->timestamp,
        'errors' => [['code' => 131026, 'title' => 'Message undeliverable', 'error_data' => ['details' => 'Recipient is not a WhatsApp user']]],
    ]]]))->assertOk();

    $message->refresh();
    expect($message->status)->toBe(MessageStatus::Failed)
        ->and($message->error_code)->toBe('131026')
        ->and($message->error_message)->toBe('Recipient is not a WhatsApp user');
});

test('statuses for unknown messages are ignored without error', function () {
    ($this->deliver)(($this->payload)(['statuses' => [['id' => 'wamid.NOPE', 'status' => 'delivered', 'timestamp' => '1780000000']]]))->assertOk();

    expect(Message::count())->toBe(0);
});

test('the auto reply hook stays silent by default and replies as ai once opted in', function () {
    Notification::fake();
    $fake = new Tests\Support\FakeWhatsAppGateway;
    $this->app->instance(App\Modules\WhatsApp\Domain\Contracts\WhatsAppGateway::class, $fake);
    $this->app->bind(AutoReplyStrategy::class, fn () => new class implements AutoReplyStrategy
    {
        public function reply(Conversation $conversation, Message $inbound): ?string
        {
            return 'Réponse automatique';
        }
    });

    // Default: global switch off -> nothing sent even with a strategy bound.
    ($this->deliver)(($this->inboundText)('wamid.X1'), sign: false)->assertOk(); // fake accepts any signature
    expect($fake->texts)->toBe([]);

    // Opt in: global switch + per-conversation flag.
    config(['services.whatsapp.ai_enabled' => true]);
    Conversation::first()->update(['ai_enabled' => true]);
    ($this->deliver)(($this->inboundText)('wamid.X2'), sign: false)->assertOk();

    expect($fake->texts)->toHaveCount(1)
        ->and($fake->texts[0]['body'])->toBe('Réponse automatique');

    $reply = Message::where('direction', 'outbound')->firstOrFail();
    expect($reply->sender_type->value)->toBe('ai')
        ->and($reply->sender_user_id)->toBeNull()
        ->and($reply->status)->toBe(MessageStatus::Sent);
});
