<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('timesheets', function (Blueprint $table) {
            $table->timestamp('rejected_at')->nullable()->after('processed_at');
            $table->unsignedBigInteger('rejected_by')->nullable()->after('processed_by');
            $table->text('rejection_reason')->nullable()->after('payroll_notes');
            $table->text('rejection_notes')->nullable()->after('rejection_reason');

            $table->foreign('rejected_by')->references('id')->on('users')->onDelete('set null');
        });
    }

    public function down()
    {
        Schema::table('timesheets', function (Blueprint $table) {
            $table->dropForeign(['rejected_by']);
            $table->dropColumn(['rejected_at', 'rejected_by', 'rejection_reason', 'rejection_notes']);
        });
    }
};
