<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('timesheet_actions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('timesheet_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete(); // Who performed the action
            $table->enum('action', [
                'submitted',
                'approved',
                'rejected',
                'processed',
                'withdrawn'
            ]);
            $table->text('notes')->nullable(); // Action-specific notes
            $table->json('metadata')->nullable(); // Additional action data (rejection_reason, etc.)
            $table->timestamps();

            // Indexes
            $table->index(['timesheet_id', 'action']);
            $table->index(['timesheet_id', 'created_at']);
            $table->index(['user_id', 'action']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('timesheet_actions');
    }
};
