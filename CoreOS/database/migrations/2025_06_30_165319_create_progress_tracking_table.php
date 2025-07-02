<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;


/**
     * Run the migrations.
     */
return new class extends Migration
{
    public function up()
    {
        Schema::create('progress_tracking', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->morphs('trackable'); // lesson_id, lesson_content_id, quiz_id, test_id
            $table->boolean('completed')->default(false);
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->integer('time_spent')->default(0); // in seconds
            $table->json('metadata')->nullable(); // additional tracking data
            $table->timestamps();

            $table->unique(['user_id', 'trackable_type', 'trackable_id']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('progress_tracking');
    }
};
