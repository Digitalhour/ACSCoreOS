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
            // Add punch type if it doesn't exist
            if (!Schema::hasColumn('time_clocks', 'punch_type')) {
                $table->enum('punch_type', ['work', 'break'])->default('work')->after('user_id');
            }

            // Add break_type_id if it doesn't exist
            if (!Schema::hasColumn('time_clocks', 'break_type_id')) {
                $table->foreignId('break_type_id')->nullable()->after('punch_type')->constrained()->nullOnDelete();
            }

            // Remove break duration if it exists
            if (Schema::hasColumn('time_clocks', 'break_duration')) {
                $table->dropColumn('break_duration');
            }

            // Remove single break tracking fields if they exist
            $columns_to_drop = [];
            if (Schema::hasColumn('time_clocks', 'break_start_at')) {
                $columns_to_drop[] = 'break_start_at';
            }
            if (Schema::hasColumn('time_clocks', 'break_end_at')) {
                $columns_to_drop[] = 'break_end_at';
            }

            if (!empty($columns_to_drop)) {
                $table->dropColumn($columns_to_drop);
            }
        });

        // Add index for efficient querying
        Schema::table('time_clocks', function (Blueprint $table) {
            $table->index(['user_id', 'punch_type', 'status']);
        });
    }

    public function down(): void
    {
        Schema::table('time_clocks', function (Blueprint $table) {
            // Drop index (Laravel will ignore if it doesn't exist)
            $table->dropIndex(['user_id', 'punch_type', 'status']);

            // Drop foreign key and columns if they exist
            if (Schema::hasColumn('time_clocks', 'break_type_id')) {
                $table->dropForeign(['break_type_id']);
                $table->dropColumn('break_type_id');
            }

            if (Schema::hasColumn('time_clocks', 'punch_type')) {
                $table->dropColumn('punch_type');
            }

            // Add back break_duration if it doesn't exist
            if (!Schema::hasColumn('time_clocks', 'break_duration')) {
                $table->decimal('break_duration', 5, 2)->default(0);
            }
        });
    }
};
