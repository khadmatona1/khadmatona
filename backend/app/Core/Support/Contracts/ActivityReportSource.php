<?php

namespace App\Core\Support\Contracts;

interface ActivityReportSource
{
    /** Counts by current assignee. All dates use the agency timezone. */
    public function counts(string $from, string $to, ?int $commercialId): array;
}
