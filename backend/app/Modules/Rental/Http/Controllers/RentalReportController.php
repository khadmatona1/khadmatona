<?php

namespace App\Modules\Rental\Http\Controllers;

use App\Core\Support\Http\ApiResponse;
use App\Modules\Rental\Application\RentalDashboardService;
use App\Modules\Rental\Application\RentalStatementService;
use App\Modules\Rental\Http\Requests\RentalStatementRequest;
use Illuminate\Http\JsonResponse;

/**
 * Admin read-only views: the day-to-day dashboard and the monthly
 * owner / KHADMATONA statement. Aggregate payloads, same pattern as
 * PropertyStatsController.
 */
class RentalReportController
{
    public function __construct(
        private readonly RentalDashboardService $dashboard,
        private readonly RentalStatementService $statements,
    ) {}

    public function dashboard(): JsonResponse
    {
        return ApiResponse::success($this->dashboard->overview());
    }

    public function statement(RentalStatementRequest $request): JsonResponse
    {
        return ApiResponse::success($this->statements->forMonth($request->month(), withLines: true));
    }
}
