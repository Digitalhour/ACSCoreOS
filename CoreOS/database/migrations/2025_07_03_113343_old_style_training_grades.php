<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('old_style_training_grades', function (Blueprint $table) {
            $table->id('grade_id');
            $table->foreignId('grade_employee_id')->constrained('old_style_training_employees', 'employee_id')->onDelete('cascade');
            $table->unsignedBigInteger('grade_assessment_id');
            $table->enum('grade_assessment_type', ['Quiz', 'Test']);
            $table->decimal('grade_score', 5, 2);
            $table->timestamps();

//            $table->index(['grade_employee_id', 'grade_assessment_id', 'grade_assessment_type']);
            $table->index(
                ['grade_employee_id', 'grade_assessment_id', 'grade_assessment_type'],
                'training_grades_emp_assess_type_idx'
            );

        });
    }

    public function down(): void
    {
        Schema::dropIfExists('old_style_training_grades');
    }
};
