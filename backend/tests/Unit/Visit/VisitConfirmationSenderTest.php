<?php

use App\Modules\Lead\Domain\Contracts\LeadRepositoryInterface;
use App\Modules\Lead\Domain\Models\Lead;
use App\Modules\Property\Domain\Contracts\PropertyRepositoryInterface;
use App\Modules\Property\Domain\Models\Property;
use App\Modules\Visit\Application\VisitConfirmationSender;
use App\Modules\Visit\Domain\Contracts\VisitRepositoryInterface;
use App\Modules\Visit\Domain\Models\Visit;
use App\Modules\WhatsApp\Application\ConversationService;
use App\Modules\WhatsApp\Application\WhatsAppMessenger;
use App\Modules\WhatsApp\Domain\Enums\MessageSenderType;
use App\Modules\WhatsApp\Domain\Exceptions\WhatsAppNotConfiguredException;
use App\Modules\WhatsApp\Domain\Exceptions\WhatsAppRequestFailedException;
use App\Modules\WhatsApp\Domain\Models\Conversation;
use App\Modules\WhatsApp\Domain\Models\Message;
use Tests\TestCase;

uses(TestCase::class);

function makeVisitConfirmationFixtures(): array
{
    $visit = (new Visit)->forceFill([
        'id' => 1, 'lead_id' => 10, 'property_id' => 20, 'scheduled_at' => '2027-09-23T09:00:00Z',
    ]);
    $lead = (new Lead)->forceFill(['id' => 10, 'name' => 'Test Visitor', 'phone' => '+212612345678']);
    $property = (new Property)->forceFill(['id' => 20, 'title' => 'Villa Test', 'address' => 'Rue Test']);

    return [$visit, $lead, $property];
}

test('sends via ConversationService + WhatsAppMessenger with MessageSenderType::System', function () {
    [$visit, $lead, $property] = makeVisitConfirmationFixtures();

    $visits = Mockery::mock(VisitRepositoryInterface::class);
    $visits->shouldReceive('find')->with(1)->andReturn($visit);
    $visits->shouldReceive('update')->once()->with($visit, Mockery::on(fn (array $attrs) => $attrs['whatsapp_confirmed_at'] !== null));

    $leads = Mockery::mock(LeadRepositoryInterface::class);
    $leads->shouldReceive('find')->with(10)->andReturn($lead);

    $properties = Mockery::mock(PropertyRepositoryInterface::class);
    $properties->shouldReceive('find')->with(20)->andReturn($property);

    $conversation = Mockery::mock(Conversation::class)->makePartial();
    $conversations = Mockery::mock(ConversationService::class);
    $conversations->shouldReceive('findOrCreate')->once()->with('212612345678', 'Test Visitor')->andReturn($conversation);

    $messenger = Mockery::mock(WhatsAppMessenger::class);
    $messenger->shouldReceive('sendTemplate')->once()->withArgs(
        fn ($conv, $name, $language, $params, $sender) => $conv === $conversation
            && is_string($name)
            && $language === 'fr'
            && $params[0] === 'Test Visitor'
            && $sender === MessageSenderType::System,
    )->andReturn(Mockery::mock(Message::class)->makePartial());

    $sender = new VisitConfirmationSender($visits, $leads, $properties, $conversations, $messenger);
    $sender->send(1);
});

test('a missing/invalid lead phone is logged and skipped, never throws', function () {
    [$visit, , $property] = makeVisitConfirmationFixtures();
    $leadWithNoPhone = (new Lead)->forceFill(['id' => 10, 'name' => 'Test Visitor', 'phone' => null]);

    $visits = Mockery::mock(VisitRepositoryInterface::class);
    $visits->shouldReceive('find')->with(1)->andReturn($visit);
    $visits->shouldNotReceive('update');

    $leads = Mockery::mock(LeadRepositoryInterface::class);
    $leads->shouldReceive('find')->with(10)->andReturn($leadWithNoPhone);

    $properties = Mockery::mock(PropertyRepositoryInterface::class);
    $properties->shouldReceive('find')->never();

    $conversations = Mockery::mock(ConversationService::class);
    $conversations->shouldNotReceive('findOrCreate');

    $messenger = Mockery::mock(WhatsAppMessenger::class);
    $messenger->shouldNotReceive('sendTemplate');

    $sender = new VisitConfirmationSender($visits, $leads, $properties, $conversations, $messenger);

    expect(fn () => $sender->send(1))->not->toThrow(Exception::class);
});

test('WhatsAppNotConfiguredException is caught and logged, never propagates', function () {
    [$visit, $lead, $property] = makeVisitConfirmationFixtures();

    $visits = Mockery::mock(VisitRepositoryInterface::class);
    $visits->shouldReceive('find')->with(1)->andReturn($visit);
    $visits->shouldNotReceive('update');

    $leads = Mockery::mock(LeadRepositoryInterface::class);
    $leads->shouldReceive('find')->with(10)->andReturn($lead);

    $properties = Mockery::mock(PropertyRepositoryInterface::class);
    $properties->shouldReceive('find')->with(20)->andReturn($property);

    $conversations = Mockery::mock(ConversationService::class);
    $conversations->shouldReceive('findOrCreate')->andThrow(WhatsAppNotConfiguredException::make());

    $messenger = Mockery::mock(WhatsAppMessenger::class);
    $messenger->shouldNotReceive('sendTemplate');

    $sender = new VisitConfirmationSender($visits, $leads, $properties, $conversations, $messenger);

    expect(fn () => $sender->send(1))->not->toThrow(Exception::class);
});

test('WhatsAppRequestFailedException is caught and logged, never propagates', function () {
    [$visit, $lead, $property] = makeVisitConfirmationFixtures();

    $visits = Mockery::mock(VisitRepositoryInterface::class);
    $visits->shouldReceive('find')->with(1)->andReturn($visit);
    $visits->shouldNotReceive('update');

    $leads = Mockery::mock(LeadRepositoryInterface::class);
    $leads->shouldReceive('find')->with(10)->andReturn($lead);

    $properties = Mockery::mock(PropertyRepositoryInterface::class);
    $properties->shouldReceive('find')->with(20)->andReturn($property);

    $conversation = Mockery::mock(Conversation::class)->makePartial();
    $conversations = Mockery::mock(ConversationService::class);
    $conversations->shouldReceive('findOrCreate')->andReturn($conversation);

    $messenger = Mockery::mock(WhatsAppMessenger::class);
    $messenger->shouldReceive('sendTemplate')->andThrow(new WhatsAppRequestFailedException('Meta rejected the template'));

    $sender = new VisitConfirmationSender($visits, $leads, $properties, $conversations, $messenger);

    expect(fn () => $sender->send(1))->not->toThrow(Exception::class);
});
