<?php

namespace App\Modules\Analytics\Http\Controllers;

use App\Core\Support\Http\ApiResponse;
use App\Modules\Analytics\Application\AnalyticsReportService;
use App\Modules\Analytics\Http\Requests\AnalyticsReportRequest;
use Illuminate\Http\JsonResponse;

/**
 * Admin-only reads (route middleware role:Admin). One service call per
 * action, aggregate payloads returned through ApiResponse, same pattern as
 * PropertyStatsController.
 */
class AnalyticsReportController
{
    public function __construct(private readonly AnalyticsReportService $reports) {}

    public function overview(AnalyticsReportRequest $request): JsonResponse
    {
        return ApiResponse::success($this->reports->overview($this->reports->resolveQuery($request->validated())));
    }

    public function sources(AnalyticsReportRequest $request): JsonResponse
    {
        return ApiResponse::success($this->reports->sources($this->reports->resolveQuery($request->validated())));
    }

    public function pages(AnalyticsReportRequest $request): JsonResponse
    {
        return ApiResponse::success($this->reports->pages($this->reports->resolveQuery($request->validated())));
    }

    public function properties(AnalyticsReportRequest $request): JsonResponse
    {
        return ApiResponse::success($this->reports->properties($this->reports->resolveQuery($request->validated())));
    }

    public function forms(AnalyticsReportRequest $request): JsonResponse
    {
        return ApiResponse::success($this->reports->forms($this->reports->resolveQuery($request->validated())));
    }

    public function events(AnalyticsReportRequest $request): JsonResponse
    {
        return ApiResponse::success($this->reports->events($this->reports->resolveQuery($request->validated())));
    }

    public function journeys(AnalyticsReportRequest $request): JsonResponse
    {
        $data = $request->validated();
        $result = $this->reports->journeys(
            $this->reports->resolveQuery($data),
            (int) ($data['per_page'] ?? 10),
            (int) ($data['page_number'] ?? 1),
        );

        return ApiResponse::success($result['items'], ['pagination' => $result['pagination']]);
    }

    public function realtime(): JsonResponse
    {
        return ApiResponse::success($this->reports->realtime());
    }
}
