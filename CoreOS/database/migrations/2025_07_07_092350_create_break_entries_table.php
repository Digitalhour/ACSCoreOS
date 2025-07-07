<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('break_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('time_entry_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->timestamp('break_start');
            $table->timestamp('break_end')->nullable();
            $table->decimal('duration_minutes', 5, 2)->nullable();
            $table->enum('break_type', ['lunch', 'personal', 'extended', 'rest', 'other'])->default('personal');
            $table->string('break_label')->nullable(); // custom break labels
            $table->text('notes')->nullable();

            // Metadata
            $table->string('start_ip')->nullable();
            $table->string('end_ip')->nullable();
            $table->json('start_location')->nullable();
            $table->json('end_location')->nullable();

            // Status
            $table->enum('status', ['active', 'completed', 'adjusted'])->default('active');
            $table->text('adjustment_reason')->nullable();
            $table->foreignId('adjusted_by_user_id')->nullable()->constrained('users');
            $table->timestamp('adjusted_at')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->index(['user_id', 'break_start']);
            $table->index(['time_entry_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('break_entries');
    }
};
