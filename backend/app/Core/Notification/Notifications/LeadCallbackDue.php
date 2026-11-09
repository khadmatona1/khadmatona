<?php

namespace App\Core\Notification\Notifications;

use App\Modules\Lead\Domain\Models\Lead;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Queue\SerializesModels;

/**
 * "Time to call this lead back" - sent when a lead set to "À rappeler"
 * reaches its scheduled callback time (see DueCallbackNotifier). Goes to the
 * lead's responsible commercial, or every Admin when the lead has none.
 * Delivered on the dashboard bell and by mail, since a reminder is only
 * useful if it reaches someone who isn't looking at the dashboard.
 */
class LeadCallbackDue extends Notification implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(private readonly Lead $lead) {}

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail', 'database'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $url = sprintf('%s/dashboard/leads/%d', rtrim((string) config('app.frontend_url'), '/'), $this->lead->id);

        return (new MailMessage)
            ->subject(__('notifications.lead_callback_due.subject'))
            ->greeting(__('notifications.lead_callback_due.greeting', ['name' => $notifiable->name]))
            ->line(__('notifications.lead_callback_due.line1', [
                'lead' => $this->lead->name,
                'phone' => $this->lead->phone ?: '-',
            ]))
            ->action(__('notifications.lead_callback_due.action'), $url);
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'lead_callback_due',
            'lead_id' => $this->lead->id,
            'lead_name' => $this->lead->name,
            'phone' => $this->lead->phone,
            'callback_at' => $this->lead->callback_at?->toIso8601String(),
        ];
    }
}
