<?php

namespace App\Filament\Resources\Documents\Schemas;

use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Textarea;
use Filament\Schemas\Schema;

class DocumentForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                Select::make('user_id')
                    ->relationship('user', 'name'),
                TextInput::make('original_name')
                    ->required(),
                TextInput::make('original_path')
                    ->required(),
                TextInput::make('formatted_path'),
                TextInput::make('page_count')
                    ->required()
                    ->numeric(),
                TextInput::make('file_size')
                    ->required()
                    ->numeric(),
                TextInput::make('compressed_size')
                    ->numeric(),
                TextInput::make('status')
                    ->required()
                    ->default('pending'),
                TextInput::make('payment_status')
                    ->required()
                    ->default('unpaid'),
                Textarea::make('page_number_settings')
                    ->columnSpanFull(),
                Textarea::make('tenth_line_settings')
                    ->columnSpanFull(),
            ]);
    }
}
