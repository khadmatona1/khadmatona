<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Default Filesystem Disk
    |--------------------------------------------------------------------------
    |
    | Here you may specify the default filesystem disk that should be used
    | by the framework. The "local" disk, as well as a variety of cloud
    | based disks are available to your application for file storage.
    |
    */

    'default' => env('FILESYSTEM_DISK', 'local'),

    /*
    |--------------------------------------------------------------------------
    | Filesystem Disks
    |--------------------------------------------------------------------------
    |
    | Below you may configure as many filesystem disks as necessary, and you
    | may even configure multiple disks for the same driver. Examples for
    | most supported storage drivers are configured here for reference.
    |
    | Supported drivers: "local", "ftp", "sftp", "s3"
    |
    */

    'disks' => [

        'local' => [
            'driver' => 'local',
            'root' => storage_path('app/private'),
            'serve' => true,
            'throw' => false,
            'report' => false,
        ],

        'public' => [
            'driver' => 'local',
            'root' => storage_path('app/public'),
            'url' => rtrim(env('APP_URL', 'http://localhost'), '/').'/storage',
            'visibility' => 'public',
            'throw' => false,
            'report' => false,
        ],

        // Backs the Core Media module (Spatie Media Library): one disk,
        // reused by Property galleries now and Artisan portfolios /
        // verification documents / contract attachments later. Served
        // through the existing "public" storage symlink. Kept as a local
        // fallback/dev option - production media storage is the
        // 'cloudinary' disk below (see MEDIA_DISK in .env).
        'media' => [
            'driver' => 'local',
            'root' => storage_path('app/public/media'),
            'url' => rtrim(env('APP_URL', 'http://localhost'), '/').'/storage/media',
            'visibility' => 'public',
            'throw' => false,
            'report' => false,
        ],

        // Cloudinary-backed Media Library storage (cloudinary-labs/cloudinary-laravel).
        // URL generation deliberately does NOT rely on this driver's own
        // getUrl() (it makes a live Admin API call per invocation, which
        // would mean N Cloudinary API round-trips per property list
        // response) - see App\Core\Media\CloudinaryUrlGenerator, wired in
        // via config/media-library.php's `url_generator`, which builds
        // delivery URLs locally from the public_id instead.
        'cloudinary' => [
            'driver' => 'cloudinary',
            'cloud' => env('CLOUDINARY_CLOUD_NAME'),
            'key' => env('CLOUDINARY_API_KEY'),
            'secret' => env('CLOUDINARY_API_SECRET'),
            'secure' => true,
        ],

        's3' => [
            'driver' => 's3',
            'key' => env('AWS_ACCESS_KEY_ID'),
            'secret' => env('AWS_SECRET_ACCESS_KEY'),
            'region' => env('AWS_DEFAULT_REGION'),
            'bucket' => env('AWS_BUCKET'),
            'url' => env('AWS_URL'),
            'endpoint' => env('AWS_ENDPOINT'),
            'use_path_style_endpoint' => env('AWS_USE_PATH_STYLE_ENDPOINT', false),
            'throw' => false,
            'report' => false,
        ],

    ],

    /*
    |--------------------------------------------------------------------------
    | Symbolic Links
    |--------------------------------------------------------------------------
    |
    | Here you may configure the symbolic links that will be created when the
    | `storage:link` Artisan command is executed. The array keys should be
    | the locations of the links and the values should be their targets.
    |
    */

    'links' => [
        public_path('storage') => storage_path('app/public'),
    ],

];
