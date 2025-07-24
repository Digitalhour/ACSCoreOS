<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Drop the breaks table if it exists
        Schema::dropIfExists('time_clock_breaks');

        // Modify time_clocks table
        Schema::table('time_clocks', function (Blueprint $table) {
            // Add punch type
            $table->enum('punch_type', ['work', 'break'])->default('work')->after('user_id');

            // Add break_type_id back (for break punches only)
            $table->foreignId('break_type_id')->nullable()->after('punch_type')->constrained()->nullOnDelete();

            // Remove break duration (calculated from punch records)
            $table->dropColumn('break_duration');

            // Remove single break tracking fields if they exist
            $table->dropColumn(['break_start_at', 'break_end_at']);
        });

        // Add index for efficient querying
        Schema::table('time_clocks', function (Blueprint $table) {
            $table->index(['user_id', 'punch_type', 'status']);
        });
    }

    public function down(): void
    {
        Schema::table('time_clocks', function (Blueprint $table) {
            $table->dropIndex(['user_id', 'punch_type', 'status']);
            $table->dropForeign(['break_type_id']);
            $table->dropColumn(['punch_type', 'break_type_id']);
            $table->decimal('break_duration', 5, 2)->default(0);
        });
    }
};
