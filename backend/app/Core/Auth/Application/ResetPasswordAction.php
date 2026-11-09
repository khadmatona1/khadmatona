<?php

namespace App\Core\Auth\Application;

use App\Core\Auth\Domain\Contracts\UserRepositoryInterface;
use App\Models\User;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\ValidationException;

class ResetPasswordAction
{
    public function __construct(private readonly UserRepositoryInterface $users) {}

    /**
     * @param  array{token: string, email: string, password: string}  $data
     */
    public function execute(array $data): void
    {
        $status = Password::broker()->reset(
            $data,
            function (User $user, string $password): void {
                $this->users->update($user, ['password' => $password]);

                Event::dispatch(new PasswordReset($user));
            }
        );

        if ($status !== Password::PASSWORD_RESET) {
            throw ValidationException::withMessages([
                'email' => [__($status)],
            ]);
        }
    }
}
