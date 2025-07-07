<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('time_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->timestamp('clock_in_time');
            $table->timestamp('clock_out_time')->nullable();
            $table->decimal('total_hours', 5, 2)->nullable();
            $table->decimal('regular_hours', 5, 2)->nullable();
            $table->decimal('overtime_hours', 5, 2)->nullable();

            // Clock in metadata
            $table->string('clock_in_ip')->nullable();
            $table->string('clock_in_device')->nullable();
            $table->json('clock_in_location')->nullable(); // lat, lng, address
            $table->string('clock_in_user_agent')->nullable();

            // Clock out metadata
            $table->string('clock_out_ip')->nullable();
            $table->string('clock_out_device')->nullable();
            $table->json('clock_out_location')->nullable();
            $table->string('clock_out_user_agent')->nullable();

            // Status and notes
            $table->enum('status', ['active', 'completed', 'adjusted'])->default('active');
            $table->text('notes')->nullable();
            $table->text('adjustment_reason')->nullable();
            $table->foreignId('adjusted_by_user_id')->nullable()->constrained('users');
            $table->timestamp('adjusted_at')->nullable();

            // Relationships
            $table->foreignId('overtime_rule_id')->nullable()->constrained();

            $table->timestamps();
            $table->softDeletes();

            $table->index(['user_id', 'clock_in_time']);
            $table->index(['user_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('time_entries');
    }
};
