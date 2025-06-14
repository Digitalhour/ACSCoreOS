<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('user_reporting_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade'); // Employee
            $table->foreignId('manager_id')->nullable()->constrained('users')->onDelete('set null'); // Manager
            $table->foreignId('position_id')->constrained('positions')->onDelete('cascade'); // Position during this assignment
            $table->timestamp('start_date');
            $table->timestamp('end_date')->nullable(); // Null means it's the current/active assignment
            $table->timestamps(); // For record creation/update time

            // Indexes for faster querying
            $table->index(['user_id', 'start_date', 'end_date']);
            $table->index(['manager_id', 'start_date', 'end_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_reporting_assignments');
    }
};
