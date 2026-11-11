<?php

namespace App\Modules\Property\Http\Resources;

use App\Modules\Property\Domain\Models\Property;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Property
 */
class PropertyResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'type' => $this->type->value,
            'status' => $this->status->value,
            'transaction_type' => $this->transaction_type,
            'price_period' => $this->price_period,
            'city_id' => $this->city_id,
            'city_name' => $this->city?->translate('name'),
            'district_id' => $this->district_id,
            'district_name' => $this->district?->translate('name'),
            'address' => $this->address,
            // Stored as integer cents - converted to MAD (decimal) here, the
            // one place API consumers should ever read a property's price.
            'price' => $this->price / 100,
            'surface' => $this->surface,
            'bedrooms' => $this->bedrooms,
            'bathrooms' => $this->bathrooms,
            'description' => $this->description,
            // Real photo gallery via spatie/laravel-medialibrary - `medium`
            // is the queued WebP conversion HasMediaConversions registers.
            // getAvailableUrl() falls back to the original until that queued
            // conversion has actually been generated (same fallback
            // getFirstMediaUrl() gives cover_image) - getUrl('medium') would
            // point at a file that doesn't exist yet and 404.
            // Each image carries its own media `id` so the admin edit form
            // can target DELETE /properties/{property}/images/{media}.
            'images' => $this->getMedia('gallery')->map(fn ($media) => [
                'id' => $media->id,
                'url' => $media->getAvailableUrl(['medium']),
            ])->values(),
            'cover_image' => $this->getFirstMediaUrl('gallery', 'medium') ?: null,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
