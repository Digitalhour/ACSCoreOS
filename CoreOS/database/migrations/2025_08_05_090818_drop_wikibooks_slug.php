<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Drop existing unique constraint
        DB::statement('DROP INDEX IF EXISTS wiki_books_slug_unique');

        // Create partial unique index excluding soft deletes
        DB::statement('CREATE UNIQUE INDEX wiki_books_slug_unique ON wiki_books(slug) WHERE deleted_at IS NULL');
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS wiki_books_slug_unique');

        Schema::table('wiki_books', function (Blueprint $table) {
            $table->unique('slug');
        });
    }
};
