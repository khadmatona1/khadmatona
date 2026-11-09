<?php

namespace App\Modules\SocialPublishing\Application;

use App\Modules\SocialPublishing\Domain\Contracts\MetaGraphClient;
use App\Modules\SocialPublishing\Domain\Contracts\SocialAccountRepositoryInterface;
use App\Modules\SocialPublishing\Domain\Enums\SocialPlatform;
use App\Modules\SocialPublishing\Domain\Exceptions\PublishFailure;
use App\Modules\SocialPublishing\Domain\Exceptions\SocialPublishingConflict;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Str;

/**
 * The Facebook Login flow: consent, then the Admin picks a Page, then that
 * Page's non-expiring token (and its linked Instagram account) are stored.
 * The long-lived User token is only kept, encrypted, for that short pick.
 */
class SocialConnectionService
{
    private const STATE_TTL_SECONDS = 600;

    private const PENDING_TTL_SECONDS = 900;

    public function __construct(
        private readonly MetaGraphClient $meta,
        private readonly SocialAccountRepositoryInterface $accounts,
    ) {}

    public function authorizationUrl(int $userId): string
    {
        $this->ensureConfigured();

        $state = Str::random(40);
        Cache::put($this->stateKey($state), $userId, self::STATE_TTL_SECONDS);

        return $this->meta->authorizationUrl($state);
    }

    /**
     * @return array<int, array{id: string, name: string, instagram: array{id: string, username: string}|null}>
     */
    public function completeLogin(int $userId, string $code, string $state): array
    {
        $this->ensureConfigured();

        // Single-use and bound to the Admin who started the flow (CSRF).
        if (Cache::pull($this->stateKey($state)) !== $userId) {
            throw new SocialPublishingConflict('invalid_oauth_state', status: 422);
        }

        $userToken = $this->translatingFailures(fn () => $this->meta->exchangeCode($code));
        $pages = $this->translatingFailures(fn () => $this->meta->listPages($userToken));

        Cache::put($this->pendingKey($userId), Crypt::encryptString($userToken), self::PENDING_TTL_SECONDS);

        return array_map(fn (array $page) => [
            'id' => $page['id'],
            'name' => $page['name'],
            'instagram' => $page['instagram'],
        ], $pages);
    }

    public function connectPage(int $userId, string $pageId): void
    {
        $pending = Cache::get($this->pendingKey($userId));

        if (! is_string($pending)) {
            throw new SocialPublishingConflict('oauth_session_expired');
        }

        $pages = $this->translatingFailures(fn () => $this->meta->listPages(Crypt::decryptString($pending)));
        $page = collect($pages)->firstWhere('id', $pageId);

        if ($page === null) {
            throw new SocialPublishingConflict('page_not_available');
        }

        $this->accounts->connect(SocialPlatform::Facebook, $page['id'], $page['name'], $page['access_token'], $userId);

        $keep = [SocialPlatform::Facebook];

        if ($page['instagram'] !== null) {
            $this->accounts->connect(SocialPlatform::Instagram, $page['instagram']['id'], $page['instagram']['username'], $page['access_token'], $userId);
            $keep[] = SocialPlatform::Instagram;
        }

        // A Page without Instagram must not leave a previous Page's account behind.
        $this->accounts->disconnectExcept($keep);
        Cache::forget($this->pendingKey($userId));
    }

    public function disconnect(): void
    {
        $this->accounts->disconnectExcept([]);
    }

    /** Live check of the stored token, flagging the accounts if Meta refuses it. */
    public function verify(): void
    {
        $account = $this->accounts->forPlatform(SocialPlatform::Facebook);

        if ($account === null) {
            throw new SocialPublishingConflict('account_not_connected');
        }

        try {
            $this->meta->verifyToken($account->access_token);
        } catch (PublishFailure $failure) {
            if ($failure->errorCode === 'token_invalid') {
                $this->accounts->markAllNeedReconnect();
            }

            throw new SocialPublishingConflict($failure->errorCode, $failure->getMessage());
        }
    }

    /**
     * @template T
     *
     * @param  callable(): T  $call
     * @return T
     */
    private function translatingFailures(callable $call): mixed
    {
        try {
            return $call();
        } catch (PublishFailure $failure) {
            throw new SocialPublishingConflict($failure->errorCode, $failure->getMessage(), 502);
        }
    }

    private function ensureConfigured(): void
    {
        if (! $this->meta->isConfigured()) {
            throw SocialPublishingConflict::notConfigured();
        }
    }

    private function stateKey(string $state): string
    {
        return 'social.oauth.state.'.hash('sha256', $state);
    }

    private function pendingKey(int $userId): string
    {
        return "social.oauth.pending.{$userId}";
    }
}
