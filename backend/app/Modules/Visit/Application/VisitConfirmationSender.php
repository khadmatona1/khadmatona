<?php

namespace App\Modules\Visit\Application;

use App\Core\Support\Phone\PhoneNumber;
use App\Modules\Lead\Domain\Contracts\LeadRepositoryInterface;
use App\Modules\Property\Domain\Contracts\PropertyRepositoryInterface;
use App\Modules\Visit\Domain\Contracts\VisitRepositoryInterface;
use App\Modules\WhatsApp\Application\ConversationService;
use App\Modules\WhatsApp\Application\WhatsAppMessenger;
use App\Modules\WhatsApp\Domain\Enums\MessageSenderType;
use App\Modules\WhatsApp\Domain\Exceptions\WhatsAppNotConfiguredException;
use App\Modules\WhatsApp\Domain\Exceptions\WhatsAppRequestFailedException;
use Illuminate\Support\Facades\Log;

/**
 * Sends (or re-sends, on reschedule) a visit confirmation over WhatsApp.
 *
 * Goes through ConversationService::findOrCreate() + WhatsAppMessenger -
 * NOT a direct WhatsAppGateway::sendTemplate() call like
 * PropertyAlertMatcher - because a visit booker is a real Lead with a real
 * (usually) assigned commercial, and a reply from them (e.g. "can we
 * reschedule?") must land in a normal staff-visible Conversation thread via
 * the existing inbound webhook, not vanish into an orphaned/unassigned
 * thread. PropertyAlertMatcher's bypass is only correct there because an
 * anonymous PropertyAlert subscriber has no CRM identity to link a reply
 * to.
 */
class VisitConfirmationSender
{
    public function __construct(
        private readonly VisitRepositoryInterface $visits,
        private readonly LeadRepositoryInterface $leads,
        private readonly PropertyRepositoryInterface $properties,
        private readonly ConversationService $conversations,
        private readonly WhatsAppMessenger $messenger,
    ) {}

    public function send(int $visitId): void
    {
        $visit = $this->visits->find($visitId);
        if (! $visit) {
            return;
        }

        $lead = $this->leads->find($visit->lead_id);
        $e164 = $lead && filled($lead->phone) ? PhoneNumber::toE164($lead->phone) : null;

        if ($e164 === null) {
            // Lead.phone is nullable in general, but StoreVisitRequest
            // makes it required at booking time - this only fires for a
            // Visit somehow pointing at a Lead whose phone was cleared
            // afterward. Graceful no-op, never throws into the job.
            Log::info('Visit confirmation skipped: no valid phone on the underlying lead.', ['visit_id' => $visitId]);

            return;
        }

        $property = $this->properties->find($visit->property_id);

        try {
            $conversation = $this->conversations->findOrCreate(ltrim($e164, '+'), $lead->name);

            $this->messenger->sendTemplate(
                conversation: $conversation,
                name: config('services.whatsapp.visit_confirmation_template', 'visit_confirmation'),
                language: 'fr',
                params: [
                    $lead->name,
                    $property?->title ?? '',
                    $visit->scheduled_at->timezone(config('app.business_timezone'))->format('d/m/Y H:i'),
                    $property?->address ?? '',
                ],
                sender: MessageSenderType::System,
            );

            $this->visits->update($visit, ['whatsapp_confirmed_at' => now()]);
        } catch (WhatsAppNotConfiguredException) {
            // Feature is genuinely off until Meta credentials + an
            // approved template exist - graceful no-op, same as the rest
            // of the WhatsApp module and PropertyAlertMatcher.
            Log::info('Visit booked but WhatsApp is not configured, skipping confirmation.', ['visit_id' => $visitId]);
        } catch (WhatsAppRequestFailedException $e) {
            Log::warning('WhatsApp visit confirmation failed.', ['visit_id' => $visitId, 'error' => $e->getMessage()]);
        }
    }
}
