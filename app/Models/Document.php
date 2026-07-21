<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Document extends Model
{
    use HasUuids;

    protected $fillable = [
        'user_id',
        'original_name',
        'original_path',
        'formatted_path',
        'page_count',
        'file_size',
        'compressed_size',
        'status',
        'payment_status',
        'tool_type',
        'page_number_settings',
        'tenth_line_settings',
    ];

    protected $casts = [
        'page_number_settings' => 'array',
        'tenth_line_settings' => 'array',
    ];

    public static function safeCreate(array $attributes): self
    {
        if (isset($attributes['tool_type']) && !\Illuminate\Support\Facades\Schema::hasColumn('documents', 'tool_type')) {
            unset($attributes['tool_type']);
        }
        return static::create($attributes);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function payment(): HasOne
    {
        return $this->hasOne(Payment::class);
    }

    public function downloads(): HasMany
    {
        return $this->hasMany(Download::class);
    }
}
