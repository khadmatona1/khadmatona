<?php

namespace App\Modules\Reviews\Infrastructure;

use App\Modules\Reviews\Domain\Contracts\ReviewsProviderInterface;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Legacy Google Places API "Place Details" endpoint - still officially
 * supported alongside the newer Places API, and simpler for a single
 * read-only field set (rating, review count, up to 5 reviews) than the
 * newer API's field-mask header convention.
 *
 * Google caps the `reviews` field at 5 entries per call, with no way to
 * page through the rest via this API - that's why "Voir tous les avis"
 * links out to the real Google Maps listing instead of trying to paginate
 * locally past what Google actually returns here.
 */
class GooglePlacesReviewsProvider implements ReviewsProviderInterface
{
    private const ENDPOINT = 'https://maps.googleapis.com/maps/api/place/details/json';

    private const CACHE_TTL_HOURS = 6;

    public function getSummary(string $locale): ?array
    {
        $apiKey = config('services.google_places.api_key');
        $placeId = config('services.google_places.place_id');

        if (! $apiKey || ! $placeId) {
            return $this->maybeFake($locale);
        }

        return $this->fetch($apiKey, $placeId, $locale) ?? $this->maybeFake($locale);
    }

    // TEMPORARY - see FakeReviews's own doc block. Remove this method and
    // its two call sites above once SHOW_FAKE_REVIEWS is no longer needed.
    private function maybeFake(string $locale): ?array
    {
        return config('app.show_fake_reviews') ? FakeReviews::make($locale) : null;
    }

    private function fetch(string $apiKey, string $placeId, string $locale): ?array
    {
        return Cache::remember(
            "google_reviews:{$locale}",
            now()->addHours(self::CACHE_TTL_HOURS),
            function () use ($apiKey, $placeId, $locale) {
                try {
                    $response = Http::timeout(5)->get(self::ENDPOINT, [
                        'place_id' => $placeId,
                        'fields' => 'rating,user_ratings_total,reviews',
                        'language' => $locale,
                        'reviews_sort' => 'newest',
                        'key' => $apiKey,
                    ]);

                    if (! $response->successful() || $response->json('status') !== 'OK') {
                        Log::warning('Google Places reviews fetch failed', [
                            'status' => $response->json('status'),
                            'http_status' => $response->status(),
                        ]);

                        return null;
                    }

                    $result = $response->json('result', []);

                    return [
                        'rating' => (float) ($result['rating'] ?? 0),
                        'total' => (int) ($result['user_ratings_total'] ?? 0),
                        'reviews' => array_map(
                            fn (array $review): array => [
                                'author_name' => (string) ($review['author_name'] ?? ''),
                                'profile_photo_url' => (string) ($review['profile_photo_url'] ?? ''),
                                'rating' => (int) ($review['rating'] ?? 0),
                                'relative_time_description' => (string) ($review['relative_time_description'] ?? ''),
                                'text' => (string) ($review['text'] ?? ''),
                            ],
                            $result['reviews'] ?? [],
                        ),
                        'write_review_url' => "https://search.google.com/local/writereview?placeid={$placeId}",
                        'all_reviews_url' => "https://www.google.com/maps/place/?q=place_id:{$placeId}",
                    ];
                } catch (\Throwable $e) {
                    Log::warning('Google Places reviews fetch threw', ['message' => $e->getMessage()]);

                    return null;
                }
            },
        );
    }
}
