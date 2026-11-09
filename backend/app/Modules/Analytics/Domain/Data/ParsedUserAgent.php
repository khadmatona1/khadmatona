<?php

namespace App\Modules\Analytics\Domain\Data;

use App\Modules\Analytics\Domain\Enums\DeviceType;

final readonly class ParsedUserAgent
{
    public function __construct(
        public DeviceType $deviceType,
        public ?string $browser,
        public ?string $os,
    ) {}
}
