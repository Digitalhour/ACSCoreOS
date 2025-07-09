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
        Schema::create('overtime_rules', function (Blueprint $table) {
            $table->id();
            $table->string('name'); // Rule name
            $table->text('description')->nullable();
            $table->enum('type', ['daily', 'weekly', 'custom']); // Type of overtime rule
            $table->decimal('daily_threshold', 5, 2)->nullable(); // Hours per day before overtime
            $table->decimal('weekly_threshold', 5, 2)->nullable(); // Hours per week before overtime
            $table->decimal('multiplier', 4, 2)->default(1.5); // Overtime pay multiplier
            $table->integer('priority')->default(1); // Rule priority (lower number = higher priority)
            $table->boolean('is_active')->default(true);
            $table->date('effective_from'); // When rule becomes active
            $table->date('effective_to')->nullable(); // When rule expires
            $table->json('conditions')->nullable(); // Additional conditions (JSON)
            $table->timestamps();

            // Indexes
            $table->index(['is_active', 'priority']);
            $table->index(['effective_from', 'effective_to']);
            $table->index('type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('overtime_rules');
    }
};
