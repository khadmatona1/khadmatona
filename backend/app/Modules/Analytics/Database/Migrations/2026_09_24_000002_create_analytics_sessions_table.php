<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // One row per visit (30-minute inactivity window). Carries the
        // per-visit aggregates (page count, duration, landing/exit page,
        // conversion) so the dashboard cards read this table only, never a
        // scan of every page view or event.
        Schema::create('analytics_sessions', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('visitor_id')->constrained('analytics_visitors')->cascadeOnDelete();
            $table->timestamp('started_at');
            $table->timestamp('last_activity_at');
            $table->unsignedInteger('duration_seconds')->default(0);
            $table->unsignedInteger('page_views_count')->default(0);
            $table->unsignedInteger('events_count')->default(0);
            $table->string('landing_path', 255)->nullable();
            $table->string('exit_path', 255)->nullable();
            // Host only (e.g. "www.google.com"): a full referrer URL can
            // carry search terms or personal data in its query string.
            $table->string('referrer_host', 255)->nullable();
            // Classified channel (TrafficSource enum) + coarse medium.
            $table->string('source', 30);
            $table->string('medium', 30);
            $table->string('utm_source', 100)->nullable();
            $table->string('utm_medium', 100)->nullable();
            $table->string('utm_campaign', 150)->nullable();
            $table->string('utm_term', 150)->nullable();
            $table->string('utm_content', 150)->nullable();
            $table->string('device_type', 20);
            $table->string('browser', 40)->nullable();
            $table->string('os', 40)->nullable();
            $table->char('country', 2)->nullable();
            $table->string('city', 100)->nullable();
            // "header" when the country came from a proxy/CDN geo header,
            // "timezone" when it was approximated from the browser timezone.
            $table->string('geo_source', 20)->nullable();
            $table->string('locale', 5)->nullable();
            $table->timestamp('converted_at')->nullable();
            $table->timestamps();

            $table->index('started_at');
            $table->index('last_activity_at');
            $table->index(['visitor_id', 'started_at']);
            $table->index(['source', 'started_at']);
            $table->index(['device_type', 'started_at']);
            $table->index(['started_at', 'converted_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('analytics_sessions');
    }
};
