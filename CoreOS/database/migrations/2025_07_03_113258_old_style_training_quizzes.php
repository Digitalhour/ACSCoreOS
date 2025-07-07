<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('old_style_training_quizzes', function (Blueprint $table) {
            $table->id('quiz_id');
            $table->foreignId('lesson_id')->constrained('old_style_training_lessons', 'lesson_id')->onDelete('cascade');
            $table->string('quiz_name');
            $table->text('quiz_description')->nullable();
            $table->enum('quiz_status', ['Active', 'Inactive'])->default('Active');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('old_style_training_quizzes');
    }
};
