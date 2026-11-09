<?php

namespace App\Modules\SocialPublishing\Domain\Contracts;

use App\Core\Support\Contracts\RepositoryInterface;
use App\Modules\SocialPublishing\Domain\Enums\SocialPlatform;
use App\Modules\SocialPublishing\Domain\Models\SocialAccount;
use App\Modules\SocialPublishing\Domain\Models\SocialSetting;

interface SocialAccountRepositoryInterface extends RepositoryInterface
{
    public function forPlatform(SocialPlatform $platform): ?SocialAccount;

    public function connect(SocialPlatform $platform, string $externalId, string $name, string $token, ?int $connectedBy): SocialAccount;

    /** @param  array<int, SocialPlatform>  $keep */
    public function disconnectExcept(array $keep): void;

    public function markAllNeedReconnect(): void;

    public function settings(): SocialSetting;

    /** @param  array<string, mixed>  $attributes */
    public function updateSettings(array $attributes): SocialSetting;
}
