<?php

use App\Modules\Lead\Domain\Contracts\LeadRepositoryInterface;
use App\Modules\Lead\Domain\Models\Lead;
use App\Modules\Property\Domain\Contracts\PropertyRepositoryInterface;
use App\Modules\Property\Domain\Models\Property;
use App\Modules\Visit\Application\Actions\CreateVisitAction;
use App\Modules\Visit\Domain\Contracts\VisitRepositoryInterface;
use App\Modules\Visit\Domain\Events\VisitBooked;
use App\Modules\Visit\Domain\Models\Visit;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Notification;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

// RefreshDatabase (via the Feature-suite binding) is needed here because
// DB::transaction() genuinely opens a database transaction even though
// every repository is mocked - a pure PHPUnit-only test with no DB
// connection would fail at that point. Admin is seeded because the mocked
// commercial_id values below (42, null) never correspond to a real User
// row, so CreateVisitAction::notifyCommercial() always falls back to
// notifying Admins here - not under test in this file, just needs to not
// throw RoleDoesNotExist.
uses(TestCase::class, RefreshDatabase::class);

beforeEach(function () {
    Role::findOrCreate('Admin');
});

test('booking creates a visit_request Lead and a linked Visit with the property owner denormalized, then dispatches VisitBooked', function () {
    Notification::fake();
    Event::fake([VisitBooked::class]);

    $property = new Property(['commercial_id' => 42]);
    $property->id = 7;

    $properties = Mockery::mock(PropertyRepositoryInterface::class);
    $properties->shouldReceive('find')->with(7)->andReturn($property);

    $createdLead = (new Lead)->forceFill(['id' => 100]);
    $leads = Mockery::mock(LeadRepositoryInterface::class);
    $leads->shouldReceive('create')->once()->with(Mockery::on(function (array $attrs) {
        return $attrs['type'] === 'visit_request'
            && $attrs['property_id'] === 7
            && $attrs['commercial_id'] === 42
            && $attrs['name'] === 'Test Visitor';
    }))->andReturn($createdLead);

    $createdVisit = (new Visit)->forceFill(['id' => 55]);
    $visits = Mockery::mock(VisitRepositoryInterface::class);
    $visits->shouldReceive('create')->once()->with(Mockery::on(function (array $attrs) {
        return $attrs['lead_id'] === 100
            && $attrs['property_id'] === 7
            && $attrs['commercial_id'] === 42
            && $attrs['scheduled_at'] === '2027-09-23T09:00:00Z';
    }))->andReturn($createdVisit);

    $action = new CreateVisitAction($leads, $properties, $visits);

    $result = $action->execute([
        'name' => 'Test Visitor',
        'email' => 't@example.com',
        'phone' => '+212612345678',
        'property_id' => 7,
        'scheduled_at' => '2027-09-23T09:00:00Z',
    ]);

    expect($result->id)->toBe(55);
    Event::assertDispatched(VisitBooked::class, fn ($event) => $event->visitId === 55);
});

test('a property with no owning commercial leaves commercial_id null on both rows', function () {
    Notification::fake();
    Event::fake([VisitBooked::class]);

    $property = new Property(['commercial_id' => null]);
    $property->id = 8;

    $properties = Mockery::mock(PropertyRepositoryInterface::class);
    $properties->shouldReceive('find')->with(8)->andReturn($property);

    $leads = Mockery::mock(LeadRepositoryInterface::class);
    $leads->shouldReceive('create')->once()->with(Mockery::on(fn (array $attrs) => $attrs['commercial_id'] === null))
        ->andReturn((new Lead)->forceFill(['id' => 101]));

    $visits = Mockery::mock(VisitRepositoryInterface::class);
    $visits->shouldReceive('create')->once()->with(Mockery::on(fn (array $attrs) => $attrs['commercial_id'] === null))
        ->andReturn((new Visit)->forceFill(['id' => 56]));

    (new CreateVisitAction($leads, $properties, $visits))->execute([
        'name' => 'Test Visitor',
        'email' => 't@example.com',
        'phone' => '+212612345678',
        'property_id' => 8,
        'scheduled_at' => '2027-09-23T09:00:00Z',
    ]);
});
