<?php

namespace App\Modules\Analytics\Application\Jobs;

use App\Modules\Analytics\Application\Actions\RecordTrackingBatchAction;
use App\Modules\Analytics\Domain\Data\TrackingBatch;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

/**
 * Tracking is written off the request path (PROJECT_RULES.md §21): the
 * collect endpoint answers 202 immediately and this job does the inserts.
 *
 * One attempt only. Page views and form sessions are idempotent on their
 * uuids, but plain events are not, so a retry after a partial failure
 * could double-count clicks. Losing one analytics batch is the safer
 * failure mode.
 */
class ProcessTrackingBatchJob implements ShouldQueue
{
    use Queueable;

    public int $tries = 1;

    public int $timeout = 30;

    public function __construct(public readonly TrackingBatch $batch) {}

    public function handle(RecordTrackingBatchAction $action): void
    {
        $action->execute($this->batch);
    }
}
