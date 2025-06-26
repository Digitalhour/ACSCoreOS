<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('folders', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('s3_path');
            $table->foreignId('parent_id')->nullable()->constrained('folders')->onDelete('cascade');
            $table->enum('assignment_type', ['company_wide', 'department', 'user', 'hierarchy']);
            $table->json('assignment_ids')->nullable(); // Store department/user IDs
            $table->foreignId('created_by')->constrained('users');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['parent_id', 'is_active']);
            $table->index('assignment_type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('folders');
    }
};
