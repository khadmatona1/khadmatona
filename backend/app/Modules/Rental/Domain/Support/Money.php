<?php

namespace App\Modules\Rental\Domain\Support;

/**
 * The API speaks MAD (decimal), the database stores integer cents
 * (PROJECT_RULES.md §13), same boundary as PropertyController/PropertyResource.
 * Commission rates are percentages in the API and basis points in storage.
 */
final class Money
{
    public static function toCents(int|float|string|null $mad): int
    {
        return (int) round(((float) ($mad ?? 0)) * 100);
    }

    public static function toMad(int|string|null $cents): float
    {
        return round(((int) ($cents ?? 0)) / 100, 2);
    }

    public static function percentToBasisPoints(int|float|string $percent): int
    {
        return (int) round(((float) $percent) * 100);
    }

    public static function basisPointsToPercent(int $basisPoints): float
    {
        return round($basisPoints / 100, 2);
    }

    /** Commission on an amount (both in cents), rounded to the nearest cent. */
    public static function commission(int $cents, int $basisPoints): int
    {
        return (int) round($cents * $basisPoints / 10_000);
    }
}
