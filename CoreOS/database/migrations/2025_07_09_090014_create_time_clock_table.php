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
        Schema::create('time_clocks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->timestamp('clock_in_at');
            $table->timestamp('clock_out_at')->nullable();
            $table->timestamp('break_start_at')->nullable();
            $table->timestamp('break_end_at')->nullable();
            $table->foreignId('break_type_id')->nullable()->constrained()->nullOnDelete();
            $table->decimal('regular_hours', 5, 2)->default(0);
            $table->decimal('overtime_hours', 5, 2)->default(0);
            $table->decimal('break_duration', 5, 2)->default(0); // in hours
            $table->text('notes')->nullable();
            $table->enum('status', ['active', 'completed', 'pending_approval'])->default('active');
            $table->json('location_data')->nullable(); // For GPS coordinates if needed
            $table->timestamps();
            $table->softDeletes();

            // Indexes
            $table->index(['user_id', 'clock_in_at']);
            $table->index(['user_id', 'status']);
            $table->index('clock_in_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('time_clocks');
    }
};
