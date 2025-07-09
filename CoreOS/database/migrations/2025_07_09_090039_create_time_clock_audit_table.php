<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('time_clock_audits', function (Blueprint $table) {
            $table->id();
            $table->foreignId('time_clock_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->enum('action', ['clock_in', 'clock_out', 'break_start', 'break_end', 'manual_edit']);
            $table->timestamp('action_timestamp');
            $table->string('ip_address', 45); // IPv6 support
            $table->text('user_agent')->nullable();
            $table->json('device_info')->nullable(); // Browser, OS, etc.
            $table->json('location_data')->nullable(); // GPS coordinates, geolocation
            $table->foreignId('edited_by')->nullable()->constrained('users')->nullOnDelete(); // For manual edits
            $table->json('previous_data')->nullable(); // Store old values for edits
            $table->json('new_data')->nullable(); // Store new values for edits
            $table->text('edit_reason')->nullable(); // Reason for manual edit
            $table->timestamps();

            // Indexes
            $table->index(['time_clock_id', 'action']);
            $table->index(['user_id', 'action_timestamp']);
            $table->index('ip_address');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('time_clock_audits');
    }
};
