<?php

namespace App\Core\Auth\Application;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

class LoginAction
{
    /**
     * @param  array{email: string, password: string}  $credentials
     */
    public function execute(Request $request, array $credentials, bool $remember): User
    {
        if (! Auth::guard('web')->attempt($credentials, $remember)) {
            throw ValidationException::withMessages([
                'email' => __('auth.failed'),
            ]);
        }

        /** @var User $user */
        $user = Auth::guard('web')->user();

        if (! $user->is_active) {
            Auth::guard('web')->logout();

            throw ValidationException::withMessages([
                'email' => __('auth.deactivated'),
            ]);
        }

        $request->session()->regenerate();

        // Sidebar/dashboard routing need the role immediately after login,
        // not just after a follow-up /auth/me round trip - UserResource
        // reads `roles` via whenLoaded(), which is silently omitted unless
        // this is here.
        return $user->load('roles');
    }
}
