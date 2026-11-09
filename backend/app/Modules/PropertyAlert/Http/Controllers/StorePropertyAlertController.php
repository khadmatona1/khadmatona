<?php

namespace App\Modules\PropertyAlert\Http\Controllers;

use App\Core\Support\Http\ApiResponse;
use App\Modules\PropertyAlert\Application\Actions\CreatePropertyAlertAction;
use App\Modules\PropertyAlert\Http\Requests\StorePropertyAlertRequest;
use App\Modules\PropertyAlert\Http\Resources\PropertyAlertResource;
use Illuminate\Http\JsonResponse;

/**
 * Single-action controller, mirrors StoreLeadController's style - this is
 * the module's only public action.
 */
class StorePropertyAlertController
{
    public function __invoke(StorePropertyAlertRequest $request, CreatePropertyAlertAction $action): JsonResponse
    {
        ['alert' => $alert, 'created' => $created] = $action->execute($request->validated());

        return ApiResponse::success(
            new PropertyAlertResource($alert),
            ['already_existed' => ! $created],
            status: $created ? 201 : 200,
        );
    }
}
