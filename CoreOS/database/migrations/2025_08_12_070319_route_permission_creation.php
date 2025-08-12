<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('route_permissions', function (Blueprint $table) {
            $table->id();
            $table->string('route_name')->unique();
            $table->string('route_uri');
            $table->json('route_methods'); // ['GET', 'POST', etc.]
            $table->string('controller_class')->nullable();
            $table->string('controller_method')->nullable();
            $table->string('group_name')->nullable(); // For grouping related routes
            $table->text('description')->nullable();
            $table->boolean('is_protected')->default(true);
            $table->boolean('is_active')->default(true);
            $table->json('middleware')->nullable(); // Store existing middleware
            $table->timestamps();

            $table->index(['route_name', 'is_active']);
            $table->index('group_name');
            $table->index('controller_class');
        });

        // Pivot table for route-permission assignments
        Schema::create('route_permission_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('route_permission_id')->constrained()->onDelete('cascade');
            $table->foreignId('permission_id')->constrained()->onDelete('cascade');
            $table->timestamps();

            $table->unique(['route_permission_id', 'permission_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('route_permission_assignments');
        Schema::dropIfExists('route_permissions');
    }
};
