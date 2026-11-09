<?php

namespace App\Core\Support\Http;

use Illuminate\Http\JsonResponse;

/**
 * The one place that decides what a JSON response from this API looks
 * like, so every module's controllers - MVP or future - produce the
 * same envelope shape.
 */
class ApiResponse
{
    public static function success(mixed $data = null, array $meta = [], int $status = 200): JsonResponse
    {
        $payload = ['success' => true, 'data' => $data];

        if ($meta !== []) {
            $payload['meta'] = $meta;
        }

        return response()->json($payload, $status);
    }

    public static function error(string $message, array $errors = [], int $status = 422, ?string $code = null): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => $message,
            'errors' => $errors,
            'code' => $code,
        ], $status);
    }
}
