<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('navigation_items', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('href');
            $table->string('icon')->nullable();
            $table->text('description')->nullable();
            $table->unsignedBigInteger('parent_id')->nullable();
            $table->enum('type', ['header', 'category', 'footer'])->default('category');
            $table->integer('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->json('roles')->nullable(); // Store role names as JSON array
            $table->json('permissions')->nullable(); // Store permission names as JSON array
            $table->timestamps();

            $table->foreign('parent_id')->references('id')->on('navigation_items')->onDelete('cascade');
            $table->index(['type', 'sort_order']);
            $table->index(['parent_id', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('navigation_items');
    }
};
