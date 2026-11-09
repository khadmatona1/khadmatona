<?php

namespace App\Modules\Analytics\Domain\Services;

use App\Modules\Analytics\Domain\Data\TrafficClassification;
use App\Modules\Analytics\Domain\Enums\TrafficSource;

/**
 * Turns a referrer URL + UTM parameters into one channel. UTM tags win over
 * the referrer when present (a tagged Instagram ad is "instagram / paid"
 * even when the in-app browser strips the referrer). A referrer from the
 * site's own host (internal navigation) counts as direct.
 */
class TrafficSourceClassifier
{
    private const PAID_MEDIUMS = ['cpc', 'ppc', 'paid', 'paidsocial', 'paid_social', 'paid-social', 'ads', 'ad', 'display', 'cpm', 'sponsored'];

    /** @var array<string, array<int, string>> */
    private const HOST_PATTERNS = [
        // Checked first: webmail hosts would otherwise match google./yahoo.
        'email' => ['mail.google.com', 'outlook.live.com', 'mail.yahoo.', 'webmail.'],
        'google' => ['google.'],
        'facebook' => ['facebook.com', 'fb.com', 'fb.me', 'messenger.com'],
        'instagram' => ['instagram.com'],
        'tiktok' => ['tiktok.com'],
        'other_search' => ['bing.com', 'yahoo.', 'duckduckgo.com', 'yandex.', 'ecosia.org', 'baidu.com', 'qwant.com', 'search.brave.com'],
        'other_social' => ['linkedin.com', 'lnkd.in', 't.co', 'twitter.com', 'x.com', 'youtube.com', 'youtu.be', 'pinterest.', 'snapchat.com', 'whatsapp.com', 'wa.me', 'reddit.com', 'threads.net', 'telegram.', 't.me'],
    ];

    /**
     * @param  array<int, string>  $ownHosts  The site's own hosts, whose referrers mean internal navigation.
     */
    public function classify(?string $referrer, ?string $utmSource, ?string $utmMedium, array $ownHosts = []): TrafficClassification
    {
        $host = $this->host($referrer);
        if ($host !== null && $this->isOwnHost($host, $ownHosts)) {
            $host = null;
        }

        $utmSource = $utmSource !== null ? strtolower(trim($utmSource)) : null;
        $utmMedium = $utmMedium !== null ? strtolower(trim($utmMedium)) : null;
        $isPaid = $utmMedium !== null && in_array($utmMedium, self::PAID_MEDIUMS, true);

        if ($utmSource !== null && $utmSource !== '') {
            $source = $this->sourceFromName($utmSource) ?? ($host !== null ? $this->sourceFromHost($host) : TrafficSource::Referral);
            $medium = match (true) {
                $isPaid => 'paid',
                $utmMedium === 'email' || $source === TrafficSource::Email => 'email',
                default => $this->mediumFor($source, $utmMedium !== null && $utmMedium !== '' ? 'campaign' : null),
            };

            return new TrafficClassification($source, $medium, $host);
        }

        if ($host === null) {
            return new TrafficClassification(TrafficSource::Direct, 'direct', null);
        }

        $source = $this->sourceFromHost($host);

        return new TrafficClassification($source, $isPaid ? 'paid' : $this->mediumFor($source), $host);
    }

    public function host(?string $url): ?string
    {
        if ($url === null || trim($url) === '') {
            return null;
        }

        $host = parse_url(trim($url), PHP_URL_HOST);
        if (! is_string($host) || $host === '') {
            return null;
        }

        return mb_substr(strtolower($host), 0, 255);
    }

    private function sourceFromHost(string $host): TrafficSource
    {
        foreach (self::HOST_PATTERNS as $source => $patterns) {
            foreach ($patterns as $pattern) {
                if ($this->hostMatches($host, $pattern)) {
                    return TrafficSource::from($source);
                }
            }
        }

        return TrafficSource::Referral;
    }

    private function sourceFromName(string $name): ?TrafficSource
    {
        return match (true) {
            str_contains($name, 'google') => TrafficSource::Google,
            str_contains($name, 'instagram') || $name === 'ig' => TrafficSource::Instagram,
            str_contains($name, 'facebook') || $name === 'fb' || str_contains($name, 'meta') => TrafficSource::Facebook,
            str_contains($name, 'tiktok') => TrafficSource::TikTok,
            in_array($name, ['bing', 'yahoo', 'duckduckgo', 'yandex', 'ecosia', 'qwant'], true) => TrafficSource::OtherSearch,
            in_array($name, ['linkedin', 'twitter', 'x', 'youtube', 'pinterest', 'snapchat', 'whatsapp', 'telegram'], true) => TrafficSource::OtherSocial,
            in_array($name, ['newsletter', 'email', 'mail', 'mailchimp', 'brevo', 'sendinblue'], true) => TrafficSource::Email,
            default => null,
        };
    }

    private function mediumFor(TrafficSource $source, ?string $fallback = null): string
    {
        return match ($source) {
            TrafficSource::Direct => 'direct',
            TrafficSource::Google, TrafficSource::OtherSearch => 'organic',
            TrafficSource::Facebook, TrafficSource::Instagram, TrafficSource::TikTok, TrafficSource::OtherSocial => 'social',
            TrafficSource::Email => 'email',
            TrafficSource::Referral => $fallback ?? 'referral',
        };
    }

    private function hostMatches(string $host, string $pattern): bool
    {
        // "google." matches google.com, google.co.ma and www.google.fr.
        // "t.co" must not match "reddit.com", so dotted patterns ending in
        // a TLD are matched as the host itself or a subdomain of it.
        if (str_ends_with($pattern, '.')) {
            return str_starts_with($host, $pattern) || str_contains($host, '.'.$pattern);
        }

        return $host === $pattern || str_ends_with($host, '.'.$pattern);
    }

    /**
     * @param  array<int, string>  $ownHosts
     */
    private function isOwnHost(string $host, array $ownHosts): bool
    {
        foreach ($ownHosts as $own) {
            $own = strtolower($own);
            if ($own !== '' && ($host === $own || str_ends_with($host, '.'.$own) || str_ends_with($own, '.'.$host))) {
                return true;
            }
        }

        return false;
    }
}
