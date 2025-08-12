<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Add pivot table for route-role assignments
        Schema::create('route_role_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('route_permission_id')->constrained()->onDelete('cascade');
            $table->foreignId('role_id')->constrained()->onDelete('cascade');
            $table->timestamps();

            // Use shorter constraint name
            $table->unique(['route_permission_id', 'role_id'], 'route_role_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('route_role_assignments');
    }
};
