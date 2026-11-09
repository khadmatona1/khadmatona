<?php

return [

    'errors' => [
        'meta_not_configured' => 'The Meta app is not configured. Set META_SOCIAL_APP_ID and META_SOCIAL_APP_SECRET in the .env file.',
        'account_not_connected' => 'No account is connected for this platform.',
        'token_invalid' => 'Access to the Meta account has expired or was revoked. Reconnect the account in the social publishing settings.',
        'outcome_unknown' => 'Meta did not answer the publish request: the post may be live. Check the page before retrying.',
        'rate_limited' => 'Meta request limit reached. It will be retried automatically.',
        'instagram_quota_reached' => 'Daily Instagram publishing quota reached. It will be retried automatically.',
        'meta_unreachable' => 'Meta is temporarily unreachable. It will be retried automatically.',
        'meta_rejected' => 'Meta refused the post: :reason',
        'unexpected_response' => 'Unexpected response from Meta.',
        'unexpected_error' => 'An unexpected error occurred while publishing.',
        'image_unreachable' => 'The photos are temporarily unreachable. It will be retried automatically.',
        'no_images' => 'Instagram requires at least one photo: this property has none.',
        'no_valid_images' => 'None of this property\'s photos can be used (they must be publicly reachable over HTTPS, in the right format and size).',
        'container_error' => 'Instagram could not process the media.',
        'container_expired' => 'The Instagram media expired before it was published.',
        'container_not_ready' => 'Instagram is still processing the media. It will be retried automatically.',
        'property_not_public' => 'This property is not published on the site: it must be approved and available.',
        'platform_disabled' => 'Publishing is disabled for this platform in the settings.',
        'already_published' => 'This property is already published, or being published, on the selected platforms.',
        'not_retryable' => 'Only a failed publication can be retried.',
        'invalid_oauth_state' => 'The Meta connection expired or is invalid. Please start again.',
        'oauth_session_expired' => 'The Meta login session expired. Please start again.',
        'page_not_available' => 'This Page is not available for this Facebook account.',
    ],

];
