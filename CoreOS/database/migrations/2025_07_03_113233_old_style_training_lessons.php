<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('old_style_training_lessons', function (Blueprint $table) {
            $table->id('lesson_id');
            $table->foreignId('module_id')->constrained('old_style_training_modules', 'module_id')->onDelete('cascade');
            $table->string('lesson_name');
            $table->text('lesson_description')->nullable();
            $table->enum('lesson_status', ['Active', 'Inactive'])->default('Active');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('old_style_training_lessons');
    }
};
