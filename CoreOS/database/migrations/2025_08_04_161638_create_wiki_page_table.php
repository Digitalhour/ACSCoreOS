<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('wiki_pages', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug');
            $table->longText('content');
            $table->text('excerpt')->nullable();
            $table->string('featured_image')->nullable();
            $table->enum('status', ['draft', 'published'])->default('draft');
            $table->foreignId('wiki_chapter_id')->constrained()->onDelete('cascade');
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->integer('sort_order')->default(0);
            $table->integer('version')->default(1);
            $table->json('metadata')->nullable();
            $table->timestamp('published_at')->nullable();
            $table->integer('view_count')->default(0);
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['wiki_chapter_id', 'slug']);
            $table->index(['wiki_chapter_id', 'sort_order']);
            $table->index(['status', 'published_at']);
            $table->index('version');
//            $table->fullText(['name', 'content', 'excerpt']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('wiki_pages');
    }
};
