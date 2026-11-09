<?php

namespace App\Core\Support\Contracts;

interface PropertyDirectory
{
    /** @return array<int, string> Historical titles, including archived properties. */
    public function titles(array $ids): array;

    /** @return array<int, array{id: int, title: string}> */
    public function search(string $search): array;

    public function isPubliclyAvailable(int $id): bool;

    public function bookingListings(array $ids, int $page, string $search): array;

    /**
     * Everything a social post needs, in French regardless of the request
     * locale. Null if the property doesn't exist.
     *
     * @return array{title: string, type: string, transaction_type: ?string, price_period: ?string, city: ?string, district: ?string, price_cents: int, surface: int, bedrooms: int, bathrooms: int, url: string, image_urls: array<int, string>, created_at: string}|null
     */
    public function socialListing(int $id): ?array;
}
