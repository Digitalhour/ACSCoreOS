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
        Schema::create('timesheets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->date('week_start_date'); // Sunday of the week
            $table->date('week_end_date'); // Saturday of the week
            $table->enum('status', ['draft', 'submitted', 'approved', 'processed'])->default('draft');

            // Submission tracking
            $table->timestamp('submitted_at')->nullable();
            $table->foreignId('submitted_by')->nullable()->constrained('users')->nullOnDelete();

            // Manager approval tracking
            $table->timestamp('approved_at')->nullable();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();

            // Payroll processing tracking
            $table->timestamp('processed_at')->nullable();
            $table->foreignId('processed_by')->nullable()->constrained('users')->nullOnDelete();

            // Calculated totals (cached for performance)
            $table->decimal('total_hours', 6, 2)->default(0);
            $table->decimal('regular_hours', 6, 2)->default(0);
            $table->decimal('overtime_hours', 6, 2)->default(0);
            $table->decimal('break_hours', 6, 2)->default(0);

            // Additional fields
            $table->text('notes')->nullable();
            $table->text('manager_notes')->nullable();
            $table->text('payroll_notes')->nullable();
            $table->boolean('legal_acknowledgment')->default(false);

            $table->timestamps();
            $table->softDeletes();

            // Indexes
            $table->index(['user_id', 'week_start_date']);
            $table->index(['user_id', 'status']);
            $table->index(['status', 'week_start_date']);
            $table->unique(['user_id', 'week_start_date'], 'unique_user_week');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('timesheets');
    }
};
