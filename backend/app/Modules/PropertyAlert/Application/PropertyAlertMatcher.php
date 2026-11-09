<?php

namespace App\Modules\PropertyAlert\Application;

use App\Modules\Property\Domain\Contracts\PropertyRepositoryInterface;
use App\Modules\Property\Domain\Enums\PropertyApprovalStatus;
use App\Modules\Property\Domain\Models\Property;
use App\Modules\PropertyAlert\Domain\Models\PropertyAlert;
use App\Modules\PropertyAlert\Domain\Models\PropertyAlertMatch;
use App\Modules\WhatsApp\Domain\Contracts\WhatsAppGateway;
use App\Modules\WhatsApp\Domain\Exceptions\WhatsAppNotConfiguredException;
use App\Modules\WhatsApp\Domain\Exceptions\WhatsAppRequestFailedException;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Plain, unit-testable matching + notify logic run by MatchPropertyAlertsJob
 * whenever a property becomes publicly visible.
 *
 * Depends on Property's repository *interface* (a Domain contract), not its
 * Eloquent model directly imported for querying - the same sanctioned
 * cross-module mechanism StoreLeadController already uses to read a
 * property's commercial_id (PROJECT_RULES.md §3).
 */
class PropertyAlertMatcher
{
    public function __construct(
        private readonly PropertyRepositoryInterface $properties,
        private readonly WhatsAppGateway $whatsApp,
    ) {}

    public function match(int $propertyId): void
    {
        $property = $this->properties->find($propertyId);

        // Defensive re-check: the event only fires on approval, but by the
        // time this (queued) job runs the property could since have been
        // edited/rejected again - never match anything but the current,
        // actually-approved state.
        if (! $property || $property->approval_status !== PropertyApprovalStatus::Approved) {
            return;
        }

        $candidates = PropertyAlert::query()
            ->where(fn ($q) => $q->whereNull('city_id')->orWhere('city_id', $property->city_id))
            ->where(fn ($q) => $q->whereNull('district_id')->orWhere('district_id', $property->district_id))
            ->where(fn ($q) => $q->whereNull('property_type')->orWhere('property_type', $property->type->value))
            ->where(fn ($q) => $q->whereNull('transaction_type')->orWhere('transaction_type', $property->transaction_type))
            ->where(fn ($q) => $q->whereNull('price_period')->orWhere('price_period', $property->price_period))
            ->where(fn ($q) => $q->whereNull('budget_max')->orWhere('budget_max', '>=', $property->price))
            ->where(fn ($q) => $q->whereNull('surface_min')->orWhere('surface_min', '<=', $property->surface))
            ->where(fn ($q) => $q->whereNull('surface_max')->orWhere('surface_max', '>=', $property->surface))
            ->get();

        foreach ($candidates as $alert) {
            if ($this->claim($alert, $propertyId)) {
                $this->notify($alert, $property, $propertyId);
            }
        }
    }

    /**
     * Atomically claims the (alert, property) pair via the table's unique
     * constraint - only the caller that actually inserts the row proceeds
     * to notify, giving exactly-once delivery even under a retried job or
     * a re-approved property.
     */
    private function claim(PropertyAlert $alert, int $propertyId): bool
    {
        try {
            return (bool) DB::table('property_alert_matches')->insertOrIgnore([
                'property_alert_id' => $alert->id,
                'property_id' => $propertyId,
                'created_at' => now(),
            ]);
        } catch (UniqueConstraintViolationException) {
            return false;
        }
    }

    /**
     * @param  Property  $property
     */
    private function notify(PropertyAlert $alert, $property, int $propertyId): void
    {
        $sentAt = null;

        try {
            $this->whatsApp->sendTemplate(
                toWaId: ltrim($alert->phone_e164, '+'),
                name: config('services.whatsapp.alert_template', 'property_alert_match'),
                language: $alert->locale ?? 'fr',
                bodyParams: [
                    $property->title,
                    number_format($property->price / 100, 0, ',', ' '),
                    (string) $propertyId,
                ],
            );
            $sentAt = now();
        } catch (WhatsAppNotConfiguredException) {
            // Feature is genuinely off until Meta credentials + an approved
            // template exist - graceful no-op, same as the rest of the
            // WhatsApp module. The match row still records the match.
            Log::info('Property alert match found but WhatsApp is not configured, skipping notification.', [
                'property_alert_id' => $alert->id,
                'property_id' => $propertyId,
            ]);
        } catch (WhatsAppRequestFailedException $e) {
            Log::warning('WhatsApp property alert notification failed.', [
                'property_alert_id' => $alert->id,
                'property_id' => $propertyId,
                'error' => $e->getMessage(),
            ]);
        }

        PropertyAlertMatch::query()
            ->where('property_alert_id', $alert->id)
            ->where('property_id', $propertyId)
            ->update(['whatsapp_sent_at' => $sentAt]);
    }
}
