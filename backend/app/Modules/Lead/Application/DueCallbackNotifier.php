<?php

namespace App\Modules\Lead\Application;

use App\Core\Notification\Notifications\LeadCallbackDue;
use App\Models\User;
use App\Modules\Lead\Domain\Enums\LeadStatus;
use App\Modules\Lead\Domain\Models\Lead;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;

/**
 * The "À rappeler" timer: finds leads whose scheduled callback time has
 * arrived and notifies whoever is responsible for them, exactly once each.
 * Run every minute by the scheduler (`leads:notify-callbacks`).
 */
class DueCallbackNotifier
{
    /**
     * @return int How many leads were notified.
     */
    public function run(): int
    {
        $notified = 0;

        Lead::query()
            ->where('status', LeadStatus::ToCallBack->value)
            ->whereNotNull('callback_at')
            ->where('callback_at', '<=', now())
            ->whereNull('callback_notified_at')
            ->chunkById(100, function ($leads) use (&$notified) {
                foreach ($leads as $lead) {
                    // Atomic claim: if two scheduler runs overlap, only the one
                    // that flips callback_notified_at first sends the reminder.
                    $claimed = Lead::whereKey($lead->id)
                        ->whereNull('callback_notified_at')
                        ->update(['callback_notified_at' => now()]);

                    if ($claimed === 1) {
                        $this->notify($lead);
                        $notified++;
                    }
                }
            });

        if ($notified > 0) {
            Log::info('leads.callbacks.notified', ['count' => $notified]);
        }

        return $notified;
    }

    private function notify(Lead $lead): void
    {
        // The responsible commercial; leads nobody owns (contact/sell/rent
        // requests) - or whose commercial is deactivated - go to the Admins.
        $recipients = $lead->commercial_id
            ? User::whereKey($lead->commercial_id)->where('is_active', true)->get()
            : collect();

        if ($recipients->isEmpty()) {
            $recipients = User::role('Admin')->get();
        }

        Notification::send($recipients, new LeadCallbackDue($lead));
    }
}
