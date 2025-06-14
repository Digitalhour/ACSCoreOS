<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;


return new class extends Migration {
    public function up(): void
    {
        Schema::create('pto_policy_user', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pto_policy_id')->constrained('pto_policies')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->date('effective_date');
            $table->date('end_date')->nullable();
            $table->decimal('custom_initial_days', 8, 2)->nullable(); // Override policy default
            $table->decimal('custom_annual_accrual', 8, 2)->nullable(); // Override policy default
            $table->text('notes')->nullable();
            $table->timestamps();

            // Prevent overlapping policy assignments for the same user and PTO type
            $table->unique(['user_id', 'pto_policy_id', 'effective_date'], 'unique_user_policy_date');
            $table->index(['user_id', 'effective_date']);
            $table->index(['effective_date', 'end_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pto_policy_user');
    }
};
