<?php

use App\Core\Localization\Http\Middleware\SetLocale;
use App\Core\Support\Http\ApiResponse;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Exceptions\ThrottleRequestsException;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Spatie\Permission\Exceptions\UnauthorizedException;
use Spatie\Permission\Middleware\RoleMiddleware;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        apiPrefix: 'api/v1',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Lets Sanctum authenticate first-party SPA requests via a session
        // cookie instead of a bearer token (CLAUDE.md §3: SPA cookie + token
        // abilities).
        $middleware->statefulApi();

        $middleware->appendToGroup('api', [
            SetLocale::class,
        ]);

        // This is an API-only app (CLAUDE.md §2: "no server-rendered public
        // website in this repository") - there is no named `login` route to
        // redirect guests to. Without this, Laravel's default Authenticate
        // middleware calls route('login') for any unauthenticated request
        // that doesn't explicitly send `Accept: application/json`, which
        // throws a RouteNotFoundException instead of the intended 401.
        // Returning null here makes it fall through to AuthenticationException,
        // already mapped to a clean 401 JSON response below.
        $middleware->redirectGuestsTo(fn () => null);

        // Registered so admin route groups can require 'role:Admin', not
        // just 'auth:sanctum' - a self-registered user has no role, and
        // without this alias every admin endpoint only checked that
        // *someone* was logged in, not that they were an Admin.
        $middleware->alias([
            'role' => RoleMiddleware::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->render(function (ValidationException $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return ApiResponse::error($e->getMessage(), $e->errors(), 422, 'validation_error');
            }
        });

        $exceptions->render(function (ThrottleRequestsException $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return ApiResponse::error('Too many attempts. Please try again later.', [], 429, 'too_many_requests');
            }
        });

        $exceptions->render(function (AuthenticationException $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return ApiResponse::error($e->getMessage(), [], 401, 'unauthenticated');
            }
        });

        // Illuminate\Auth\Access\AuthorizationException (thrown by
        // Gate::authorize()/$this->authorize() on a policy denial) never
        // reaches a render() callback registered under its own class -
        // Handler::render() calls prepareException() first, which
        // unconditionally rewrites a status-less AuthorizationException
        // into this Symfony exception before any custom callback is
        // checked. Registering against AccessDeniedHttpException is the
        // only way to actually intercept it.
        $exceptions->render(function (AccessDeniedHttpException $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return ApiResponse::error($e->getMessage() ?: 'This action is unauthorized.', [], 403, 'forbidden');
            }
        });

        // Thrown by the 'role:' middleware alias (spatie/laravel-permission)
        // when an authenticated user lacks the required role - without this,
        // it fell through to the generic Throwable handler below and either
        // leaked a raw debug stack trace (local) or misreported a clean 403
        // as a 500 "Server error" (production).
        $exceptions->render(function (UnauthorizedException $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return ApiResponse::error($e->getMessage(), [], 403, 'forbidden');
            }
        });

        $exceptions->render(function (ModelNotFoundException|NotFoundHttpException $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return ApiResponse::error('Resource not found.', [], 404, 'not_found');
            }
        });

        $exceptions->render(function (Throwable $e, Request $request) {
            if (($request->is('api/*') || $request->expectsJson()) && ! app()->hasDebugModeEnabled()) {
                return ApiResponse::error('Server error.', [], 500, 'server_error');
            }
        });
    })->create();
