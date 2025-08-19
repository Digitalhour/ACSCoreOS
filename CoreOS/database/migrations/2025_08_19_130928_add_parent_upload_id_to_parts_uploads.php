<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('parts_database')->table('parts_uploads', function (Blueprint $table) {
            $table->unsignedBigInteger('parent_upload_id')->nullable()->after('batch_id');
            $table->foreign('parent_upload_id')->references('id')->on('parts_uploads')->onDelete('cascade');
            $table->index('parent_upload_id');
        });
    }

    public function down(): void
    {
        Schema::connection('parts_database')->table('parts_uploads', function (Blueprint $table) {
            $table->dropForeign(['parent_upload_id']);
            $table->dropIndex(['parent_upload_id']);
            $table->dropColumn('parent_upload_id');
        });
    }
};
