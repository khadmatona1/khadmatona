<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('leads', function (Blueprint $table) {
            // Only set for sell_request/rent_request leads - see
            // StoreLeadRequest. `property_details` holds whatever fields the
            // selected property_type calls for (a flat key => value map) so
            // adding a new type/field later doesn't need a new migration.
            $table->string('property_type')->nullable()->after('type');
            $table->string('city')->nullable()->after('message');
            $table->string('district')->nullable()->after('city');
            $table->string('address')->nullable()->after('district');
            $table->json('property_details')->nullable()->after('address');
        });
    }

    public function down(): void
    {
        Schema::table('leads', function (Blueprint $table) {
            $table->dropColumn(['property_type', 'city', 'district', 'address', 'property_details']);
        });
    }
};
