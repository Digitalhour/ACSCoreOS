<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('old_style_training_tests', function (Blueprint $table) {
            $table->id('test_id');
            $table->foreignId('module_id')->constrained('old_style_training_modules', 'module_id')->onDelete('cascade');
            $table->string('test_name');
            $table->text('test_description')->nullable();
            $table->enum('test_status', ['Active', 'Inactive'])->default('Active');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('old_style_training_tests');
    }
};
