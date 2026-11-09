<?php

namespace App\Modules\Contact\Http\Controllers;

use App\Core\Support\Http\ApiResponse;
use App\Modules\Contact\Domain\Contracts\ContactRepositoryInterface;
use App\Modules\Contact\Domain\Models\Contact;
use App\Modules\Contact\Http\Filters\ContactFilter;
use App\Modules\Contact\Http\Requests\StoreContactRequest;
use App\Modules\Contact\Http\Requests\UpdateContactRequest;
use App\Modules\Contact\Http\Resources\ContactResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

/**
 * Simple CRUD only - no Service/Action layer, same carve-out
 * PropertyController/LeadController use (PROJECT_RULES.md §6). No public
 * route exists at all: every method sits behind auth:sanctum +
 * role:Admin|Commercial|SeniorCommercial.
 */
class ContactController
{
    public function __construct(private readonly ContactRepositoryInterface $contacts) {}

    public function index(Request $request, ContactFilter $filter): JsonResponse
    {
        $contacts = $filter->apply()
            ->with('commercial')
            ->paginate($request->integer('per_page', 15));

        return ApiResponse::success(
            ContactResource::collection($contacts)->resolve(),
            ['pagination' => [
                'current_page' => $contacts->currentPage(),
                'last_page' => $contacts->lastPage(),
                'per_page' => $contacts->perPage(),
                'total' => $contacts->total(),
            ]]
        );
    }

    public function show(Contact $contact): JsonResponse
    {
        Gate::authorize('view', $contact);

        return ApiResponse::success(new ContactResource($contact->load('commercial')));
    }

    public function store(StoreContactRequest $request): JsonResponse
    {
        $attributes = $this->applyOwnership($request, $request->validated(), isNewRecord: true);

        $contact = $this->contacts->create($attributes);

        return ApiResponse::success(
            new ContactResource($contact->fresh('commercial')),
            status: 201,
        );
    }

    public function update(UpdateContactRequest $request, Contact $contact): JsonResponse
    {
        Gate::authorize('update', $contact);

        $attributes = $this->applyOwnership($request, $request->validated(), isNewRecord: false);

        $contact = $this->contacts->update($contact, $attributes);

        return ApiResponse::success(new ContactResource($contact->fresh('commercial')));
    }

    public function destroy(Contact $contact): JsonResponse
    {
        Gate::authorize('delete', $contact);

        $this->contacts->delete($contact);

        return ApiResponse::success();
    }

    /**
     * Server-controlled ownership - never trusted from the request body. A
     * Commercial/SeniorCommercial creating or editing a contact is always
     * forced to own it themselves; only an Admin may freely assign/reassign
     * `commercial_id` (the one field Store/UpdateContactRequest do
     * validate). Mirrors PropertyController::applyOwnership() exactly.
     *
     * @param  array<string, mixed>  $attributes
     * @return array<string, mixed>
     */
    private function applyOwnership(Request $request, array $attributes, bool $isNewRecord): array
    {
        $user = $request->user();

        if ($user?->hasAnyRole(['Commercial', 'SeniorCommercial'])) {
            $attributes['commercial_id'] = $user->id;

            return $attributes;
        }

        if ($isNewRecord && ! array_key_exists('commercial_id', $attributes)) {
            $attributes['commercial_id'] = null;
        }

        return $attributes;
    }
}
