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
        Schema::table('time_clocks', function (Blueprint $table) {
            $table->foreignId('timesheet_id')->nullable()->after('user_id')->constrained()->nullOnDelete();
            $table->index(['timesheet_id', 'clock_in_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('time_clocks', function (Blueprint $table) {
            $table->dropForeign(['timesheet_id']);
            $table->dropIndex(['timesheet_id', 'clock_in_at']);
            $table->dropColumn('timesheet_id');
        });
    }
};
