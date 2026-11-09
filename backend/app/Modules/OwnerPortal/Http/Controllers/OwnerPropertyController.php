<?php

namespace App\Modules\OwnerPortal\Http\Controllers;

use App\Core\Support\Http\ApiResponse;
use App\Modules\Lead\Domain\Contracts\LeadRepositoryInterface;
use App\Modules\OwnerPortal\Http\Resources\OwnerPropertyResource;
use App\Modules\Property\Domain\Contracts\PropertyRepositoryInterface;
use App\Modules\Property\Domain\Models\Property;
use App\Modules\Visit\Domain\Contracts\VisitRepositoryInterface;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Read-only ("ghir iechof" - view only, no actions) - Espace Propriétaire.
 * Depends on Property's/Lead's/Visit's repository *interfaces* only, never
 * their Eloquent models directly (PROJECT_RULES.md §3), same cross-module
 * pattern CreateVisitAction already uses for two peer modules at once.
 */
class OwnerPropertyController
{
    public function __construct(
        private readonly PropertyRepositoryInterface $properties,
        private readonly LeadRepositoryInterface $leads,
        private readonly VisitRepositoryInterface $visits,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $properties = $this->properties->paginateForOwner(
            $request->user()->contact_id,
            $request->integer('per_page', 15),
        );

        $this->attachCounts($properties->items());

        return ApiResponse::success(
            OwnerPropertyResource::collection($properties)->resolve(),
            ['pagination' => [
                'current_page' => $properties->currentPage(),
                'last_page' => $properties->lastPage(),
                'per_page' => $properties->perPage(),
                'total' => $properties->total(),
            ]]
        );
    }

    public function show(Request $request, Property $property): JsonResponse
    {
        // 404, not 403 - never confirms another owner's property exists.
        abort_unless($property->owner_contact_id === $request->user()->contact_id, 404);

        $this->attachCounts([$property]);

        return ApiResponse::success(new OwnerPropertyResource($property));
    }

    /**
     * @param  array<int, Property>  $properties
     */
    private function attachCounts(array $properties): void
    {
        $ids = array_map(fn (Property $property) => $property->id, $properties);
        $leadCounts = $this->leads->countByPropertyIds($ids);
        $visitCounts = $this->visits->countCompletedByPropertyIds($ids);

        foreach ($properties as $property) {
            $property->setAttribute('leads_count', $leadCounts[$property->id] ?? 0);
            $property->setAttribute('completed_visits_count', $visitCounts[$property->id] ?? 0);
        }
    }
}
