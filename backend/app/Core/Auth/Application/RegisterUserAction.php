<?php

namespace App\Core\Auth\Application;

use App\Core\Auth\Domain\Contracts\UserRepositoryInterface;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class RegisterUserAction
{
    public function __construct(private readonly UserRepositoryInterface $users) {}

    /**
     * @param  array{name: string, email: string, password: string}  $data
     */
    public function execute(Request $request, array $data): User
    {
        /** @var User $user */
        $user = $this->users->create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => $data['password'],
        ]);

        // create() doesn't reflect column defaults the database applied
        // server-side (locale/theme_preference) - refresh so the response
        // and the session-authenticated user both see the real stored values.
        $user->refresh();

        Auth::guard('web')->login($user);
        $request->session()->regenerate();

        return $user;
    }
}
