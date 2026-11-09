<?php

namespace App\Core\Auth\Application;

use App\Core\Auth\Domain\Contracts\UserRepositoryInterface;
use App\Models\User;

/**
 * Admin creating *someone else's* account - unlike RegisterUserAction (which
 * also logs the caller in as the new user), this never touches the current
 * session and assigns a role up front.
 */
class CreateUserAction
{
    public function __construct(private readonly UserRepositoryInterface $users) {}

    /**
     * @param  array{name: string, email: string, password: string, role: string, contact_id?: int|null}  $data
     */
    public function execute(array $data): User
    {
        /** @var User $user */
        $user = $this->users->create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => $data['password'],
            'contact_id' => $data['contact_id'] ?? null,
        ]);

        $user->assignRole($data['role']);

        // create() doesn't reflect column defaults the database applied
        // server-side (locale/theme_preference) - refresh so the response
        // reflects the real stored values, matching RegisterUserAction.
        $user->refresh();

        return $user;
    }
}
