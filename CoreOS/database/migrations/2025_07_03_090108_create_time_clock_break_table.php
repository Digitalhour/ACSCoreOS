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
        Schema::create('break_types', function (Blueprint $table) {
            $table->id();
            $table->string('name'); // lunch, personal, extended, etc.
            $table->string('label')->nullable(); // Display label
            $table->text('description')->nullable();
            $table->boolean('is_paid')->default(false);
            $table->integer('max_duration_minutes')->nullable(); // Maximum allowed duration
            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            // Indexes
            $table->index(['is_active', 'sort_order']);
            $table->unique('name');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('break_types');
    }
};
