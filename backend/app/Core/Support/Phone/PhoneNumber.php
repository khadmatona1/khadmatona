<?php

namespace App\Core\Support\Phone;

/**
 * Phone normalization shared by anything that talks to a telephony
 * provider or has to match a number against stored free-form input (leads
 * store whatever the visitor typed: "06 12 34 56 78", "+212 6...", ...).
 */
final class PhoneNumber
{
    /** Country code assumed for numbers written locally with no "+" (Morocco). */
    public const DEFAULT_COUNTRY_CODE = '212';

    /**
     * Best-effort conversion to E.164 ("+212612345678"), or null when the
     * input can't plausibly be a phone number. Accepts a "whatsapp:" prefix.
     */
    public static function toE164(?string $raw, string $defaultCountryCode = self::DEFAULT_COUNTRY_CODE): ?string
    {
        if ($raw === null) {
            return null;
        }

        $raw = trim((string) preg_replace('/^whatsapp:/i', '', trim($raw)));
        if ($raw === '') {
            return null;
        }

        $digits = (string) preg_replace('/\D/', '', $raw);
        if ($digits === '') {
            return null;
        }

        if (str_starts_with($raw, '+')) {
            $e164 = '+'.$digits;
        } elseif (str_starts_with($digits, '00')) {
            $e164 = '+'.substr($digits, 2);
        } elseif (str_starts_with($digits, '0')) {
            $e164 = '+'.$defaultCountryCode.substr($digits, 1);
        } elseif (strlen($digits) <= 9) {
            $e164 = '+'.$defaultCountryCode.$digits;
        } else {
            $e164 = '+'.$digits;
        }

        return preg_match('/^\+[1-9]\d{7,14}$/', $e164) === 1 ? $e164 : null;
    }

    /**
     * The last 9 digits - a country/format-agnostic key for narrowing a
     * database LIKE search before comparing candidates via toE164().
     */
    public static function matchKey(?string $raw): ?string
    {
        $digits = (string) preg_replace('/\D/', '', (string) $raw);

        return strlen($digits) >= 7 ? substr($digits, -9) : null;
    }
}
