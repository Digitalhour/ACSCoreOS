<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('time_adjustments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('time_entry_id')->nullable()->constrained();
            $table->foreignId('break_entry_id')->nullable()->constrained();
            $table->enum('adjustment_type', ['missed_punch', 'time_correction', 'break_adjustment', 'manual_entry']);

            // Original values
            $table->json('original_data')->nullable();

            // New values
            $table->timestamp('adjusted_clock_in')->nullable();
            $table->timestamp('adjusted_clock_out')->nullable();
            $table->decimal('adjusted_hours', 5, 2)->nullable();

            // Request details
            $table->text('reason');
            $table->text('employee_notes')->nullable();
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->foreignId('requested_by_user_id')->constrained('users');

            // Approval
            $table->timestamp('approved_at')->nullable();
            $table->foreignId('approved_by_user_id')->nullable()->constrained('users');
            $table->text('approval_notes')->nullable();

            // Rejection
            $table->timestamp('rejected_at')->nullable();
            $table->foreignId('rejected_by_user_id')->nullable()->constrained('users');
            $table->text('rejection_reason')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->index(['user_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('time_adjustments');
    }
};
