<?php

namespace App\Core\Auth\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Replaces Sanctum's default reset notification because this API is
 * headless (CLAUDE.md §2) - the reset link must point at the frontend's
 * own reset-password page, not a Laravel Blade route that doesn't exist.
 */
class ResetPasswordNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(private readonly string $token) {}

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $url = sprintf(
            '%s/reset-password?token=%s&email=%s',
            rtrim((string) config('app.frontend_url'), '/'),
            $this->token,
            urlencode($notifiable->getEmailForPasswordReset())
        );

        return (new MailMessage)
            ->subject(__('notifications.reset_password.subject'))
            ->greeting(__('notifications.reset_password.greeting', ['name' => $notifiable->name]))
            ->line(__('notifications.reset_password.line1'))
            ->action(__('notifications.reset_password.action'), $url)
            ->line(__('notifications.reset_password.line2'))
            ->line(__('notifications.reset_password.line3'));
    }
}
