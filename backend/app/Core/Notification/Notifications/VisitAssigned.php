<?php

namespace App\Core\Notification\Notifications;

use App\Modules\Visit\Domain\Models\Visit;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Queue\SerializesModels;

/**
 * "A visit now concerns you" - sent whenever a Visit's `commercial_id`
 * becomes set: at booking time (CreateVisitAction, auto-assigned from the
 * property's owner) or via an explicit reassignment
 * (VisitController::assign()). Goes to that commercial, or every Admin when
 * the visit has none (mirrors DueCallbackNotifier's fallback). Delivered on
 * both the dashboard bell and by mail.
 *
 * `$leadName`/`$propertyTitle` are passed in already resolved rather than
 * read off `Visit` relations - Visit deliberately has no Eloquent relation
 * to Lead/Property (peer business modules, PROJECT_RULES.md §3), so the
 * dispatch site (which already holds both via their repository interfaces)
 * supplies them directly, same spirit as LeadCallbackDue/
 * NewPropertyPendingApproval taking a fully-loaded model.
 */
class VisitAssigned extends Notification implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        private readonly Visit $visit,
        private readonly ?string $leadName,
        private readonly ?string $propertyTitle,
    ) {}

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail', 'database'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        // A pure Commercial/SeniorCommercial is redirected away from the
        // Admin-only /dashboard/visits path (see dashboard/layout.tsx's
        // route gating) - route each recipient to the calendar they can
        // actually reach.
        $path = $notifiable->hasRole('Admin') ? '/dashboard/visits' : '/dashboard/commercial/visits';
        $url = rtrim((string) config('app.frontend_url'), '/').$path;

        return (new MailMessage)
            ->subject(__('notifications.visit_assigned.subject'))
            ->greeting(__('notifications.visit_assigned.greeting', ['name' => $notifiable->name]))
            ->line(__('notifications.visit_assigned.line1', [
                'lead' => $this->leadName ?? '',
                'property' => $this->propertyTitle ?? '',
                'when' => $this->visit->scheduled_at->timezone(config('app.business_timezone'))->format('d/m/Y H:i'),
            ]))
            ->action(__('notifications.visit_assigned.action'), $url);
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'visit_assigned',
            'visit_id' => $this->visit->id,
            'property_title' => $this->propertyTitle,
            'lead_name' => $this->leadName,
            'scheduled_at' => $this->visit->scheduled_at->toIso8601String(),
        ];
    }
}
