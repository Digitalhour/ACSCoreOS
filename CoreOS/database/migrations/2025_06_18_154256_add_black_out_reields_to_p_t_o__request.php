<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pto_requests', function (Blueprint $table) {
            // Store blackout validation results
            $table->json('blackout_conflicts')->nullable()->after('attachments');
            $table->json('blackout_warnings')->nullable()->after('blackout_conflicts');

            // Track user acknowledgments and overrides
            $table->boolean('blackout_warnings_acknowledged')->default(false)->after('blackout_warnings');
            $table->timestamp('blackout_acknowledged_at')->nullable()->after('blackout_warnings_acknowledged');
            $table->text('blackout_override_reason')->nullable()->after('blackout_acknowledged_at');
            $table->boolean('is_emergency_override')->default(false)->after('blackout_override_reason');
            $table->foreignId('override_approved_by_id')->nullable()->constrained('users')->after('is_emergency_override');
            $table->timestamp('override_approved_at')->nullable()->after('override_approved_by_id');

            // Store blackout snapshot for historical context
            $table->json('blackout_snapshot')->nullable()->after('override_approved_at');
        });
    }

    public function down(): void
    {
        Schema::table('pto_requests', function (Blueprint $table) {
            $table->dropColumn([
                'blackout_conflicts',
                'blackout_warnings',
                'blackout_warnings_acknowledged',
                'blackout_acknowledged_at',
                'blackout_override_reason',
                'is_emergency_override',
                'override_approved_by_id',
                'override_approved_at',
                'blackout_snapshot'
            ]);
        });
    }
};
