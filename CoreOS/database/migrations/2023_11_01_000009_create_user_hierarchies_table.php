<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('user_hierarchies', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('supervisor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('department_id')->nullable()->constrained('departments')->nullOnDelete();
            $table->integer('level')->default(1); // Organizational level
            $table->date('effective_date');
            $table->date('end_date')->nullable();
            $table->boolean('can_approve_pto')->default(false);
            $table->json('approval_limits')->nullable(); // Max days they can approve by PTO type
            $table->timestamps();

            $table->unique(['user_id', 'effective_date'], 'unique_user_hierarchy_date');
            $table->index(['supervisor_id']);
            $table->index(['department_id']);
            $table->index(['effective_date', 'end_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_hierarchies');
    }
};
