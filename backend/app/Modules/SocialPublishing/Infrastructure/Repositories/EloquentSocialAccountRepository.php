<?php

namespace App\Modules\SocialPublishing\Infrastructure\Repositories;

use App\Core\Support\Repositories\BaseRepository;
use App\Modules\SocialPublishing\Domain\Contracts\SocialAccountRepositoryInterface;
use App\Modules\SocialPublishing\Domain\Enums\SocialAccountStatus;
use App\Modules\SocialPublishing\Domain\Enums\SocialPlatform;
use App\Modules\SocialPublishing\Domain\Models\SocialAccount;
use App\Modules\SocialPublishing\Domain\Models\SocialSetting;

class EloquentSocialAccountRepository extends BaseRepository implements SocialAccountRepositoryInterface
{
    protected function model(): string
    {
        return SocialAccount::class;
    }

    public function forPlatform(SocialPlatform $platform): ?SocialAccount
    {
        return SocialAccount::where('platform', $platform->value)->first();
    }

    public function connect(SocialPlatform $platform, string $externalId, string $name, string $token, ?int $connectedBy): SocialAccount
    {
        return SocialAccount::updateOrCreate(['platform' => $platform->value], [
            'external_id' => $externalId,
            'name' => $name,
            'access_token' => $token,
            'status' => SocialAccountStatus::Connected,
            'connected_by' => $connectedBy,
        ]);
    }

    public function disconnectExcept(array $keep): void
    {
        SocialAccount::query()
            ->whereNotIn('platform', array_map(fn (SocialPlatform $platform) => $platform->value, $keep))
            ->delete();
    }

    public function markAllNeedReconnect(): void
    {
        SocialAccount::query()->update(['status' => SocialAccountStatus::NeedsReconnect->value]);
    }

    public function settings(): SocialSetting
    {
        return SocialSetting::query()->first() ?? SocialSetting::create()->refresh();
    }

    public function updateSettings(array $attributes): SocialSetting
    {
        $settings = $this->settings();
        $settings->update($attributes);

        return $settings;
    }
}
