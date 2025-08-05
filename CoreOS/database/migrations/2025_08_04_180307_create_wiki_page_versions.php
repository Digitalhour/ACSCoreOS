<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('wiki_page_versions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('wiki_page_id')->constrained()->onDelete('cascade');
            $table->string('name');
            $table->longText('content');
            $table->text('excerpt')->nullable();
            $table->string('featured_image')->nullable();
            $table->integer('version_number');
            $table->text('change_summary')->nullable();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->unique(['wiki_page_id', 'version_number']);
            $table->index(['wiki_page_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('wiki_page_versions');
    }
};
