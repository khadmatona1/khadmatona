<?php

namespace App\Modules\SocialPublishing\Domain\Enums;

enum FailureKind: string
{
    /** Nothing was published and trying again later can work. */
    case Retryable = 'retryable';

    /** The stored token was rejected - only a new Meta login fixes this. */
    case TokenInvalid = 'token_invalid';

    /** Retrying the same request cannot succeed (bad image, missing permission...). */
    case Permanent = 'permanent';

    /**
     * The final publish call died without an answer, so the post may be
     * live. Never retried automatically - that's how duplicates happen.
     */
    case OutcomeUnknown = 'outcome_unknown';
}
