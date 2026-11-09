<?php

namespace App\Modules\OwnerPortal;

use Illuminate\Support\ServiceProvider;

/**
 * Read-only aggregation over Property/Lead/Visit for the Owner Portal - no
 * repository bindings of its own (it only consumes PropertyRepositoryInterface/
 * LeadRepositoryInterface/VisitRepositoryInterface, already bound by their
 * own modules' service providers), and no migrations (owner_contact_id
 * lives on Property, contact_id lives on users - both owned by their
 * respective modules).
 */
class OwnerPortalServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        // Routes are required directly from routes/api.php (not via
        // loadRoutesFrom here) so they inherit the api/v1 prefix and
        // `api` middleware group set up in bootstrap/app.php.
    }
}
