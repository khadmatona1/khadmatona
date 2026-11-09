<?php

namespace App\Modules\Property\Http\Controllers;

use App\Core\Support\Http\ApiResponse;
use App\Modules\Property\Domain\Contracts\PropertyRepositoryInterface;
use Illuminate\Http\JsonResponse;

/**
 * Real, database-computed figures for the dashboard overview - see
 * EloquentPropertyRepository::dashboardStats() for the aggregation itself.
 */
class PropertyStatsController
{
    public function __construct(private readonly PropertyRepositoryInterface $properties) {}

    public function __invoke(): JsonResponse
    {
        $stats = $this->properties->dashboardStats();

        return ApiResponse::success([
            'total_properties' => array_sum($stats['status_counts']),
            'available_properties' => $stats['status_counts']['disponible'],
            'sold_properties' => $stats['status_counts']['vendu'],
            'rented_properties' => $stats['status_counts']['loue'],
            'reserved_properties' => $stats['status_counts']['reserve'],
            'new_properties_this_month' => $stats['new_this_month'],
            // Stored as integer cents - converted to MAD here, same boundary
            // PropertyResource/PropertyController::toAttributes() already
            // cross. Explicit float cast: PHP's `/` returns an int when the
            // division happens to be exact, which would make this field's
            // JSON type flip unpredictably between int and float.
            'monthly_revenue' => (float) $stats['revenue_this_month'] / 100,
            'monthly_trend' => $stats['monthly_trend'],
        ]);
    }
}
