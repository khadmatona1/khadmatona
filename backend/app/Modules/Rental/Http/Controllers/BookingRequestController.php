<?php

namespace App\Modules\Rental\Http\Controllers;

use App\Core\Support\Contracts\PropertyDirectory;
use App\Core\Support\Http\ApiResponse;
use App\Modules\Rental\Application\PublicBookingService;
use App\Modules\Rental\Domain\Contracts\ManagedPropertyRepositoryInterface;
use App\Modules\Rental\Domain\Models\BookingRequest;
use App\Modules\Rental\Http\Controllers\Concerns\RespondsWithPages;
use App\Modules\Rental\Http\Filters\BookingRequestFilter;
use App\Modules\Rental\Http\Requests\BookingAvailabilityRequest;
use App\Modules\Rental\Http\Requests\BookingCatalogRequest;
use App\Modules\Rental\Http\Requests\ConfirmBookingRequest;
use App\Modules\Rental\Http\Requests\StoreBookingRequest;
use App\Modules\Rental\Http\Resources\BookingRequestResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BookingRequestController
{
    use RespondsWithPages;

    public function catalog(BookingCatalogRequest $request, PropertyDirectory $properties, ManagedPropertyRepositoryInterface $managed): JsonResponse
    {
        return ApiResponse::success($properties->bookingListings($managed->activePropertyIds(), (int) ($request->validated('page') ?? 1), $request->validated('search') ?? ''));
    }

    public function availability(BookingAvailabilityRequest $request, int $propertyId, PublicBookingService $service): JsonResponse
    {
        return ApiResponse::success($service->availability($propertyId, $request->validated()));
    }

    public function store(StoreBookingRequest $request, PublicBookingService $service): JsonResponse
    {
        $booking = $service->submit($request->validated());

        return ApiResponse::success(['reference' => $booking->reference, 'status' => 'received'], status: 201);
    }

    public function index(Request $request, BookingRequestFilter $filter, PropertyDirectory $properties): JsonResponse
    {
        $page = $filter->apply()->defaultSort('-created_at')->paginate($this->perPage($request));
        $titles = $properties->titles($page->getCollection()->pluck('property_id')->all());
        $page->getCollection()->each(fn ($booking) => $booking->setAttribute('property_title', $titles[$booking->property_id] ?? null));

        return $this->page($page, BookingRequestResource::class);
    }

    public function confirm(ConfirmBookingRequest $request, BookingRequest $bookingRequest, PublicBookingService $service): JsonResponse
    {
        $booking = $service->confirm($bookingRequest, $request->validated('total_amount'));

        return ApiResponse::success(['id' => $booking->id, 'status' => $booking->status, 'reservation_id' => $booking->reservation_id]);
    }

    public function reject(BookingRequest $bookingRequest, PublicBookingService $service): JsonResponse
    {
        $booking = $service->reject($bookingRequest);

        return ApiResponse::success(['id' => $booking->id, 'status' => $booking->status]);
    }
}
