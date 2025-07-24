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
            $table->enum('punch_type', ['work', 'break'])->default('work')->after('user_id');

            // Add break_type_id back (for break punches only)
            $table->foreignId('break_type_id')->nullable()->after('punch_type')->constrained()->nullOnDelete();

            $table->decimal('regular_hours', 5, 2)->default(0);
            $table->decimal('overtime_hours', 5, 2)->default(0);
            $table->text('notes')->nullable();
            $table->enum('status', ['active', 'completed', 'pending_approval'])->default('active');
            $table->json('location_data')->nullable(); // For GPS coordinates if needed
            $table->timestamps();
            $table->softDeletes();

            // Indexes
            $table->index(['user_id', 'punch_type', 'status']);
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
