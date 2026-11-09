<?php

namespace App\Modules\Lead\Application\Console;

use App\Modules\Lead\Application\DueCallbackNotifier;
use Illuminate\Console\Command;

class NotifyDueCallbacks extends Command
{
    protected $signature = 'leads:notify-callbacks';

    protected $description = 'Notify the responsible commercial of every "À rappeler" lead whose callback time has arrived';

    public function handle(DueCallbackNotifier $notifier): int
    {
        $count = $notifier->run();

        $this->info("Notified {$count} due callback(s).");

        return self::SUCCESS;
    }
}
