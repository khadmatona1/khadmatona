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

    // WhatsApp Business via Meta's Cloud API - see
    // App\Modules\WhatsApp\Infrastructure\MetaCloudApiGateway. Every value is
    // optional: with no access_token/phone_number_id the module stays inert
    // and GET /api/v1/whatsapp/status reports "not configured" (nothing
    // errors). Full setup notes live in .env.example.
    'whatsapp' => [
        // Permanent System User token (or a temporary token while testing).
        'access_token' => env('WHATSAPP_ACCESS_TOKEN'),
        // The Phone Number ID (NOT the phone number itself) from the Meta
        // developer console's WhatsApp > API Setup page.
        'phone_number_id' => env('WHATSAPP_PHONE_NUMBER_ID'),
        // WhatsApp Business Account ID - only needed to list approved templates.
        'business_account_id' => env('WHATSAPP_BUSINESS_ACCOUNT_ID'),
        // App Secret (App settings > Basic): verifies webhook signatures.
        'app_secret' => env('WHATSAPP_APP_SECRET'),
        // Any string you choose; must equal what you type in Meta's webhook
        // config so Meta's subscription handshake is accepted.
        'verify_token' => env('WHATSAPP_VERIFY_TOKEN'),
        'api_version' => env('WHATSAPP_API_VERSION', 'v21.0'),
        // Template used to open a conversation when none is specified.
        // "hello_world"/"en_US" is the pre-approved template every account has.
        'default_template' => env('WHATSAPP_DEFAULT_TEMPLATE', 'hello_world'),
        'default_template_language' => env('WHATSAPP_DEFAULT_TEMPLATE_LANGUAGE', 'en_US'),
        // Template used by App\Modules\PropertyAlert to notify a saved
        // search's contact of a new matching property - must be created
        // and approved in Meta Business Manager separately; until then
        // sends simply fail gracefully like everything else here.
        'alert_template' => env('WHATSAPP_ALERT_TEMPLATE', 'property_alert_match'),
        // Template used by App\Modules\Visit to confirm a booked visit -
        // same "not approved yet = graceful no-op" story as alert_template.
        'visit_confirmation_template' => env('WHATSAPP_VISIT_CONFIRMATION_TEMPLATE', 'visit_confirmation'),
        // Public HTTPS origin used ONLY to display the webhook URL to paste
        // into Meta (ngrok in dev, your domain in production). Falls back to
        // APP_URL. Meta's signature is body-based, so this is never verified.
        'webhook_base_url' => env('WHATSAPP_WEBHOOK_BASE_URL'),
        // Global switch for the AutoReplyStrategy (AI) hook - see
        // App\Modules\WhatsApp\Domain\Contracts\AutoReplyStrategy.
        'ai_enabled' => (bool) env('WHATSAPP_AI_ENABLED', false),
    ],

    // Facebook Page + Instagram publishing - see
    // App\Modules\SocialPublishing\Infrastructure\MetaGraphApiClient. Optional:
    // without app_id/app_secret the connect flow reports "not configured" and
    // nothing else changes. Tokens are NOT here - they come from the Admin's
    // Facebook login and are stored encrypted in social_accounts.
    'meta_social' => [
        'app_id' => env('META_SOCIAL_APP_ID'),
        'app_secret' => env('META_SOCIAL_APP_SECRET'),
        'api_version' => env('META_SOCIAL_API_VERSION', 'v26.0'),
        // Facebook Login for Business configuration; when set it replaces `scopes`.
        'login_config_id' => env('META_SOCIAL_LOGIN_CONFIG_ID'),
        'scopes' => env('META_SOCIAL_SCOPES', 'pages_show_list,pages_read_engagement,pages_manage_posts,instagram_basic,instagram_content_publish,business_management'),
        // Defaults to {FRONTEND_URL}/dashboard/settings/social/callback.
        'redirect_uri' => env('META_SOCIAL_REDIRECT_URI'),
    ],

    // Homepage "Nos clients parlent de nous" testimonials section - see
    // App\Modules\Reviews\Infrastructure\GooglePlacesReviewsProvider.
    'google_places' => [
        'api_key' => env('GOOGLE_PLACES_API_KEY'),
        'place_id' => env('GOOGLE_PLACE_ID'),
    ],

];
