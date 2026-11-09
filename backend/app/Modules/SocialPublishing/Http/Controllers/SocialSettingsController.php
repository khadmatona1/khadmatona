<?php

namespace App\Modules\SocialPublishing\Http\Controllers;

use App\Core\Support\Http\ApiResponse;
use App\Modules\SocialPublishing\Application\CaptionBuilder;
use App\Modules\SocialPublishing\Domain\Contracts\MetaGraphClient;
use App\Modules\SocialPublishing\Domain\Contracts\SocialAccountRepositoryInterface;
use App\Modules\SocialPublishing\Domain\Enums\PublishMode;
use App\Modules\SocialPublishing\Domain\Enums\SocialPlatform;
use App\Modules\SocialPublishing\Http\Requests\UpdateSocialSettingsRequest;
use Illuminate\Http\JsonResponse;

class SocialSettingsController
{
    public function __construct(
        private readonly SocialAccountRepositoryInterface $accounts,
        private readonly MetaGraphClient $meta,
    ) {}

    public function show(): JsonResponse
    {
        return ApiResponse::success($this->payload());
    }

    public function update(UpdateSocialSettingsRequest $request): JsonResponse
    {
        $attributes = $request->validated();
        $settings = $this->accounts->settings();

        // Stamped on each off -> on transition: only listings created from
        // this moment on can post through the defaults.
        $turningAutoOn = $attributes['default_mode'] === PublishMode::Auto->value
            && $settings->default_mode !== PublishMode::Auto;

        if ($turningAutoOn) {
            $attributes['auto_enabled_at'] = now();
        }

        $this->accounts->updateSettings($attributes);

        return ApiResponse::success($this->payload());
    }

    /** @return array<string, mixed> Never includes a token. */
    private function payload(): array
    {
        $settings = $this->accounts->settings();

        return [
            'app_configured' => $this->meta->isConfigured(),
            'accounts' => collect(SocialPlatform::cases())->mapWithKeys(function (SocialPlatform $platform) {
                $account = $this->accounts->forPlatform($platform);

                return [$platform->value => $account === null ? null : [
                    'external_id' => $account->external_id,
                    'name' => $account->name,
                    'status' => $account->status->value,
                    'connected_at' => $account->updated_at,
                ]];
            }),
            'settings' => [
                'facebook_enabled' => $settings->facebook_enabled,
                'instagram_enabled' => $settings->instagram_enabled,
                'default_facebook' => $settings->default_facebook,
                'default_instagram' => $settings->default_instagram,
                'default_mode' => $settings->default_mode->value,
                'caption_template' => $settings->caption_template,
                'facebook_max_images' => $settings->facebook_max_images,
                'instagram_max_images' => $settings->instagram_max_images,
            ],
            'default_caption_template' => CaptionBuilder::DEFAULT_TEMPLATE,
        ];
    }
}
