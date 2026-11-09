<?php

namespace App\Modules\Analytics\Http\Controllers;

use App\Core\Support\Http\ApiResponse;
use App\Modules\Analytics\Application\Jobs\ProcessTrackingBatchJob;
use App\Modules\Analytics\Domain\Data\TrackingBatch;
use App\Modules\Analytics\Http\Requests\CollectRequest;
use Illuminate\Http\JsonResponse;

/**
 * Public, unauthenticated, throttled tracker endpoint. Answers 202 before
 * any database work happens (ProcessTrackingBatchJob does that), so the
 * public site never waits on analytics.
 *
 * Only the geo header VALUES the proxy set are forwarded to the job. The
 * client IP address is used for rate limiting only and is never stored.
 */
class CollectController
{
    public function __invoke(CollectRequest $request): JsonResponse
    {
        if (config('analytics.enabled')) {
            $data = $request->validated();

            ProcessTrackingBatchJob::dispatch(new TrackingBatch(
                visitorUuid: strtolower($data['visitor_id']),
                sessionUuid: strtolower($data['session_id']),
                receivedAtMs: (int) floor(microtime(true) * 1000),
                sentAtMs: (int) $data['sent_at'],
                userAgent: mb_substr((string) $request->userAgent(), 0, 512),
                countryHeader: $this->firstHeader($request, config('analytics.geo_headers.country', [])),
                cityHeader: $this->firstHeader($request, config('analytics.geo_headers.city', [])),
                context: $data['context'] ?? [],
                events: $data['events'],
            ));
        }

        return ApiResponse::success(null, status: 202);
    }

    /**
     * @param  array<int, string>  $names
     */
    private function firstHeader(CollectRequest $request, array $names): ?string
    {
        foreach ($names as $name) {
            $value = $request->header(trim($name));
            if (is_string($value) && $value !== '') {
                return mb_substr($value, 0, 120);
            }
        }

        return null;
    }
}
