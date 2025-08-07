<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Drop existing unique constraint (MySQL syntax)
        try {
            DB::statement('DROP INDEX wiki_books_slug_unique ON wiki_books');
        } catch (\Exception $e) {
            // Index doesn't exist, continue
        }

        // Note: MySQL doesn't support partial unique indexes like PostgreSQL
        // You'll need a different approach for soft delete handling
        Schema::table('wiki_books', function (Blueprint $table) {
            $table->unique('slug');
        });
    }

    public function down(): void
    {
        Schema::table('wiki_books', function (Blueprint $table) {
            $table->dropUnique(['slug']);
            $table->unique('slug');
        });
    }
};
