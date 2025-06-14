<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('pto_approvals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pto_request_id')->constrained('pto_requests')->cascadeOnDelete();
            $table->foreignId('approver_id')->constrained('users')->cascadeOnDelete();
            $table->enum('status', ['pending', 'approved', 'denied', 'delegated'])->default('pending');
            $table->text('comments')->nullable();
            $table->integer('level')->default(1);
            $table->integer('sequence')->default(1); // Order within the same level
            $table->boolean('is_required')->default(true);
            $table->boolean('is_parallel')->default(false); // Can approve in parallel with others at same level
            $table->foreignId('delegated_to_id')->nullable()->constrained('users'); // For delegation
            $table->timestamp('responded_at')->nullable();
            $table->timestamp('reminder_sent_at')->nullable();
            $table->timestamps();

            $table->unique(['pto_request_id', 'approver_id', 'level'], 'unique_request_approver_level');
            $table->index(['approver_id', 'status']);
            $table->index(['pto_request_id', 'level', 'sequence']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pto_approvals');
    }
};
