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
        Schema::table('timesheets', function (Blueprint $table) {
            $table->text('withdrawal_reason')->nullable()->after('payroll_notes');
            $table->timestamp('withdrawn_at')->nullable()->after('processed_at');
            $table->foreignId('withdrawn_by')->nullable()->after('processed_by')->constrained('users')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('timesheets', function (Blueprint $table) {
            $table->dropForeign(['withdrawn_by']);
            $table->dropColumn(['withdrawal_reason', 'withdrawn_at', 'withdrawn_by']);
        });
    }
};
