<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('old_style_training_activity_logs', function (Blueprint $table) {
            $table->id('log_id');
            $table->string('log_action');
            $table->string('log_type');
            $table->text('log_details');
            $table->unsignedBigInteger('log_type_id')->nullable();
            $table->json('previous_value')->nullable();
            $table->json('new_value')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('old_style_training_activity_logs');
    }
};
