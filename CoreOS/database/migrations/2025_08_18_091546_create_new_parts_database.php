<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Create the parts_dataset schema/database connection tables

        // 1. Parts uploads table - track upload batches
        Schema::connection('parts_database')->create('parts_uploads', function (Blueprint $table) {
            $table->id();
            $table->string('filename', 255);
            $table->string('original_filename', 255);
            $table->string('upload_type', 50); // 'excel', 'csv', 'zip'
            $table->string('batch_id', 100)->unique();
            $table->integer('total_parts')->default(0);
            $table->integer('processed_parts')->default(0);
            $table->enum('status', [   'pending',
                'analyzing',
                'chunked',
                'processing',
                'completed',
                'completed_with_errors',
                'failed',
                'cancelled'])->default('pending');
            $table->json('processing_logs')->nullable(); // Store processing messages
            $table->timestamp('uploaded_at');
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->index(['batch_id', 'status']);
            $table->index('uploaded_at');
        });

        // 2. Main parts table
        Schema::connection('parts_database')->create('parts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('upload_id')->constrained('parts_uploads')->onDelete('cascade');
            $table->string('part_number', 100);
            $table->text('description')->nullable();
            $table->string('manufacturer', 100)->nullable();
            $table->string('batch_id', 100); // For tracking which upload batch
            $table->boolean('is_active')->default(true);
            $table->string('image_url')->nullable(); // S3 image URL if available
            $table->timestamps();

            $table->index(['part_number', 'manufacturer']);
            $table->index(['batch_id', 'is_active']);
            $table->index('upload_id');
        });

        // 3. Additional fields table - for dynamic Excel columns
        Schema::connection('parts_database')->create('parts_additional_fields', function (Blueprint $table) {
            $table->id();
            $table->foreignId('part_id')->constrained('parts')->onDelete('cascade');
            $table->string('field_name', 100);
            $table->text('field_value')->nullable();
            $table->timestamps();

            $table->index(['part_id', 'field_name']);
        });

        // 4. Shopify data table
        Schema::connection('parts_database')->create('parts_shopify_data', function (Blueprint $table) {
            $table->id();
            $table->foreignId('part_id')->constrained('parts')->onDelete('cascade');
            $table->string('shopify_id', 50)->nullable();
            $table->string('handle', 255)->nullable();
            $table->string('title', 255)->nullable();
            $table->string('vendor', 100)->nullable();
            $table->string('product_type', 100)->nullable();
            $table->enum('status', ['active', 'archived', 'draft'])->nullable();
            $table->string('featured_image_url')->nullable();
            $table->string('storefront_url')->nullable();
            $table->string('admin_url')->nullable();
            $table->json('all_images')->nullable(); // Array of all product images
            $table->json('variant_data')->nullable(); // Price, inventory, etc.
            $table->timestamp('last_synced_at')->nullable();
            $table->timestamps();

            $table->unique('part_id'); // One shopify record per part
            $table->index('shopify_id');
            $table->index(['vendor', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::connection('parts_database')->dropIfExists('parts_shopify_data');
        Schema::connection('parts_database')->dropIfExists('parts_additional_fields');
        Schema::connection('parts_database')->dropIfExists('parts');
        Schema::connection('parts_database')->dropIfExists('parts_uploads');
    }
};
