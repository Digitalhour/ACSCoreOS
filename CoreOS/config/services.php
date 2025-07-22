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
        'token' => env('POSTMARK_TOKEN'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'resend' => [
        'key' => env('RESEND_KEY'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'workos' => [
        'client_id' => env('WORKOS_CLIENT_ID'),
        'secret' => env('WORKOS_API_KEY'),
        'redirect_url' => env('WORKOS_REDIRECT_URL'),
        'environment' => env('WORKOS_ENVIRONMENT', 'sandbox'),
    ],
    'shopify' => [
        'shop_domain' => env('SHOPIFY_SHOP_DOMAIN'),
        'access_token' => env('SHOPIFY_ACCESS_TOKEN'),
        'storefront_domain' => env('SHOPIFY_STOREFRONT_DOMAIN', 'aircompressorservices.com'),
        'api_version' => env('SHOPIFY_API_VERSION', '2023-10'),
    ],
    'netsuite' => [
        'base_url' => env('NETSUITE_BASE_URL'),
        'realm' => env('NETSUITE_REALM'),
        'consumer_key' => env('NETSUITE_CONSUMER_KEY'),
        'consumer_secret_key' => env('NETSUITE_CONSUMER_SECRET_KEY'),
        'token' => env('NETSUITE_TOKEN'),
        'token_secret' => env('NETSUITE_TOKEN_SECRET'),
    ],
    'google' => [
        'service_account_path' => storage_path('app/google-service-account.json'),
        'drive_id' => '0APmI_YWtWCEhUk9PVA',
    ],



];
