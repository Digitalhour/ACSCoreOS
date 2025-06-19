<?php
// database/migrations/xxxx_make_blackout_dates_nullable.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('pto_blackouts', function (Blueprint $table) {
            // Make start_date and end_date nullable for recurring blackouts
            $table->date('start_date')->nullable()->change();
            $table->date('end_date')->nullable()->change();
        });
    }

    public function down()
    {
        Schema::table('pto_blackouts', function (Blueprint $table) {
            // Revert back to NOT NULL (but this might fail if there are null values)
            $table->date('start_date')->nullable(false)->change();
            $table->date('end_date')->nullable(false)->change();
        });
    }
};
