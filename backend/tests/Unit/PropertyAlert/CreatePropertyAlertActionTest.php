<?php

use App\Modules\PropertyAlert\Application\Actions\CreatePropertyAlertAction;
use App\Modules\PropertyAlert\Domain\Contracts\PropertyAlertRepositoryInterface;
use App\Modules\PropertyAlert\Domain\Models\PropertyAlert;
use Tests\TestCase;

// A fully mocked repository means no database is touched here - this stays
// a true unit test of the fingerprinting/normalization business rule, per
// PROJECT_RULES.md §16 ("unit tests cover Application-layer business rules
// against mocked Repository interfaces"). Extends Tests\TestCase (rather
// than the Feature suite's RefreshDatabase-bound base) purely so the
// container is booted for app()->getLocale().
uses(TestCase::class);

test('the fingerprint is stable regardless of criteria key order', function () {
    $repository = Mockery::mock(PropertyAlertRepositoryInterface::class);
    $repository->shouldReceive('findByFingerprint')->twice()->andReturnNull();
    $repository->shouldReceive('create')->twice()->andReturnUsing(
        fn (array $attributes) => (new PropertyAlert)->forceFill($attributes),
    );

    $action = new CreatePropertyAlertAction($repository);

    $a = $action->execute(['phone' => '+212612345678', 'city_id' => 1, 'surface_min' => 80]);
    $b = $action->execute(['phone' => '+212612345678', 'surface_min' => 80, 'city_id' => 1]);

    expect($a['alert']->fingerprint_hash)->toBe($b['alert']->fingerprint_hash);
});

test('the phone is normalized to E.164 before hashing', function () {
    $repository = Mockery::mock(PropertyAlertRepositoryInterface::class);
    $repository->shouldReceive('findByFingerprint')->twice()->andReturnNull();
    $repository->shouldReceive('create')->twice()->andReturnUsing(
        fn (array $attributes) => (new PropertyAlert)->forceFill($attributes),
    );

    $action = new CreatePropertyAlertAction($repository);

    $a = $action->execute(['phone' => '0612345678']);
    $b = $action->execute(['phone' => '+212612345678']);

    expect($a['alert']->phone_e164)->toBe('+212612345678');
    expect($a['alert']->fingerprint_hash)->toBe($b['alert']->fingerprint_hash);
});

test('a duplicate fingerprint returns the existing alert without creating a new one', function () {
    $existing = (new PropertyAlert)->forceFill(['id' => 42, 'phone_e164' => '+212612345678']);

    $repository = Mockery::mock(PropertyAlertRepositoryInterface::class);
    $repository->shouldReceive('findByFingerprint')->once()->andReturn($existing);
    $repository->shouldNotReceive('create');

    $action = new CreatePropertyAlertAction($repository);

    $result = $action->execute(['phone' => '+212612345678']);

    expect($result['created'])->toBeFalse();
    expect($result['alert'])->toBe($existing);
});
