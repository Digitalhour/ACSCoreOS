<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->morphs('reactable'); // reactable_type, reactable_id (articles, comments, etc.)
            $table->enum('type', ['like', 'love', 'laugh', 'wow', 'sad', 'angry'])
                ->default('like');
            $table->timestamps();

            // Ensure one reaction per user per reactable item
            $table->unique(['user_id', 'reactable_type', 'reactable_id']);
            $table->index(['reactable_type', 'reactable_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reactions');
    }
};
