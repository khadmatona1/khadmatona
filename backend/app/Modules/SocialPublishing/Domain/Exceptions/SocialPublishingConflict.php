<?php

namespace App\Modules\SocialPublishing\Domain\Exceptions;

use App\Core\Support\Http\ApiResponse;
use Illuminate\Http\JsonResponse;
use RuntimeException;

/** A request that is well-formed but cannot happen given the current state. */
class SocialPublishingConflict extends RuntimeException
{
    public function __construct(public readonly string $errorCode, ?string $message = null, private readonly int $status = 409)
    {
        parent::__construct($message ?? __("social.errors.{$errorCode}"));
    }

    public static function notConfigured(): self
    {
        return new self('meta_not_configured', status: 503);
    }

    public function render(): JsonResponse
    {
        return ApiResponse::error($this->getMessage(), [], $this->status, $this->errorCode);
    }
}
