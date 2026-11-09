<?php

namespace App\Modules\PropertyAlert\Http\Controllers;

use App\Core\Support\Http\ApiResponse;
use App\Modules\PropertyAlert\Domain\Contracts\PropertyAlertRepositoryInterface;
use App\Modules\PropertyAlert\Domain\Models\PropertyAlert;
use App\Modules\PropertyAlert\Http\Filters\PropertyAlertFilter;
use App\Modules\PropertyAlert\Http\Resources\PropertyAlertResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Admin-only visibility into saved alerts - read + delete, no per-instance
 * authorization needed (no ownership concept), gated entirely by this
 * module's routes.php (auth:sanctum + role:Admin).
 */
class PropertyAlertController
{
    public function __construct(private readonly PropertyAlertRepositoryInterface $alerts) {}

    public function index(Request $request, PropertyAlertFilter $filter): JsonResponse
    {
        $alerts = $filter->apply()->paginate($request->integer('per_page', 15));

        return ApiResponse::success(
            PropertyAlertResource::collection($alerts)->resolve(),
            ['pagination' => [
                'current_page' => $alerts->currentPage(),
                'last_page' => $alerts->lastPage(),
                'per_page' => $alerts->perPage(),
                'total' => $alerts->total(),
            ]]
        );
    }

    public function destroy(PropertyAlert $propertyAlert): JsonResponse
    {
        $this->alerts->delete($propertyAlert);

        return ApiResponse::success();
    }
}
