<?php

namespace App\Modules\SocialPublishing\Infrastructure;

use App\Modules\SocialPublishing\Domain\Contracts\MetaGraphClient;
use App\Modules\SocialPublishing\Domain\Enums\FailureKind;
use App\Modules\SocialPublishing\Domain\Exceptions\PublishFailure;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Meta's Graph API over plain HTTP - no vendor SDK, same approach as
 * WhatsApp's MetaCloudApiGateway. Instagram is reached through the Facebook
 * Login path (graph.facebook.com + the linked Page's token), so one login
 * connects both platforms.
 *
 * Tokens travel in the Authorization header rather than the query string,
 * and transport exception messages are never logged or stored, since they
 * embed the request URL (which holds the app secret during the OAuth exchange).
 */
class MetaGraphApiClient implements MetaGraphClient
{
    /** @see https://developers.facebook.com/docs/graph-api/guides/error-handling/ */
    private const TOKEN_CODES = [102, 190];

    private const TOKEN_SUBCODES = [458, 459, 460, 463, 464, 467];

    private const THROTTLE_CODES = [4, 17, 32, 341, 613, 80001];

    private const TRANSIENT_CODES = [1, 2];

    public function isConfigured(): bool
    {
        return filled($this->config('app_id')) && filled($this->config('app_secret'));
    }

    public function authorizationUrl(string $state): string
    {
        $params = [
            'client_id' => $this->config('app_id'),
            'redirect_uri' => $this->redirectUri(),
            'state' => $state,
            'response_type' => 'code',
        ];

        // Facebook Login for Business defines its permissions in a saved
        // configuration; plain Facebook Login lists them here.
        if (filled($this->config('login_config_id'))) {
            $params['config_id'] = $this->config('login_config_id');
        } else {
            $params['scope'] = $this->config('scopes');
        }

        return "https://www.facebook.com/{$this->version()}/dialog/oauth?".http_build_query($params);
    }

    public function exchangeCode(string $code): string
    {
        $shortLived = $this->send(fn (PendingRequest $http) => $http->get($this->url('oauth/access_token'), [
            'client_id' => $this->config('app_id'),
            'client_secret' => $this->config('app_secret'),
            'redirect_uri' => $this->redirectUri(),
            'code' => $code,
        ]), 'oauth_code_exchange');

        $longLived = $this->send(fn (PendingRequest $http) => $http->get($this->url('oauth/access_token'), [
            'grant_type' => 'fb_exchange_token',
            'client_id' => $this->config('app_id'),
            'client_secret' => $this->config('app_secret'),
            'fb_exchange_token' => (string) $shortLived->json('access_token'),
        ]), 'oauth_long_lived_exchange');

        return $this->requireString($longLived, 'access_token', 'oauth_long_lived_exchange');
    }

    public function listPages(string $userToken): array
    {
        $response = $this->send(fn (PendingRequest $http) => $http->withToken($userToken)->get($this->url('me/accounts'), [
            'fields' => 'id,name,access_token,tasks,instagram_business_account{id,username}',
            'limit' => 100,
        ]), 'list_pages');

        return collect($response->json('data', []))
            // Absent `tasks` is left to Meta to refuse at publish time.
            ->filter(fn (array $page) => ! isset($page['tasks']) || in_array('CREATE_CONTENT', $page['tasks'], true))
            ->map(fn (array $page) => [
                'id' => (string) $page['id'],
                'name' => (string) $page['name'],
                'access_token' => (string) $page['access_token'],
                'instagram' => isset($page['instagram_business_account']['id']) ? [
                    'id' => (string) $page['instagram_business_account']['id'],
                    'username' => (string) ($page['instagram_business_account']['username'] ?? ''),
                ] : null,
            ])
            ->values()
            ->all();
    }

    public function verifyToken(string $token): void
    {
        $this->send(fn (PendingRequest $http) => $http->withToken($token)->get($this->url('me'), ['fields' => 'id']), 'verify_token');
    }

    public function uploadUnpublishedPhoto(string $pageId, string $token, string $imageUrl): string
    {
        $response = $this->send(fn (PendingRequest $http) => $http->withToken($token)->asForm()->post($this->url("{$pageId}/photos"), [
            'url' => $imageUrl,
            'published' => 'false',
        ]), 'facebook_upload_photo');

        return $this->requireString($response, 'id', 'facebook_upload_photo');
    }

    public function publishFeedPost(string $pageId, string $token, string $message, array $photoIds, ?string $link = null): string
    {
        $payload = ['message' => $message];

        foreach (array_values($photoIds) as $index => $photoId) {
            $payload['attached_media'][$index] = json_encode(['media_fbid' => $photoId]);
        }

        if ($photoIds === [] && $link !== null) {
            $payload['link'] = $link;
        }

        $response = $this->send(
            fn (PendingRequest $http) => $http->withToken($token)->asForm()->post($this->url("{$pageId}/feed"), $payload),
            'facebook_publish',
        );

        return $this->requireString($response, 'id', 'facebook_publish');
    }

    public function createImageContainer(string $igUserId, string $token, string $imageUrl, ?string $caption, bool $isCarouselItem): string
    {
        $payload = ['image_url' => $imageUrl];

        if ($isCarouselItem) {
            $payload['is_carousel_item'] = 'true';
        } else {
            $payload['caption'] = (string) $caption;
        }

        $response = $this->send(
            fn (PendingRequest $http) => $http->withToken($token)->asForm()->post($this->url("{$igUserId}/media"), $payload),
            'instagram_create_container',
        );

        return $this->requireString($response, 'id', 'instagram_create_container');
    }

    public function createCarouselContainer(string $igUserId, string $token, array $childContainerIds, string $caption): string
    {
        $response = $this->send(fn (PendingRequest $http) => $http->withToken($token)->asForm()->post($this->url("{$igUserId}/media"), [
            'media_type' => 'CAROUSEL',
            'children' => implode(',', $childContainerIds),
            'caption' => $caption,
        ]), 'instagram_create_carousel');

        return $this->requireString($response, 'id', 'instagram_create_carousel');
    }

    public function containerStatus(string $containerId, string $token): string
    {
        $response = $this->send(fn (PendingRequest $http) => $http->withToken($token)->get($this->url($containerId), [
            'fields' => 'status_code',
        ]), 'instagram_container_status');

        return $this->requireString($response, 'status_code', 'instagram_container_status');
    }

    public function publishContainer(string $igUserId, string $token, string $containerId): string
    {
        $response = $this->send(fn (PendingRequest $http) => $http->withToken($token)->asForm()->post($this->url("{$igUserId}/media_publish"), [
            'creation_id' => $containerId,
        ]), 'instagram_publish');

        return $this->requireString($response, 'id', 'instagram_publish');
    }

    public function publishingQuota(string $igUserId, string $token): array
    {
        $response = $this->send(fn (PendingRequest $http) => $http->withToken($token)->get($this->url("{$igUserId}/content_publishing_limit"), [
            'fields' => 'config,quota_usage',
        ]), 'instagram_quota');

        $total = $response->json('data.0.config.quota_total');

        return [
            'usage' => (int) $response->json('data.0.quota_usage', 0),
            'total' => is_numeric($total) ? (int) $total : null,
        ];
    }

    /**
     * Runs one call, classifying every failure into a PublishFailure.
     *
     * @param  callable(PendingRequest): Response  $call
     */
    private function send(callable $call, string $operation): Response
    {
        try {
            $response = $call(Http::acceptJson()->timeout(20));
        } catch (ConnectionException) {
            Log::warning('social.connection_failed', ['operation' => $operation]);

            throw $this->transportFailure($operation);
        }

        if ($response->successful()) {
            return $response;
        }

        $error = $response->json('error', []);
        $error = is_array($error) ? $error : [];
        $code = (int) ($error['code'] ?? 0);
        $subcode = (int) ($error['error_subcode'] ?? 0);
        $message = $this->safeMessage($error);

        Log::warning('social.request_failed', [
            'operation' => $operation,
            'http_status' => $response->status(),
            'meta_code' => $code,
            'meta_subcode' => $subcode ?: null,
            'fbtrace_id' => $error['fbtrace_id'] ?? null,
            'message' => $message,
        ]);

        if (in_array($code, self::TOKEN_CODES, true) || in_array($subcode, self::TOKEN_SUBCODES, true)) {
            throw PublishFailure::tokenInvalid();
        }

        if (in_array($code, self::THROTTLE_CODES, true)) {
            throw PublishFailure::retryable('rate_limited', retryAfterSeconds: 900);
        }

        if ($response->serverError() || in_array($code, self::TRANSIENT_CODES, true) || ($error['is_transient'] ?? false) === true) {
            throw $this->transportFailure($operation);
        }

        throw PublishFailure::permanent('meta_rejected', __('social.errors.meta_rejected', ['reason' => $message]));
    }

    /** The feed POST is the one call that can't be repeated blind. */
    private function transportFailure(string $operation): PublishFailure
    {
        return $operation === 'facebook_publish'
            ? PublishFailure::outcomeUnknown()
            : PublishFailure::retryable('meta_unreachable');
    }

    /** @param  array<string, mixed>  $error */
    private function safeMessage(array $error): string
    {
        $message = (string) ($error['error_user_msg'] ?? $error['message'] ?? 'Unknown Meta API error.');

        return mb_substr((string) preg_replace('/(access_token|client_secret)=[^&\s]+/i', '$1=[redacted]', $message), 0, 500);
    }

    private function requireString(Response $response, string $key, string $operation): string
    {
        $value = $response->json($key);

        if (! is_scalar($value) || (string) $value === '') {
            Log::warning('social.unexpected_response', ['operation' => $operation]);

            throw new PublishFailure(
                __('social.errors.unexpected_response'),
                $operation === 'facebook_publish' ? FailureKind::OutcomeUnknown : FailureKind::Permanent,
                'unexpected_response',
            );
        }

        return (string) $value;
    }

    private function redirectUri(): string
    {
        return (string) ($this->config('redirect_uri')
            ?: rtrim((string) config('app.frontend_url'), '/').'/dashboard/settings/social/callback');
    }

    private function url(string $path): string
    {
        return "https://graph.facebook.com/{$this->version()}/".ltrim($path, '/');
    }

    private function version(): string
    {
        return (string) ($this->config('api_version') ?: 'v26.0');
    }

    private function config(string $key): mixed
    {
        return config("services.meta_social.{$key}");
    }
}
