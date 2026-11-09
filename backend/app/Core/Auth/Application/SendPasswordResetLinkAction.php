<?php

namespace App\Core\Auth\Application;

use Illuminate\Support\Facades\Password;
use Illuminate\Validation\ValidationException;

class SendPasswordResetLinkAction
{
    public function execute(string $email): void
    {
        $status = Password::broker()->sendResetLink(['email' => $email]);

        if ($status === Password::RESET_THROTTLED) {
            throw ValidationException::withMessages([
                'email' => [__($status)],
            ]);
        }

        // A "no account for this email" outcome is deliberately treated the
        // same as "link sent" by the caller - this endpoint must not be
        // usable to enumerate registered emails (PROJECT_RULES.md §22).
    }
}
