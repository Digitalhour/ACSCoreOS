<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notification_categories', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->string('icon')->default('bell'); // Lucide icon name
            $table->string('color')->default('blue'); // Tailwind color
            $table->boolean('default_push_enabled')->default(true);
            $table->boolean('default_toast_enabled')->default(true);
            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });

        // Insert default categories
        DB::table('notification_categories')->insert([
            [
                'name' => 'System Alerts',
                'slug' => 'system-alerts',
                'description' => 'Important system notifications and alerts',
                'icon' => 'alert-triangle',
                'color' => 'red',
                'default_push_enabled' => true,
                'default_toast_enabled' => true,
                'is_active' => true,
                'sort_order' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'HR Requests',
                'slug' => 'hr-requests',
                'description' => 'Human resources related notifications',
                'icon' => 'users',
                'color' => 'blue',
                'default_push_enabled' => true,
                'default_toast_enabled' => true,
                'is_active' => true,
                'sort_order' => 2,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'General',
                'slug' => 'general',
                'description' => 'General notifications and updates',
                'icon' => 'bell',
                'color' => 'gray',
                'default_push_enabled' => false,
                'default_toast_enabled' => true,
                'is_active' => true,
                'sort_order' => 3,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('notification_categories');
    }
};
