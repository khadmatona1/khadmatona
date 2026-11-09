<?php

namespace App\Modules\Rental\Http\Controllers;

use App\Core\Support\Http\ApiResponse;
use App\Modules\Rental\Application\OwnerRentalService;
use App\Modules\Rental\Http\Requests\RentalStatementRequest;
use App\Modules\Rental\Http\Resources\OwnerReservationResource;
use Illuminate\Http\JsonResponse;

/**
 * Espace Propriétaire (role:Owner): read-only rental revenue.
 */
class OwnerRentalController
{
    public function __construct(private readonly OwnerRentalService $owner) {}

    public function statement(RentalStatementRequest $request): JsonResponse
    {
        return ApiResponse::success($this->owner->statement($request->user()->contact_id, $request->month()));
    }

    public function reservations(RentalStatementRequest $request): JsonResponse
    {
        return ApiResponse::success(
            OwnerReservationResource::collection($this->owner->reservations($request->user()->contact_id, $request->month()))->resolve()
        );
    }
}
