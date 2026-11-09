<?php

namespace App\Modules\SocialPublishing\Application\Jobs;

use App\Modules\SocialPublishing\Application\PublicationRunner;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Throwable;

/**
 * One job per platform, so a Facebook failure can never touch Instagram.
 * Carries only the publication id - the runner re-reads current data, and
 * its atomic claim makes a duplicate delivery harmless.
 */
class PublishPropertyToSocialJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable;

    public int $tries = 5;

    /** Must stay below the queue connection's retry_after (90s by default). */
    public int $timeout = 80;

    public function __construct(public readonly int $publicationId) {}

    /** @return array<int, int> */
    public function backoff(): array
    {
        return [60, 300, 900, 1800];
    }

    public function handle(PublicationRunner $runner): void
    {
        // Stored errors are read by Admins in the French back-office; a queue
        // worker has no request locale to inherit.
        app()->setLocale('fr');

        $delay = $runner->run($this->publicationId);

        if ($delay !== null) {
            $this->release($delay);
        }
    }

    public function failed(?Throwable $exception): void
    {
        app(PublicationRunner::class)->giveUp($this->publicationId);
    }
}
