<?php

namespace App\Modules\Analytics\Domain\Services;

use App\Modules\Analytics\Domain\Enums\PageType;

/**
 * Maps a public-site path to its page type, and extracts the property id
 * from property detail URLs. Done server-side, so a tracker cannot claim a
 * property view for a page that is not one.
 */
class PageClassifier
{
    /**
     * Strips any query string/fragment, collapses duplicate slashes, drops
     * a trailing slash and caps the length. Query strings are never stored
     * because they can carry personal data (emails in password-reset links,
     * search terms...).
     */
    public function normalizePath(?string $path): ?string
    {
        if ($path === null) {
            return null;
        }

        $path = (string) preg_replace('/[?#].*$/s', '', trim($path));
        $path = (string) preg_replace('#/{2,}#', '/', $path);

        if ($path === '' || $path[0] !== '/') {
            return null;
        }

        if ($path !== '/') {
            $path = rtrim($path, '/');
        }

        return mb_substr($path, 0, 255);
    }

    public function classify(string $path): PageType
    {
        return match (true) {
            $path === '/' => PageType::Home,
            $path === '/properties' => PageType::PropertyListing,
            $this->propertyId($path) !== null => PageType::Property,
            $path === '/blog' => PageType::Blog,
            str_starts_with($path, '/blog/') => PageType::BlogPost,
            $path === '/contact' => PageType::Contact,
            $path === '/about' => PageType::About,
            $path === '/services' => PageType::Services,
            $path === '/partner-with-us' => PageType::Partner,
            default => PageType::Other,
        };
    }

    public function propertyId(string $path): ?int
    {
        if (preg_match('#^/properties/(\d{1,18})$#', $path, $matches) === 1) {
            return (int) $matches[1];
        }

        return null;
    }
}
