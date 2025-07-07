<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('timesheet_submissions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->date('week_start_date'); // Monday of the week
            $table->date('week_end_date'); // Sunday of the week
            $table->decimal('total_hours', 6, 2);
            $table->decimal('regular_hours', 6, 2);
            $table->decimal('overtime_hours', 6, 2)->default(0);
            $table->decimal('break_hours', 6, 2)->default(0);

            // Submission details
            $table->enum('status', ['draft', 'submitted', 'approved', 'rejected', 'locked'])->default('draft');
            $table->timestamp('submitted_at')->nullable();
            $table->foreignId('submitted_by_user_id')->nullable()->constrained('users'); // if manager submits
            $table->boolean('self_submitted')->default(true);
            $table->text('submission_notes')->nullable();
            $table->text('legal_acknowledgment')->nullable(); // stores the legal text they agreed to

            // Approval process
            $table->timestamp('approved_at')->nullable();
            $table->foreignId('approved_by_user_id')->nullable()->constrained('users');
            $table->text('approval_notes')->nullable();

            // Rejection
            $table->timestamp('rejected_at')->nullable();
            $table->foreignId('rejected_by_user_id')->nullable()->constrained('users');
            $table->text('rejection_reason')->nullable();

            // Locking (payroll processing)
            $table->timestamp('locked_at')->nullable();
            $table->foreignId('locked_by_user_id')->nullable()->constrained('users');
            $table->text('lock_reason')->nullable();

            // Metadata
            $table->json('time_entry_ids'); // store related time entries for audit
            $table->json('summary_data')->nullable(); // daily breakdown

            $table->timestamps();
            $table->softDeletes();

            $table->unique(['user_id', 'week_start_date']);
            $table->index(['week_start_date', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('timesheet_submissions');
    }
};
