<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('push_subscriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('endpoint');
            $table->text('public_key');
            $table->text('auth_token');
            $table->string('browser')->nullable();
            $table->string('device')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamp('last_used_at')->nullable();
            $table->timestamps();

            $table->index(['user_id']);
            $table->index(['is_active']);
            $table->unique(['user_id', 'endpoint']); // Prevent duplicate subscriptions
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('push_subscriptions');
    }
};
