<?php

namespace App\Modules\Rental\Http\Controllers;

use App\Core\Support\Http\ApiResponse;
use App\Modules\Rental\Application\ReservationService;
use App\Modules\Rental\Domain\Models\Reservation;
use App\Modules\Rental\Http\Controllers\Concerns\RespondsWithPages;
use App\Modules\Rental\Http\Filters\ReservationFilter;
use App\Modules\Rental\Http\Requests\ReservationStepRequest;
use App\Modules\Rental\Http\Requests\StoreReservationRequest;
use App\Modules\Rental\Http\Requests\UpdateReservationRequest;
use App\Modules\Rental\Http\Resources\ReservationResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReservationController
{
    use RespondsWithPages;

    public function __construct(private readonly ReservationService $reservations) {}

    public function index(Request $request, ReservationFilter $filter): JsonResponse
    {
        return $this->page($filter->apply()->paginate($this->perPage($request)), ReservationResource::class);
    }

    public function store(StoreReservationRequest $request): JsonResponse
    {
        return ApiResponse::success(new ReservationResource($this->reservations->create($request->toModelAttributes())), status: 201);
    }

    public function show(Reservation $reservation): JsonResponse
    {
        return ApiResponse::success(new ReservationResource($this->reservations->withDisplay($reservation)));
    }

    public function update(UpdateReservationRequest $request, Reservation $reservation): JsonResponse
    {
        return ApiResponse::success(new ReservationResource($this->reservations->update($reservation, $request->toModelAttributes())));
    }

    public function checkIn(ReservationStepRequest $request, Reservation $reservation): JsonResponse
    {
        return ApiResponse::success(new ReservationResource($this->reservations->checkIn($reservation, $request->validated('notes'))));
    }

    public function checkOut(ReservationStepRequest $request, Reservation $reservation): JsonResponse
    {
        return ApiResponse::success(new ReservationResource($this->reservations->checkOut($reservation, $request->validated('notes'))));
    }

    public function cancel(Reservation $reservation): JsonResponse
    {
        return ApiResponse::success(new ReservationResource($this->reservations->cancel($reservation)));
    }

    public function destroy(Reservation $reservation): JsonResponse
    {
        $this->reservations->delete($reservation);

        return ApiResponse::success();
    }
}
