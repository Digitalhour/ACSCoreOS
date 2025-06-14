<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('pto_transactions', function (Blueprint $table) {
            $table->id();
            $table->string('transaction_number')->unique(); // Auto-generated transaction number
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('pto_type_id')->constrained('pto_types')->cascadeOnDelete();
            $table->foreignId('pto_request_id')->nullable()->constrained('pto_requests')->nullOnDelete();
            $table->decimal('amount', 8, 2);
            $table->decimal('balance_before', 8, 2);
            $table->decimal('balance_after', 8, 2);
            $table->enum('type', ['accrual', 'usage', 'adjustment', 'reset', 'rollover', 'bonus', 'forfeiture']);
            $table->text('description')->nullable();
            $table->json('metadata')->nullable(); // Store additional transaction data
            $table->foreignId('created_by_id')->nullable()->constrained('users');
            $table->timestamp('effective_date')->useCurrent();
            $table->timestamps();

            $table->index(['user_id', 'pto_type_id', 'effective_date']);
            $table->index(['type', 'effective_date']);
            $table->index(['pto_request_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pto_transactions');
    }
};
