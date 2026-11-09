<?php

namespace App\Modules\Reviews\Domain\Contracts;

interface ReviewsProviderInterface
{
    /**
     * Null when the integration isn't configured yet or the upstream call
     * fails - the homepage section simply doesn't render rather than
     * showing an error, since this is a non-critical enhancement.
     *
     * @return array{
     *     rating: float,
     *     total: int,
     *     reviews: list<array{
     *         author_name: string,
     *         profile_photo_url: string,
     *         rating: int,
     *         relative_time_description: string,
     *         text: string,
     *     }>,
     *     write_review_url: string,
     *     all_reviews_url: string,
     * }|null
     */
    public function getSummary(string $locale): ?array;
}
