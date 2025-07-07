<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('old_style_training_employees', function (Blueprint $table) {
            $table->id('employee_id');
            $table->string('employee_first_name');
            $table->string('employee_last_name');
            $table->date('employee_hire_date')->nullable();
            $table->enum('employee_status', ['Active', 'Inactive'])->default('Active');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('old_style_training_employees');
    }
};
