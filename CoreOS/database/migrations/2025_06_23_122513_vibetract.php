<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('Vibetrack', function (Blueprint $table) {
            $table->id();
            $table->string('runtime_min');
            $table->string('runtime_sec');


            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('Vibetrack');
    }
};
