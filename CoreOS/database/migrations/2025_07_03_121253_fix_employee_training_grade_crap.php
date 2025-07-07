<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('old_style_training_grades', function (Blueprint $table) {
            // Drop the existing foreign key constraint
            $table->dropForeign(['grade_employee_id']);

            // Add the new foreign key constraint referencing users table
            $table->foreign('grade_employee_id')->references('id')->on('users')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::table('old_style_training_grades', function (Blueprint $table) {
            // Drop the current foreign key constraint
            $table->dropForeign(['grade_employee_id']);

            // Restore the original foreign key constraint
            $table->foreign('grade_employee_id')->references('employee_id')->on('old_style_training_employees')->onDelete('cascade');
        });
    }
};
