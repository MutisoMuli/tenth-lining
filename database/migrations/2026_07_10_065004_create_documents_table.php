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
        Schema::create('documents', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('user_id')->nullable()->constrained()->onDelete('set null');
            $table->string('original_name');
            $table->string('original_path');
            $table->string('formatted_path')->nullable();
            $table->integer('page_count');
            $table->bigInteger('file_size');
            $table->bigInteger('compressed_size')->nullable();
            $table->string('status')->default('pending'); // pending, processing, completed, failed
            $table->string('payment_status')->default('unpaid'); // unpaid, paid
            $table->json('page_number_settings')->nullable();
            $table->json('tenth_line_settings')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('documents');
    }
};
