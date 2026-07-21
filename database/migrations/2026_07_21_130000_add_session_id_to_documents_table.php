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
        if (!Schema::hasColumn('documents', 'session_id')) {
            Schema::table('documents', function (Blueprint $table) {
                $table->string('session_id', 255)->nullable()->index()->after('user_id');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('documents', 'session_id')) {
            Schema::table('documents', function (Blueprint $table) {
                $table->dropColumn('session_id');
            });
        }
    }
};
