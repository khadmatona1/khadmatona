<?php

namespace App\Modules\Analytics\Domain\Data;

use App\Modules\Analytics\Domain\Enums\TrafficSource;

final readonly class TrafficClassification
{
    public function __construct(
        public TrafficSource $source,
        /** direct | organic | social | referral | paid | email | campaign */
        public string $medium,
        public ?string $referrerHost,
    ) {}
}
