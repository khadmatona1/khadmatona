<?php

namespace App\Modules\Property\Domain\Events;

use Illuminate\Foundation\Events\Dispatchable;

/**
 * Fired the moment a property's approval_status transitions into Approved -
 * a brand-new SeniorCommercial submission, an Admin approve() action, or an
 * edit that puts a previously-approved/rejected listing straight back to
 * Approved (SeniorCommercial's edits skip the review queue entirely). Never
 * fired for a no-op save that leaves an already-approved property approved.
 *
 * Carries only the primitive id, not the Property model - listeners (e.g.
 * PropertyAlert) must re-read current data themselves rather than trust a
 * snapshot that may already be stale by the time the (queued) listener
 * runs, and per PROJECT_RULES.md §3 this is the sanctioned way another
 * module reacts to a Property change without importing Property's Eloquent
 * model.
 */
class PropertyApproved
{
    use Dispatchable;

    public function __construct(public readonly int $propertyId) {}
}
