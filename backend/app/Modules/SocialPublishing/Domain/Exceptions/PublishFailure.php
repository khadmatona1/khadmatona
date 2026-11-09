<?php

namespace App\Modules\SocialPublishing\Domain\Exceptions;

use App\Modules\SocialPublishing\Domain\Enums\FailureKind;
use RuntimeException;

/**
 * Every way a publication attempt can fail, classified by what the caller
 * should do next. The message is safe to store and show to an Admin - it
 * never carries a token or a request URL.
 */
class PublishFailure extends RuntimeException
{
    public function __construct(
        string $message,
        public readonly FailureKind $kind,
        public readonly string $errorCode,
        public readonly ?int $retryAfterSeconds = null,
    ) {
        parent::__construct($message);
    }

    public static function permanent(string $errorCode, ?string $message = null): self
    {
        return new self($message ?? __("social.errors.{$errorCode}"), FailureKind::Permanent, $errorCode);
    }

    public static function retryable(string $errorCode, ?string $message = null, ?int $retryAfterSeconds = null): self
    {
        return new self($message ?? __("social.errors.{$errorCode}"), FailureKind::Retryable, $errorCode, $retryAfterSeconds);
    }

    public static function tokenInvalid(): self
    {
        return new self(__('social.errors.token_invalid'), FailureKind::TokenInvalid, 'token_invalid');
    }

    public static function outcomeUnknown(): self
    {
        return new self(__('social.errors.outcome_unknown'), FailureKind::OutcomeUnknown, 'outcome_unknown');
    }
}
