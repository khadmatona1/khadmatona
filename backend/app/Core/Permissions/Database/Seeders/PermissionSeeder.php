<?php

namespace App\Core\Permissions\Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

/**
 * Seeds only what the MVP needs: an Admin role and the permissions the
 * current modules (Property, Lead, Lookup, Settings) actually check.
 * Future roles (Agent, Owner, Client, Artisan, ...) are added later as
 * data, not as changes to this seeder's structure.
 */
class PermissionSeeder extends Seeder
{
    public function run(): void
    {
        // Required by spatie/laravel-permission: a stale cached permission
        // list (e.g. warmed empty by an earlier request) would otherwise
        // shadow the rows this seeder is about to create.
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $permissions = [
            'access-admin-panel',
            'manage-properties',
            'manage-leads',
            'manage-commercial-leads',
            'manage-lookups',
            'manage-settings',
            'manage-users',
            'manage-own-properties',
            'view-own-leads',
            'publish-own-properties',
            // Visitor analytics. Enforced by route `role:Admin`, like the
            // rest of this list, and recorded here for role bookkeeping.
            'view-analytics',
        ];

        foreach ($permissions as $permission) {
            Permission::findOrCreate($permission);
        }

        $admin = Role::findOrCreate('Admin');
        $admin->syncPermissions($permissions);

        // Real enforcement for Commercial is role-based (role:Admin|Commercial
        // route middleware + PropertyPolicy/LeadPolicy ownership checks),
        // matching how every other role/permission in this app is actually
        // checked today - these two permissions are seeded for future
        // role-granularity bookkeeping only, same as the rest of this list.
        $commercial = Role::findOrCreate('Commercial');
        $commercial->syncPermissions(['manage-own-properties', 'view-own-leads']);

        // SeniorCommercial: same ownership scope as Commercial (own
        // properties/leads only, never another Commercial's), but skips the
        // Admin review queue entirely - PropertyController::applyOwnership()
        // publishes their listings as approved immediately, on both create
        // and edit. publish-own-properties documents that extra capability;
        // like the rest of this list, it's bookkeeping only - the actual
        // bypass is the role check in applyOwnership(), not this permission.
        $seniorCommercial = Role::findOrCreate('SeniorCommercial');
        $seniorCommercial->syncPermissions(['manage-own-properties', 'view-own-leads', 'publish-own-properties']);

        // Owner (Espace Propriétaire): a read-only role, exactly the future
        // role this seeder's own docblock anticipated - pure data, no new
        // permissions or seeder-structure change. Enforcement is entirely
        // route `role:Owner` middleware + PropertyFilter/PropertyPolicy
        // scoping on `owner_contact_id`, same posture Commercial already has
        // for `commercial_id`.
        Role::findOrCreate('Owner');
    }
}
