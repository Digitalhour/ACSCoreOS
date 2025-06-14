<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('pto_requests', function (Blueprint $table) {
            $table->id();
            $table->string('request_number')->unique(); // Auto-generated request number
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('pto_type_id')->constrained('pto_types')->cascadeOnDelete();
            $table->date('start_date');
            $table->date('end_date');
            $table->enum('start_time', ['full_day', 'morning', 'afternoon'])->default('full_day');
            $table->enum('end_time', ['full_day', 'morning', 'afternoon'])->default('full_day');
            $table->decimal('total_days', 8, 2);
            $table->decimal('total_hours', 8, 2)->nullable(); // For hour-based tracking
            $table->text('reason')->nullable();
            $table->enum('status', ['pending', 'approved', 'denied', 'cancelled', 'withdrawn'])->default('pending');
            $table->text('denial_reason')->nullable();
            $table->boolean('requires_multi_level_approval')->default(false);
            $table->boolean('is_emergency')->default(false);
            $table->json('attachments')->nullable(); // Store file paths/URLs
            $table->timestamp('submitted_at')->useCurrent();
            $table->timestamp('approved_at')->nullable();
            $table->timestamp('denied_at')->nullable();
            $table->foreignId('approved_by_id')->nullable()->constrained('users');
            $table->foreignId('denied_by_id')->nullable()->constrained('users');
            $table->timestamps();
            $table->softDeletes();

            $table->index(['user_id', 'status']);
            $table->index(['start_date', 'end_date']);
            $table->index(['pto_type_id', 'status']);
            $table->index(['status', 'submitted_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pto_requests');
    }
};
