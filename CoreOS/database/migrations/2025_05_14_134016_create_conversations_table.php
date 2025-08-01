<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('conversations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('title')->nullable(); // Optional: A title for the conversation
            $table->timestamps();
            $table->softDeletes(); // For soft deleting conversations
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('conversations');
    }
};

