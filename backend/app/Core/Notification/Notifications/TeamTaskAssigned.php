<?php

namespace App\Core\Notification\Notifications;

use Illuminate\Notifications\Notification;

class TeamTaskAssigned extends Notification
{
    public function __construct(private readonly int $taskId, private readonly string $title) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return ['type' => 'team_task_assigned', 'task_id' => $this->taskId, 'title' => $this->title];
    }
}
