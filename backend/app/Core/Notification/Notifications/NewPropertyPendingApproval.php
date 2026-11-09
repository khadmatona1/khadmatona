<?php

namespace App\Core\Notification\Notifications;

use App\Modules\Property\Domain\Models\Property;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Queue\SerializesModels;

/**
 * Sent to every Admin whenever a property lands in the review queue - a
 * Commercial's brand-new submission (PropertyController::store()), or
 * their edit to an already-approved/rejected listing that puts it back in
 * the queue (PropertyController::update()). Never sent for a
 * SeniorCommercial's listing, since those publish immediately and skip the
 * queue entirely (see PropertyController::applyOwnership()). Delivered on
 * both channels: `mail` (Mailpit in dev) and `database` (the dashboard
 * bell, via NotificationController).
 */
class NewPropertyPendingApproval extends Notification implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(private readonly Property $property) {}

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail', 'database'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $url = sprintf(
            '%s/dashboard/properties/%d',
            rtrim((string) config('app.frontend_url'), '/'),
            $this->property->id,
        );

        return (new MailMessage)
            ->subject(__('notifications.new_property_pending.subject'))
            ->greeting(__('notifications.new_property_pending.greeting', ['name' => $notifiable->name]))
            ->line(__('notifications.new_property_pending.line1', [
                'title' => $this->property->title,
                'commercial' => $this->property->commercial?->name ?? '',
            ]))
            ->action(__('notifications.new_property_pending.action'), $url);
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'new_property_pending',
            'property_id' => $this->property->id,
            'property_title' => $this->property->title,
            'commercial_id' => $this->property->commercial_id,
            'commercial_name' => $this->property->commercial?->name,
        ];
    }
}
