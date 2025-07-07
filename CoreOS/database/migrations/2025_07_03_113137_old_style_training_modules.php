<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('old_style_training_modules', function (Blueprint $table) {
            $table->id('module_id');
            $table->string('module_name');
            $table->text('module_description')->nullable();
            $table->enum('module_status', ['Active', 'Inactive'])->default('Active');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('old_style_training_modules');
    }
};
