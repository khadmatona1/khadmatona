<?php

namespace App\Modules\Visit\Application\Jobs;

use App\Modules\Visit\Application\VisitConfirmationSender;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;

/**
 * A WhatsApp send is not required to answer the booking/reschedule request
 * (PROJECT_RULES.md §6), so it's queued. Only the visit id is carried, not
 * a model snapshot - VisitConfirmationSender re-reads current data, so a
 * retry (or a reschedule re-dispatch) is always safe.
 */
class SendVisitConfirmationJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable;

    public int $tries = 3;

    public function __construct(public readonly int $visitId) {}

    public function handle(VisitConfirmationSender $sender): void
    {
        $sender->send($this->visitId);
    }
}
