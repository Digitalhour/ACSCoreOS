<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('timesheets', function (Blueprint $table) {
            // Drop foreign key constraints first
            $table->dropForeign(['submitted_by']);
            $table->dropForeign(['approved_by']);
            $table->dropForeign(['processed_by']);
            $table->dropForeign(['withdrawn_by']);
            $table->dropForeign(['rejected_by']);

            // Drop old tracking columns
            $table->dropColumn([
                'submitted_at',
                'submitted_by',
                'approved_at',
                'approved_by',
                'processed_at',
                'processed_by',
                'withdrawn_at',
                'withdrawn_by',
                'rejected_at',
                'rejected_by',
                'manager_notes',
                'payroll_notes',
                'withdrawal_reason',
                'rejection_reason',
                'rejection_notes'
            ]);
        });
    }

    public function down()
    {
        Schema::table('timesheets', function (Blueprint $table) {
            // Submission tracking
            $table->timestamp('submitted_at')->nullable();
            $table->foreignId('submitted_by')->nullable()->constrained('users')->nullOnDelete();

            // Manager approval tracking
            $table->timestamp('approved_at')->nullable();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();

            // Payroll processing tracking
            $table->timestamp('processed_at')->nullable();
            $table->foreignId('processed_by')->nullable()->constrained('users')->nullOnDelete();

            // Withdrawal tracking
            $table->timestamp('withdrawn_at')->nullable();
            $table->foreignId('withdrawn_by')->nullable()->constrained('users')->nullOnDelete();

            // Rejection tracking
            $table->timestamp('rejected_at')->nullable();
            $table->foreignId('rejected_by')->nullable()->constrained('users')->nullOnDelete();

            // Notes
            $table->text('manager_notes')->nullable();
            $table->text('payroll_notes')->nullable();
            $table->text('withdrawal_reason')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->text('rejection_notes')->nullable();
        });
    }
};
