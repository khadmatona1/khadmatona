<?php

use App\Core\Media\SocialImageUrl;
use App\Modules\Property\Domain\Models\Property;

test('Cloudinary media gets a fixed JPEG derivative instead of f_auto', function () {
    config(['filesystems.disks.cloudinary.cloud' => 'demo']);
    $property = Property::factory()->create();
    $media = $property->media()->create([
        'collection_name' => 'gallery', 'name' => 'photo', 'file_name' => 'photo.png', 'mime_type' => 'image/png',
        'disk' => 'cloudinary', 'conversions_disk' => 'cloudinary', 'size' => 10,
        'manipulations' => [], 'custom_properties' => [], 'generated_conversions' => [], 'responsive_images' => [],
    ]);

    $url = SocialImageUrl::for($media);

    expect($url)->toContain('res.cloudinary.com/demo/image/upload/c_fill,g_auto,ar_1:1,w_1080/cs_srgb,f_jpg,q_auto:good/')
        ->and($url)->not->toContain('f_auto');
});
