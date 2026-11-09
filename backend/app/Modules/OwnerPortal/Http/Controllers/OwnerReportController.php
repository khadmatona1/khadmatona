<?php

namespace App\Modules\OwnerPortal\Http\Controllers;

use App\Core\Support\Http\ApiResponse;
use App\Modules\Lead\Domain\Contracts\LeadRepositoryInterface;
use App\Modules\Property\Domain\Contracts\PropertyRepositoryInterface;
use App\Modules\Visit\Domain\Contracts\VisitRepositoryInterface;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * "Rapports mensuels" - leads + completed visits per month, aggregated
 * across every property the caller owns, last 12 months.
 */
class OwnerReportController
{
    public function __construct(
        private readonly PropertyRepositoryInterface $properties,
        private readonly LeadRepositoryInterface $leads,
        private readonly VisitRepositoryInterface $visits,
    ) {}

    public function monthly(Request $request): JsonResponse
    {
        // Owners realistically have a handful of properties - a single
        // generously-sized page is effectively "all of them" here (the
        // normally-paginated paginateForOwner() is for the property LIST
        // view, not this aggregate).
        $propertyIds = $this->properties
            ->paginateForOwner($request->user()->contact_id, 1000)
            ->pluck('id')
            ->all();

        $leadMonths = $this->leads->monthlyCountsForPropertyIds($propertyIds);
        $visitMonths = $this->visits->monthlyCompletedCountsForPropertyIds($propertyIds);

        $months = collect($leadMonths)->map(function (array $leadMonth, int $index) use ($visitMonths) {
            return [
                'month' => $leadMonth['month'],
                'leads_count' => $leadMonth['count'],
                'completed_visits_count' => $visitMonths[$index]['count'] ?? 0,
            ];
        })->values()->all();

        return ApiResponse::success(['months' => $months]);
    }
}
