<?php

use App\Core\Support\Phone\PhoneNumber;

test('local, international and prefixed numbers normalize to E.164', function (?string $input, ?string $expected) {
    expect(PhoneNumber::toE164($input))->toBe($expected);
})->with([
    ['06 12 34 56 78', '+212612345678'],
    ['0612345678', '+212612345678'],
    ['612345678', '+212612345678'],
    ['+212 612-345-678', '+212612345678'],
    ['00212612345678', '+212612345678'],
    ['212612345678', '+212612345678'],
    ['whatsapp:+212612345678', '+212612345678'],
    ['+33 6 12 34 56 78', '+33612345678'],
    ['abc', null],
    ['', null],
    [null, null],
    ['+12', null],
]);

test('the match key is the last nine digits', function () {
    expect(PhoneNumber::matchKey('+212 612 345 678'))->toBe('612345678')
        ->and(PhoneNumber::matchKey('123'))->toBeNull();
});
