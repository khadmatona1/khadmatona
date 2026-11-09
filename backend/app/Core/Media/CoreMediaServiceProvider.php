<?php

namespace App\Core\Media;

use Cloudinary\Cloudinary;
use Illuminate\Filesystem\FilesystemAdapter;
use Illuminate\Support\ServiceProvider;
use League\Flysystem\Filesystem;

/**
 * Re-registers the 'cloudinary' filesystem driver with
 * InvalidatingCloudinaryStorageAdapter instead of the package's own
 * (cloudinary-labs/cloudinary-laravel's CloudinaryServiceProvider registers
 * it first via auto-discovery, which boots before this app-level provider -
 * FilesystemManager::extend() just overwrites the earlier registration by
 * driver name, so whichever `extend('cloudinary', ...)` call happens last
 * wins). See InvalidatingCloudinaryStorageAdapter's docblock for why this
 * override exists. Mirrors the package's own driver-resolution logic
 * exactly (config/cloudinary.php), swapping only the adapter class.
 */
class CoreMediaServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $this->app['filesystem']->extend('cloudinary', function ($app, array $config) {
            if (isset($config['url'])) {
                $cloudinary = new Cloudinary($config['url']);
            } else {
                $cloudinary = new Cloudinary([
                    'cloud' => [
                        'cloud_name' => $config['cloud'],
                        'api_key' => $config['key'],
                        'api_secret' => $config['secret'],
                    ],
                    'url' => [
                        'secure' => $config['secure'] ?? false,
                    ],
                ]);
            }

            $adapter = new InvalidatingCloudinaryStorageAdapter($cloudinary, null, $config['prefix'] ?? null);

            return new FilesystemAdapter(new Filesystem($adapter, $config), $adapter, $config);
        });
    }
}
