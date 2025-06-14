<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('pto_blackouts', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('description')->nullable();
            $table->date('start_date');
            $table->date('end_date');
            $table->foreignId('position_id')->nullable()->constrained('positions')->nullOnDelete();
            $table->json('department_ids')->nullable(); // Multiple departments
            $table->json('user_ids')->nullable(); // Specific users
            $table->boolean('is_company_wide')->default(false);
            $table->boolean('is_holiday')->default(false);
            $table->boolean('is_strict')->default(false);
            $table->boolean('allow_emergency_override')->default(false);
            $table->enum('restriction_type', ['full_block', 'limit_requests', 'warning_only'])->default('full_block');
            $table->integer('max_requests_allowed')->nullable(); // For limit_requests type
            $table->json('pto_type_ids')->nullable(); // Restrict specific PTO types only
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['start_date', 'end_date']);
            $table->index(['is_company_wide', 'is_active']);
            $table->index(['position_id', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pto_blackouts');
    }
};
