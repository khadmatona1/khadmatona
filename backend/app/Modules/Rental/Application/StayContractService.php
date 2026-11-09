<?php

namespace App\Modules\Rental\Application;

use App\Core\Support\Contracts\PropertyDirectory;
use App\Modules\Rental\Domain\Models\BookingRequest;
use App\Modules\Rental\Domain\Models\StayContract;
use App\Modules\Rental\Domain\Support\Money;
use App\Modules\Rental\Notifications\StayContractReady;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\GoneHttpException;

class StayContractService
{
    public function __construct(private readonly PropertyDirectory $properties) {}

    public function createAndNotify(BookingRequest $booking): StayContract
    {
        $token = Str::random(64);
        $contract = StayContract::firstOrCreate(
            ['booking_request_id' => $booking->id],
            [
                'reservation_id' => $booking->reservation_id,
                'access_token' => $token,
                'access_token_hash' => hash('sha256', $token),
                'expires_at' => now()->addDays(30),
            ],
        );

        if ($contract->wasRecentlyCreated && $booking->guest_email) {
            Notification::route('mail', $booking->guest_email)
                ->notify(new StayContractReady($booking->guest_name, $booking->reference, $token));
        }

        return $contract;
    }

    public function find(string $token): StayContract
    {
        $contract = StayContract::query()
            ->with(['bookingRequest', 'reservation'])
            ->where('access_token_hash', hash('sha256', $token))
            ->firstOrFail();

        if (! $contract->signed_at && $contract->expires_at->isPast()) {
            throw new GoneHttpException(__('stay_contract.expired'));
        }

        return $contract;
    }

    public function details(StayContract $contract): array
    {
        $booking = $contract->bookingRequest;
        $reservation = $contract->reservation;
        $title = $this->properties->titles([$booking->property_id])[$booking->property_id] ?? __('stay_contract.property');

        return [
            'reference' => $booking->reference,
            'status' => $contract->signed_at ? 'signed' : 'pending_signature',
            'guest' => [
                'name' => $booking->guest_name,
                'phone' => $booking->guest_phone,
                'email' => $booking->guest_email,
            ],
            'stay' => [
                'property_title' => $title,
                'guests_count' => $booking->guests_count,
                'check_in_date' => $booking->check_in_date->toDateString(),
                'check_out_date' => $booking->check_out_date->toDateString(),
                'total_amount' => Money::toMad($reservation->total_amount),
                'currency' => 'MAD',
            ],
            'contract' => $contract->signed_at ? [
                'nationality' => $contract->nationality,
                'identity_number' => $contract->identity_number,
                'birth_date' => $contract->birth_date->toDateString(),
                'address' => $contract->address,
                'estimated_arrival_time' => $contract->estimated_arrival_time,
                'signed_at' => $contract->signed_at->toIso8601String(),
            ] : null,
            'expires_at' => $contract->expires_at->toIso8601String(),
        ];
    }

    public function sign(StayContract $contract, array $attributes, UploadedFile $identityDocument): StayContract
    {
        if ($contract->signed_at) {
            return $contract;
        }

        $signature = base64_decode(substr($attributes['signature'], strlen('data:image/png;base64,')), true);
        if ($signature === false || ! str_starts_with($signature, "\x89PNG\r\n\x1a\n")) {
            throw ValidationException::withMessages(['signature' => __('stay_contract.invalid_signature')]);
        }

        $directory = 'stay-contracts/'.$contract->id;
        $documentPath = $identityDocument->storeAs($directory, 'identity-document.'.$identityDocument->extension(), 'local');
        $signaturePath = $directory.'/signature.png';
        Storage::disk('local')->put($signaturePath, $signature);
        if (! $documentPath || ! Storage::disk('local')->exists($signaturePath)) {
            throw ValidationException::withMessages(['identity_document' => __('stay_contract.storage_failed')]);
        }

        unset($attributes['signature'], $attributes['accept_terms']);

        return DB::transaction(function () use ($contract, $attributes, $documentPath, $signaturePath) {
            $locked = StayContract::query()->lockForUpdate()->findOrFail($contract->id);
            if ($locked->signed_at) {
                return $locked;
            }

            $signedAt = now();
            $snapshot = [
                ...$this->details($contract),
                'client' => $attributes,
                'terms_accepted_at' => $signedAt->toIso8601String(),
                'signed_at' => $signedAt->toIso8601String(),
            ];
            $locked->update([
                ...$attributes,
                'identity_document_path' => $documentPath,
                'signature_path' => $signaturePath,
                'contract_snapshot' => $snapshot,
                'terms_accepted_at' => $signedAt,
                'signed_at' => $signedAt,
            ]);

            return $locked->refresh()->load(['bookingRequest', 'reservation']);
        });
    }
}
