<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Adds custom approval settings to the pto_types table.
 */
return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('pto_types', function (Blueprint $table) {
            // A flag to disable the default approval from the user's direct manager.
            $table->boolean('disable_hierarchy_approval')->default(false)->after('multi_level_approval');

            // A JSON column to store an array of specific user IDs who must approve.
            $table->json('specific_approvers')->nullable()->after('disable_hierarchy_approval');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('pto_types', function (Blueprint $table) {
            $table->dropColumn('disable_hierarchy_approval');
            $table->dropColumn('specific_approvers');
        });
    }
};
