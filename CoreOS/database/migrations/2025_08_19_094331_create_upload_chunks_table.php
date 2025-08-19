<?php

// database/migrations/xxxx_xx_xx_xxxxxx_create_upload_chunks_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('parts_database')->create('upload_chunks', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('upload_id');
            $table->integer('chunk_number');
            $table->integer('start_row');
            $table->integer('end_row');
            $table->integer('total_rows');
            $table->enum('status', ['pending', 'processing', 'completed', 'failed'])->default('pending');
            $table->integer('processed_rows')->default(0);
            $table->integer('created_parts')->default(0);
            $table->integer('updated_parts')->default(0);
            $table->integer('failed_rows')->default(0);
            $table->json('error_details')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->decimal('processing_time_seconds', 8, 3)->nullable();
            $table->timestamps();

            $table->foreign('upload_id')->references('id')->on('parts_uploads')->onDelete('cascade');
            $table->index(['upload_id', 'chunk_number']);
            $table->index(['status']);
        });
    }

    public function down(): void
    {
        Schema::connection('parts_database')->dropIfExists('upload_chunks');
    }
};
