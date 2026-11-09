<?php

namespace App\Modules\SocialPublishing\Http\Controllers;

use App\Core\Support\Contracts\PropertyDirectory;
use App\Core\Support\Http\ApiResponse;
use App\Modules\SocialPublishing\Application\CaptionBuilder;
use App\Modules\SocialPublishing\Application\SocialPublishingService;
use App\Modules\SocialPublishing\Domain\Contracts\SocialAccountRepositoryInterface;
use App\Modules\SocialPublishing\Domain\Contracts\SocialPublicationRepositoryInterface;
use App\Modules\SocialPublishing\Domain\Models\SocialPublication;
use App\Modules\SocialPublishing\Http\Requests\PublishPropertyRequest;
use App\Modules\SocialPublishing\Http\Requests\UpdateSocialPreferencesRequest;
use App\Modules\SocialPublishing\Http\Resources\SocialPublicationResource;
use Illuminate\Http\JsonResponse;

class SocialPropertyController
{
    public function __construct(
        private readonly SocialPublicationRepositoryInterface $publications,
        private readonly SocialAccountRepositoryInterface $accounts,
        private readonly SocialPublishingService $publishing,
        private readonly PropertyDirectory $properties,
        private readonly CaptionBuilder $captions,
    ) {}

    public function show(int $propertyId): JsonResponse
    {
        return ApiResponse::success($this->payload($propertyId));
    }

    public function updatePreferences(UpdateSocialPreferencesRequest $request, int $propertyId): JsonResponse
    {
        abort_if($this->properties->socialListing($propertyId) === null, 404);

        $this->publications->savePreference($propertyId, $request->validated());

        return ApiResponse::success($this->payload($propertyId));
    }

    public function publish(PublishPropertyRequest $request, int $propertyId): JsonResponse
    {
        abort_if($this->properties->socialListing($propertyId) === null, 404);

        $this->publishing->publishNow($propertyId, $request->platforms());

        return ApiResponse::success($this->payload($propertyId), status: 202);
    }

    public function retry(SocialPublication $publication): JsonResponse
    {
        $this->publishing->retry($publication);

        return ApiResponse::success($this->payload($publication->property_id), status: 202);
    }

    /** @return array<string, mixed> */
    private function payload(int $propertyId): array
    {
        $listing = $this->properties->socialListing($propertyId);
        abort_if($listing === null, 404);

        $settings = $this->accounts->settings();
        $preference = $this->publications->preferenceFor($propertyId);

        return [
            'preferences' => [
                'facebook' => $preference->facebook ?? $settings->default_facebook,
                'instagram' => $preference->instagram ?? $settings->default_instagram,
                'mode' => ($preference->mode ?? $settings->default_mode)->value,
            ],
            'is_public' => $this->properties->isPubliclyAvailable($propertyId),
            'publications' => SocialPublicationResource::collection($this->publications->forProperty($propertyId))->resolve(),
            'caption_preview' => $this->captions->build($listing, $settings->caption_template),
        ];
    }
}
