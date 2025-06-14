<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('pto_policies', function (Blueprint $table) {
            // Add the missing fields that should be on the policies table
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->date('effective_date');
            $table->date('end_date')->nullable();

            // Add unique constraint: one policy per user per PTO type
            $table->unique(['user_id', 'pto_type_id']);
        });
    }

    public function down(): void
    {
        Schema::table('pto_policies', function (Blueprint $table) {
            $table->dropUnique(['user_id', 'pto_type_id']);
            $table->dropForeign(['user_id']);
            $table->dropColumn(['user_id', 'effective_date', 'end_date']);
        });
    }
};
