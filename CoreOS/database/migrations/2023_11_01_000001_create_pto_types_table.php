<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('pto_types', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->string('code', 10)->unique(); // Short code like 'VAC', 'SICK', 'FMLA'
            $table->text('description')->nullable();
            $table->string('color', 7)->default('#3B82F6'); // Hex color for calendar display
            $table->boolean('multi_level_approval')->default(false);
            $table->boolean('uses_balance')->default(true);
            $table->boolean('carryover_allowed')->default(false);
            $table->boolean('negative_allowed')->default(false);
            $table->boolean('affects_schedule')->default(true);
            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['is_active', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pto_types');
    }
};
