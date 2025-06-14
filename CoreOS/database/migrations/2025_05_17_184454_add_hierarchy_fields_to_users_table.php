<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Foreign key for current position
            $table->foreignId('position_id')
                ->nullable()
                ->after('email') // Or wherever you prefer
                ->constrained('positions')
                ->onUpdate('cascade')
                ->onDelete('set null'); // Or 'restrict' if a position can't be deleted if users are assigned

            // Foreign key for current direct manager (self-referencing)
            $table->foreignId('reports_to_user_id')
                ->nullable()
                ->after('position_id')
                ->constrained('users') // References the 'id' on the 'users' table
                ->onUpdate('cascade')
                ->onDelete('set null'); // Or 'restrict'
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['position_id']);
            $table->dropColumn('position_id');
            $table->dropForeign(['reports_to_user_id']);
            $table->dropColumn('reports_to_user_id');
        });
    }
};
