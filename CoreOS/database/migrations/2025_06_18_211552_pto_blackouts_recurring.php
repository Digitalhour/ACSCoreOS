<?php
// database/migrations/xxxx_add_recurring_blackouts_to_pto_blackouts_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('pto_blackouts', function (Blueprint $table) {
            $table->boolean('is_recurring')->default(false)->after('is_active');
            $table->json('recurring_days')->nullable()->after('is_recurring'); // 0=Sunday, 1=Monday, etc.
            $table->date('recurring_start_date')->nullable()->after('recurring_days'); // Optional effective start date
            $table->date('recurring_end_date')->nullable()->after('recurring_start_date'); // Optional effective end date
        });
    }

    public function down()
    {
        Schema::table('pto_blackouts', function (Blueprint $table) {
            $table->dropColumn(['is_recurring', 'recurring_days', 'recurring_start_date', 'recurring_end_date']);
        });
    }
};
