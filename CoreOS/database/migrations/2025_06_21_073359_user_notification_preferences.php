<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_notification_preferences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('category_id')->constrained('notification_categories')->onDelete('cascade');
            $table->boolean('push_enabled')->default(true);
            $table->boolean('toast_enabled')->default(true);
            $table->boolean('email_enabled')->default(false); // For future email notifications
            $table->timestamps();

            $table->unique(['user_id', 'category_id']); // One preference per user per category
            $table->index(['user_id']);
            $table->index(['category_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_notification_preferences');
    }
};
