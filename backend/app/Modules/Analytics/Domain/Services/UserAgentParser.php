<?php

namespace App\Modules\Analytics\Domain\Services;

use App\Modules\Analytics\Domain\Data\ParsedUserAgent;
use App\Modules\Analytics\Domain\Enums\DeviceType;

/**
 * Coarse device/browser/OS classification from the User-Agent header.
 * Deliberately small and dependency-free: the dashboard only needs broad
 * buckets ("Mobile / Safari / iOS"), not version-level fingerprinting,
 * which would also be more identifying than analytics needs.
 */
class UserAgentParser
{
    private const BOT_PATTERN = '/bot|crawl|spider|slurp|headless|lighthouse|pagespeed|preview|facebookexternalhit|embedly|bingpreview|python-requests|curl\/|wget|httpclient|okhttp|axios|node-fetch|go-http-client|java\//i';

    public function isBot(?string $userAgent): bool
    {
        return $userAgent === null || trim($userAgent) === '' || preg_match(self::BOT_PATTERN, $userAgent) === 1;
    }

    public function parse(?string $userAgent): ParsedUserAgent
    {
        $ua = (string) $userAgent;

        return new ParsedUserAgent(
            deviceType: $this->deviceType($ua),
            browser: $this->browser($ua),
            os: $this->os($ua),
        );
    }

    private function deviceType(string $ua): DeviceType
    {
        // iPadOS 13+ reports a desktop Mac UA. That case is indistinguishable
        // server-side and is counted as desktop.
        if (preg_match('/ipad|tablet|kindle|silk|playbook|(android(?!.*mobile))/i', $ua)) {
            return DeviceType::Tablet;
        }

        if (preg_match('/mobi|iphone|ipod|android.*mobile|windows phone|blackberry|opera mini/i', $ua)) {
            return DeviceType::Mobile;
        }

        return DeviceType::Desktop;
    }

    private function browser(string $ua): ?string
    {
        // Order matters: most Chromium-based browsers also say "Chrome" and
        // "Safari", so the specific ones are checked first.
        $browsers = [
            'Instagram' => '/instagram/i',
            'Facebook' => '/fban|fbav|fb_iab/i',
            'TikTok' => '/bytedancewebview|musical_ly|tiktok/i',
            'Edge' => '/edg(e|a|ios)?\//i',
            'Opera' => '/opr\/|opera/i',
            'Samsung Internet' => '/samsungbrowser/i',
            'Firefox' => '/firefox|fxios/i',
            'Chrome' => '/chrome|crios/i',
            'Safari' => '/safari/i',
        ];

        foreach ($browsers as $name => $pattern) {
            if (preg_match($pattern, $ua)) {
                return $name;
            }
        }

        return null;
    }

    private function os(string $ua): ?string
    {
        $systems = [
            'iOS' => '/iphone|ipad|ipod/i',
            'Android' => '/android/i',
            'Windows' => '/windows/i',
            'macOS' => '/mac os x|macintosh/i',
            'ChromeOS' => '/cros/i',
            'Linux' => '/linux/i',
        ];

        foreach ($systems as $name => $pattern) {
            if (preg_match($pattern, $ua)) {
                return $name;
            }
        }

        return null;
    }
}
