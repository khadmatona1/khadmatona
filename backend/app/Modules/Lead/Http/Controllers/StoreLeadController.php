<?php

namespace App\Modules\Lead\Http\Controllers;

use App\Core\Support\Http\ApiResponse;
use App\Modules\Lead\Application\Actions\CreateLeadAction;
use App\Modules\Lead\Http\Requests\StoreLeadRequest;
use App\Modules\Lead\Http\Resources\LeadResource;
use App\Modules\Property\Domain\Contracts\PropertyRepositoryInterface;
use Illuminate\Http\JsonResponse;

/**
 * Single-action controller mirroring Core/Auth's style (LoginController,
 * RegisterController, ...) - capturing a lead is the module's only public
 * action. Creation and optional photo attachments are committed together
 * by CreateLeadAction.
 *
 * Depends on Property's repository *interface* (a Domain contract), not
 * its Eloquent model - the sanctioned cross-module mechanism per
 * PROJECT_RULES.md §3, used here to denormalize which Commercial a
 * visit_request lead belongs to at creation time.
 */
class StoreLeadController
{
    public function __construct(
        private readonly CreateLeadAction $createLead,
        private readonly PropertyRepositoryInterface $properties,
    ) {}

    public function __invoke(StoreLeadRequest $request): JsonResponse
    {
        $data = $request->validated();

        // Only visit_request leads carry a real property_id - sell_request/
        // rent_request/contact leads describe a property that isn't in the
        // catalog, so they stay commercial_id = null (Admin-only visible),
        // matching the spec's scope exactly.
        if (! empty($data['property_id'])) {
            $property = $this->properties->find($data['property_id']);
            $data['commercial_id'] = $property?->commercial_id;
        }

        $lead = $this->createLead->execute($data);

        return ApiResponse::success(new LeadResource($lead), status: 201);
    }
}
