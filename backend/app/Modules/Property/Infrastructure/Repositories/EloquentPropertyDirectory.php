<?php

namespace App\Modules\Property\Infrastructure\Repositories;

use App\Core\Media\SocialImageUrl;
use App\Core\Support\Contracts\PropertyDirectory;
use App\Modules\Property\Domain\Models\Property;
use App\Modules\Property\Http\Resources\PropertyResource;

class EloquentPropertyDirectory implements PropertyDirectory
{
    public function bookingListings(array $ids, int $page, string $search): array
    {
        $properties = Property::query()->with(['city.translations', 'district.translations', 'media'])
            ->whereIn('id', $ids)->where('approval_status', 'approved')->where('status', 'disponible')
            ->when($search !== '', fn ($query) => $query->where('title', 'like', '%'.$search.'%'))
            ->orderByDesc('created_at')->orderByDesc('id')->paginate(12, ['*'], 'page', $page);

        return [
            'properties' => PropertyResource::collection($properties)->resolve(),
            'pagination' => ['current_page' => $properties->currentPage(), 'last_page' => $properties->lastPage(), 'per_page' => $properties->perPage(), 'total' => $properties->total()],
        ];
    }

    public function isPubliclyAvailable(int $id): bool
    {
        return Property::query()->whereKey($id)->where('approval_status', 'approved')->where('status', 'disponible')->exists();
    }

    public function socialListing(int $id): ?array
    {
        $property = Property::query()->with(['city.translations', 'district.translations', 'media'])->find($id);

        if ($property === null) {
            return null;
        }

        return [
            'title' => $property->title,
            'type' => $property->type->value,
            'transaction_type' => $property->transaction_type,
            'price_period' => $property->price_period,
            'city' => $property->city?->translate('name', 'fr'),
            'district' => $property->district?->translate('name', 'fr'),
            'price_cents' => $property->price,
            'surface' => $property->surface,
            'bedrooms' => $property->bedrooms,
            'bathrooms' => $property->bathrooms,
            'url' => rtrim((string) config('app.frontend_url'), '/').'/properties/'.$property->id,
            'image_urls' => $property->getMedia('gallery')->map(fn ($media) => SocialImageUrl::for($media))->values()->all(),
            'created_at' => $property->created_at->toIso8601String(),
        ];
    }

    public function titles(array $ids): array
    {
        return Property::withTrashed()->whereIn('id', $ids)->pluck('title', 'id')->all();
    }

    public function search(string $search): array
    {
        return Property::query()->when($search !== '', fn ($query) => $query->where('title', 'like', '%'.$search.'%'))
            ->orderBy('title')->limit(50)->get(['id', 'title'])->toArray();
    }
}
