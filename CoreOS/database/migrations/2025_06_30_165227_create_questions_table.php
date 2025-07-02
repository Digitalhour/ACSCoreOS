<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('questions', function (Blueprint $table) {
            $table->id();
            $table->morphs('questionable'); // quiz_id or test_id
            $table->string('type'); // multiple_choice, true_false, short_answer
            $table->text('question');
            $table->json('options')->nullable(); // for multiple choice
            $table->json('correct_answers'); // array of correct answers
            $table->text('explanation')->nullable();
            $table->integer('points')->default(1);
            $table->integer('order')->default(0);
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('questions');
    }
};

