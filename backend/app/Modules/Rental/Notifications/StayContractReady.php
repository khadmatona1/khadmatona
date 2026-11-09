<?php

namespace App\Modules\Rental\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class StayContractReady extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        private readonly string $guestName,
        private readonly string $bookingReference,
        private readonly string $accessToken,
    ) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $url = sprintf(
            '%s/stay-contract/%s',
            rtrim((string) config('app.frontend_url'), '/'),
            rawurlencode($this->accessToken),
        );

        return (new MailMessage)
            ->subject(__('stay_contract.email.subject'))
            ->greeting(__('stay_contract.email.greeting', ['name' => $this->guestName]))
            ->line(__('stay_contract.email.confirmed', ['reference' => $this->bookingReference]))
            ->line(__('stay_contract.email.instructions'))
            ->action(__('stay_contract.email.action'), $url)
            ->line(__('stay_contract.email.security'));
    }
}
