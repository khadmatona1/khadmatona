<?php

use Tests\TestCase;

uses(TestCase::class);

test('all application routes compile for production with distinct rental resource names', function () {
    $routes = app('router')->getRoutes();

    // This is the same compilation used by artisan route:cache. It throws
    // when two resources share a name, even if their URL prefixes differ.
    $compiled = $routes->compile();

    expect($compiled['attributes']['properties.index']['uri'])->toBe('api/v1/properties')
        ->and($compiled['attributes']['rental.properties.index']['uri'])->toBe('api/v1/rental/properties')
        ->and($compiled['attributes']['rental.reservations.index']['uri'])->toBe('api/v1/rental/reservations');
});
