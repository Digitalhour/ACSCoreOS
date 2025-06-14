<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;


/**
 * Run the migrations.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('pto_policies', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->text('description')->nullable();
            $table->decimal('initial_days', 8, 2)->default(0);
            $table->decimal('annual_accrual_amount', 8, 2)->default(0);
            $table->decimal('bonus_days_per_year', 8, 2)->default(0);
            $table->boolean('rollover_enabled')->default(false);
            $table->decimal('max_rollover_days', 8, 2)->nullable();
            $table->decimal('max_negative_balance', 8, 2)->default(0);
            $table->integer('years_for_bonus')->default(1); // Years of service required for bonus
            $table->enum('accrual_frequency', ['monthly', 'quarterly', 'annually'])->default('annually');
            $table->boolean('prorate_first_year')->default(true);
            $table->foreignId('pto_type_id')->constrained('pto_types')->cascadeOnDelete();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['pto_type_id', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pto_policies');
    }
};

