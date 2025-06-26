<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('documents', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('original_filename');
            $table->text('description')->nullable();
            $table->string('file_type');
            $table->bigInteger('file_size');
            $table->string('s3_key');
            $table->string('s3_url');
            $table->foreignId('folder_id')->constrained('folders');
            $table->enum('assignment_type', ['company_wide', 'department', 'user', 'hierarchy']);
            $table->json('assignment_ids')->nullable();
            $table->foreignId('uploaded_by')->constrained('users');
            $table->timestamp('last_accessed_at')->nullable();
            $table->integer('download_count')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['folder_id', 'is_active']);
            $table->index('assignment_type');
            $table->index('file_type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('documents');
    }
};
