<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Create the complete notifications table
        // This includes Laravel's default fields + our custom fields
        Schema::create('notifications', function (Blueprint $table) {
            // Laravel's default notification fields
            $table->uuid('id')->primary();
            $table->string('type');
            $table->morphs('notifiable'); // Creates notifiable_type, notifiable_id + index automatically
            $table->text('data');
            $table->timestamp('read_at')->nullable();
            $table->timestamps();

            // Our custom enhanced fields
            $table->foreignId('category_id')->nullable()->constrained('notification_categories');
            $table->string('title')->nullable();
            $table->text('message')->nullable();
            $table->string('action_url')->nullable();
            $table->string('action_text')->nullable();
            $table->string('priority')->default('normal');
            $table->boolean('pushed')->default(false);
            $table->boolean('toasted')->default(false);

            // Additional indexes (morphs already creates the notifiable index)
            $table->index(['category_id']);
            $table->index(['read_at']);
            $table->index(['created_at']);
            $table->index(['priority']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notifications');
    }
};
