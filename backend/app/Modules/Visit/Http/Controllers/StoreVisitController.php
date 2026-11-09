<?php

namespace App\Modules\Visit\Http\Controllers;

use App\Core\Support\Http\ApiResponse;
use App\Modules\Visit\Application\Actions\CreateVisitAction;
use App\Modules\Visit\Http\Requests\StoreVisitRequest;
use App\Modules\Visit\Http\Resources\VisitConfirmationResource;
use Illuminate\Http\JsonResponse;

/**
 * Single-action controller, public and throttled - mirrors
 * StoreLeadController/StorePropertyAlertController's style. This is the
 * module's only public action.
 */
class StoreVisitController
{
    public function __construct(private readonly CreateVisitAction $action) {}

    public function __invoke(StoreVisitRequest $request): JsonResponse
    {
        $visit = $this->action->execute($request->validated());

        return ApiResponse::success(new VisitConfirmationResource($visit), status: 201);
    }
}
