<?php

namespace App\Core\Localization\Http\Controllers;

use App\Core\Support\Http\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\File;

/**
 * Serves one merged translation bundle per locale so the SPA fetches
 * exactly the language it needs instead of shipping all three upfront.
 */
class I18nController
{
    public function __invoke(string $locale): JsonResponse
    {
        $supported = array_filter(explode(',', (string) env('SUPPORTED_LOCALES', 'fr')));

        if (! in_array($locale, $supported, true)) {
            return ApiResponse::error("Unsupported locale [{$locale}].", status: 404);
        }

        $path = lang_path($locale);
        $bundle = [];

        if (File::isDirectory($path)) {
            foreach (File::files($path) as $file) {
                $bundle[$file->getFilenameWithoutExtension()] = require $file->getPathname();
            }
        }

        return ApiResponse::success($bundle, ['locale' => $locale]);
    }
}
