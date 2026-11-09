<?php

namespace App\Modules\Property\Http\Controllers;

use App\Core\Notification\Notifications\NewPropertyPendingApproval;
use App\Core\Support\Http\ApiResponse;
use App\Models\User;
use App\Modules\Property\Domain\Contracts\PropertyRepositoryInterface;
use App\Modules\Property\Domain\Enums\PropertyApprovalStatus;
use App\Modules\Property\Domain\Enums\PropertyStatus;
use App\Modules\Property\Domain\Events\PropertyApproved;
use App\Modules\Property\Domain\Events\PropertySocialPreferencesSubmitted;
use App\Modules\Property\Domain\Models\Property;
use App\Modules\Property\Http\Filters\PropertyFilter;
use App\Modules\Property\Http\Requests\RejectPropertyRequest;
use App\Modules\Property\Http\Requests\StorePropertyRequest;
use App\Modules\Property\Http\Requests\UpdatePropertyRequest;
use App\Modules\Property\Http\Resources\DashboardPropertyResource;
use App\Modules\Property\Http\Resources\PropertyResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Notifications\DatabaseNotification;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Notification;
use Spatie\MediaLibrary\MediaCollections\Models\Media;

/**
 * Simple CRUD only, per the current MVP scope - no Service/Action layer per
 * PROJECT_RULES.md §6's carve-out for modules with no business logic beyond
 * CRUD ("may skip the Service layer entirely and call the Repository
 * directly from the controller").
 */
class PropertyController
{
    public function __construct(private readonly PropertyRepositoryInterface $properties) {}

    public function index(Request $request, PropertyFilter $filter): JsonResponse
    {
        // Public route: only approved, available listings, regardless
        // of PropertyFilter's own (guest-safe) scoping. Deliberately
        // redundant with the filter's own guest branch: this endpoint's
        // visibility must never depend on how a session happens to
        // resolve, so it's pinned here explicitly too.
        $properties = $filter->apply()
            ->where('approval_status', PropertyApprovalStatus::Approved->value)
            ->where('status', PropertyStatus::Disponible->value)
            ->paginate($request->integer('per_page', 15));

        return ApiResponse::success(
            PropertyResource::collection($properties)->resolve(),
            ['pagination' => [
                'current_page' => $properties->currentPage(),
                'last_page' => $properties->lastPage(),
                'per_page' => $properties->perPage(),
                'total' => $properties->total(),
            ]]
        );
    }

    /**
     * Authenticated dashboard listing - Admin sees every property, a
     * Commercial only their own (any approval_status), enforced entirely
     * by PropertyFilter's row-level scoping, not by anything in this
     * method. auth:sanctum on this route guarantees $request->user() is
     * always populated.
     */
    public function dashboardIndex(Request $request, PropertyFilter $filter): JsonResponse
    {
        $properties = $filter->apply()->paginate($request->integer('per_page', 15));

        return ApiResponse::success(
            DashboardPropertyResource::collection($properties)->resolve(),
            ['pagination' => [
                'current_page' => $properties->currentPage(),
                'last_page' => $properties->lastPage(),
                'per_page' => $properties->perPage(),
                'total' => $properties->total(),
            ]]
        );
    }

    public function dashboardShow(Property $property): JsonResponse
    {
        Gate::authorize('view', $property);

        return ApiResponse::success(new DashboardPropertyResource($property));
    }

    /**
     * Faceted-search counts for the filter UI: for each filterable dimension
     * (city_id/type/status), how many properties would match if that value
     * were selected *in addition to* whichever other filters are already
     * active - not a plain global tally. Each dimension re-runs PropertyFilter
     * with that one dimension's own filter removed (so picking a city doesn't
     * just count itself against itself) but every other active filter kept,
     * then groups/counts on top - reusing index()'s exact allow-listed
     * filter logic rather than hand-parsing the query string a second time.
     */
    public function facets(Request $request): JsonResponse
    {
        $facets = [];

        foreach (['city_id', 'type', 'status'] as $dimension) {
            $query = $request->query();
            unset($query['filter'][$dimension]);

            $scopedRequest = Request::create($request->url(), 'GET', $query);

            // ->toBase() both drops to a plain query builder (so grouped
            // scalar column values come back as plain strings/ints instead
            // of the type/status Eloquent enum casts - those can't be used
            // as array/Collection keys) and explicitly re-applies Eloquent's
            // global scopes first (SoftDeletes' `whereNull(deleted_at)`),
            // which otherwise only happen lazily on execution.
            $facets[$dimension] = (new PropertyFilter($scopedRequest))
                ->apply()
                ->where('approval_status', PropertyApprovalStatus::Approved->value)
                ->where('status', PropertyStatus::Disponible->value)
                ->toBase()
                ->select($dimension)
                ->selectRaw('count(*) as aggregate')
                ->groupBy($dimension)
                ->pluck('aggregate', $dimension);
        }

        return ApiResponse::success($facets);
    }

    public function store(StorePropertyRequest $request): JsonResponse
    {
        [$attributes, $images] = $this->splitImages($request->validated());
        $social = $attributes['social'] ?? null;
        unset($attributes['social']);
        $attributes = $this->applyOwnership($request, $attributes, isNewRecord: true);

        // refresh(): an Admin-created listing gets approval_status from the
        // column default, which create() doesn't load back - without it the
        // Approved check below never matches for them.
        $property = $this->properties->create($this->toAttributes($attributes))->refresh();
        $this->attachImages($property, $images);

        // Before PropertyApproved below, which reads this choice.
        if ($social !== null && $request->user()?->hasRole('Admin')) {
            PropertySocialPreferencesSubmitted::dispatch($property->id, $social);
        }

        // Only a plain Commercial's submission needs an Admin to look at
        // it - a SeniorCommercial's listing is already approved by this
        // point (applyOwnership()) and an Admin-created one never entered
        // the queue at all, so neither should page anyone.
        if ($property->approval_status === PropertyApprovalStatus::PendingApproval) {
            $this->notifyAdminsOfPendingApproval($property);
        }

        // A brand-new record is never a re-fire concern (there's no prior
        // state to compare against) - fires for a SeniorCommercial's
        // auto-approved listing and an Admin-created one (approval_status
        // defaults to Approved), never for a plain Commercial's, which
        // enters the queue above instead.
        if ($property->approval_status === PropertyApprovalStatus::Approved) {
            PropertyApproved::dispatch($property->id);
        }

        return ApiResponse::success(
            new DashboardPropertyResource($property->fresh(['city', 'district', 'media', 'commercial'])),
            status: 201,
        );
    }

    /**
     * Public route: only approved, available listings regardless of
     * who's asking, same reasoning as index(). A pending/rejected property
     * ID simply doesn't exist as far as this endpoint is concerned, so it
     * 404s rather than exposing its existence.
     */
    public function show(Property $property): JsonResponse
    {
        abort_unless($property->approval_status === PropertyApprovalStatus::Approved, 404);
        abort_unless($property->status === PropertyStatus::Disponible, 404);

        return ApiResponse::success(new PropertyResource($property));
    }

    public function update(UpdatePropertyRequest $request, Property $property): JsonResponse
    {
        Gate::authorize('update', $property);

        // Captured before the update mutates $property in place - the only
        // way to tell "this edit just put it back in the queue" apart from
        // "it was already sitting in the queue and this is just another
        // edit while waiting" (the latter must not re-notify Admin for a
        // property they haven't even reviewed yet). Same reasoning for
        // $wasApproved below: an edit that keeps an already-approved
        // property approved must not re-fire PropertyApproved and
        // re-notify every matching alert on every save.
        $wasPending = $property->approval_status === PropertyApprovalStatus::PendingApproval;
        $wasApproved = $property->approval_status === PropertyApprovalStatus::Approved;

        [$attributes, $images] = $this->splitImages($request->validated());
        $attributes = $this->applyOwnership($request, $attributes, isNewRecord: false);

        $property = $this->properties->update($property, $this->toAttributes($attributes));
        $this->attachImages($property, $images);

        // A Commercial's edit to an already-approved/rejected listing
        // resets it to pending_approval (applyOwnership()) - Admin needs
        // the same heads-up as a brand-new submission, but only on that
        // actual transition into the queue.
        if ($property->approval_status === PropertyApprovalStatus::PendingApproval && ! $wasPending) {
            $this->notifyAdminsOfPendingApproval($property);
        }

        // Only the actual pending/rejected -> approved transition (a
        // SeniorCommercial's edit, which skips the review queue) - never a
        // no-op save that leaves an already-approved property approved.
        if ($property->approval_status === PropertyApprovalStatus::Approved && ! $wasApproved) {
            PropertyApproved::dispatch($property->id);
        }

        return ApiResponse::success(
            new DashboardPropertyResource($property->fresh(['city', 'district', 'media', 'commercial'])),
        );
    }

    public function destroy(Property $property): JsonResponse
    {
        Gate::authorize('delete', $property);

        $this->properties->delete($property);

        return ApiResponse::success();
    }

    public function approve(Property $property): JsonResponse
    {
        Gate::authorize('approve', $property);

        $property = $this->properties->update($property, [
            'approval_status' => PropertyApprovalStatus::Approved,
            'rejection_reason' => null,
        ]);
        $this->clearPendingApprovalNotification($property);
        PropertyApproved::dispatch($property->id);

        return ApiResponse::success(new DashboardPropertyResource($property->fresh(['city', 'district', 'media', 'commercial'])));
    }

    public function reject(RejectPropertyRequest $request, Property $property): JsonResponse
    {
        Gate::authorize('reject', $property);

        $property = $this->properties->update($property, [
            'approval_status' => PropertyApprovalStatus::Rejected,
            'rejection_reason' => $request->validated('rejection_reason'),
        ]);
        $this->clearPendingApprovalNotification($property);

        return ApiResponse::success(new DashboardPropertyResource($property->fresh(['city', 'district', 'media', 'commercial'])));
    }

    /**
     * Shared by store() (a brand-new submission) and update() (an edit that
     * puts an already-approved/rejected listing back into the queue) -
     * either way, it's a property an Admin now needs to look at.
     */
    private function notifyAdminsOfPendingApproval(Property $property): void
    {
        Notification::send(User::role('Admin')->get(), new NewPropertyPendingApproval($property));
    }

    /**
     * Deletes the "new property pending approval" notification(s) tied to
     * this property once an Admin has actually acted on it (approve or
     * reject) - it stays relevant only while the property is still
     * pending, so it's cleared from every Admin's bell regardless of which
     * Admin handled it or where they opened the property from (the
     * notification popup, the properties list, a direct link...).
     */
    private function clearPendingApprovalNotification(Property $property): void
    {
        DatabaseNotification::where('type', NewPropertyPendingApproval::class)
            ->get()
            ->filter(fn (DatabaseNotification $notification) => ($notification->data['property_id'] ?? null) === $property->id)
            ->each(fn (DatabaseNotification $notification) => $notification->delete());
    }

    /**
     * Server-controlled ownership/moderation fields - never trusted from
     * the request body. A Commercial creating or editing a property is
     * always forced to pending_approval, owned by themselves. A
     * SeniorCommercial is also forced to own(er)ship = themselves, but
     * skips the review queue entirely - their listings go straight to
     * approved, on create and on edit, since the whole point of the role
     * is not needing Admin sign-off. Admin may freely assign/reassign
     * `commercial_id` (the one field StorePropertyRequest/
     * UpdatePropertyRequest do validate), but never sets approval_status
     * this way - that's exclusively approve()/reject().
     *
     * @param  array<string, mixed>  $attributes
     * @return array<string, mixed>
     */
    private function applyOwnership(Request $request, array $attributes, bool $isNewRecord): array
    {
        $user = $request->user();
        unset($attributes['approval_status']);

        if ($user?->hasRole('SeniorCommercial')) {
            $attributes['commercial_id'] = $user->id;
            $attributes['approval_status'] = PropertyApprovalStatus::Approved;
            $attributes['rejection_reason'] = null;

            return $attributes;
        }

        if ($user?->hasRole('Commercial')) {
            $attributes['commercial_id'] = $user->id;
            $attributes['approval_status'] = PropertyApprovalStatus::PendingApproval;
            $attributes['rejection_reason'] = null;

            return $attributes;
        }

        // Admin: leave `commercial_id` as submitted (assignment), and never
        // touch approval_status/rejection_reason here.
        unset($attributes['rejection_reason']);
        if ($isNewRecord && ! array_key_exists('commercial_id', $attributes)) {
            $attributes['commercial_id'] = null;
        }

        return $attributes;
    }

    /**
     * Removes a single photo from a property's gallery without touching
     * the rest of the record - route-model-bound Media must actually
     * belong to the given Property, otherwise this 404s (implicit scoping
     * via the route's {property}/{media} nesting, checked explicitly here
     * since Spatie's Media model has no built-in route-scoping support).
     */
    public function destroyImage(Property $property, Media $media): JsonResponse
    {
        Gate::authorize('update', $property);

        abort_unless($media->model_type === Property::class && $media->model_id === $property->id, 404);

        $media->delete();

        return ApiResponse::success();
    }

    /**
     * @param  array<string, mixed>  $validated
     * @return array{0: array<string, mixed>, 1: array<int, UploadedFile>}
     */
    private function splitImages(array $validated): array
    {
        $images = $validated['images'] ?? [];
        unset($validated['images']);

        return [$validated, $images];
    }

    /**
     * @param  array<int, UploadedFile>  $images
     */
    private function attachImages(Property $property, array $images): void
    {
        foreach ($images as $image) {
            $property->addMedia($image)->toMediaCollection('gallery');
        }
    }

    /**
     * @param  array<string, mixed>  $validated
     * @return array<string, mixed>
     */
    private function toAttributes(array $validated): array
    {
        // The API speaks MAD (decimal); the database stores integer cents
        // (PROJECT_RULES.md §13) - this is the one place that boundary is
        // crossed on the way in, mirroring PropertyResource on the way out.
        if (array_key_exists('price', $validated)) {
            $validated['price'] = (int) round($validated['price'] * 100);
        }

        return $validated;
    }
}
