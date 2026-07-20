<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'mpesa' => [
        'consumer_key' => env('MPESA_CONSUMER_KEY', ''),
        'consumer_secret' => env('MPESA_CONSUMER_SECRET', ''),
        'passkey' => env('MPESA_PASSKEY', ''),
        'shortcode' => env('MPESA_SHORTCODE', '4879341'),
        'store_number' => env('MPESA_STORE_NUMBER', ''),
        'transaction_type' => env('MPESA_TRANSACTION_TYPE', 'CustomerBuyGoodsOnline'),
        'callback_url' => env('MPESA_CALLBACK_URL', ''),
        'environment' => env('MPESA_ENVIRONMENT', 'production'),
    ],

    'libreoffice' => [
        'path' => env('LIBREOFFICE_PATH', 'soffice'),
    ],

    'ghostscript' => [
        'path' => env('GHOSTSCRIPT_PATH', 'gs'),
    ],

];
