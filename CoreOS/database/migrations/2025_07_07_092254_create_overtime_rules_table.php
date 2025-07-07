<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('overtime_rules', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('description')->nullable();
            $table->decimal('daily_threshold', 4, 2)->default(8.00); // hours per day before overtime
            $table->decimal('weekly_threshold', 4, 2)->default(40.00); // hours per week before overtime
            $table->decimal('overtime_multiplier', 3, 2)->default(1.50); // 1.5x for overtime
            $table->boolean('is_active')->default(true);
            $table->boolean('is_default')->default(false);
            $table->json('department_ids')->nullable(); // specific departments
            $table->json('user_ids')->nullable(); // specific users
            $table->timestamp('effective_date');
            $table->timestamp('end_date')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('overtime_rules');
    }
};
