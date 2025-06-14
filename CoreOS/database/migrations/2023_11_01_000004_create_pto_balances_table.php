<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('pto_balances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('pto_type_id')->constrained('pto_types')->cascadeOnDelete();
            $table->decimal('balance', 8, 2)->default(0);
            $table->decimal('pending_balance', 8, 2)->default(0);
            $table->decimal('used_balance', 8, 2)->default(0);
            $table->decimal('accrued_balance', 8, 2)->default(0); // Track accrued vs initial
            $table->decimal('rollover_balance', 8, 2)->default(0); // Track rollover separately
            $table->integer('year');
            $table->timestamp('last_accrual_date')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'pto_type_id', 'year'], 'unique_user_pto_year');
            $table->index(['user_id', 'pto_type_id']);
            $table->index(['year']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pto_balances');
    }
};
