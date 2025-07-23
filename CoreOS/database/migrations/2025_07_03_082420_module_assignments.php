<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('module_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('module_id')->constrained()->cascadeOnDelete();
            $table->enum('assignment_type', ['everyone', 'user', 'department', 'hierarchy']);
            $table->unsignedBigInteger('assignable_id')->nullable(); // user_id, department_id, or manager_id
            $table->timestamps();

            // Ensure unique assignments per module and assignable combination
//            $table->unique(['module_id', 'assignment_type', 'assignable_id']);
            $table->unique(['module_id', 'assignment_type', 'assignable_id'], 'mod_assign_type_id_unique');


            // Add indexes for performance
            $table->index(['assignment_type', 'assignable_id']);
            $table->index('module_id');
        });
    }

    public function down()
    {
        Schema::dropIfExists('module_assignments');
    }
};
