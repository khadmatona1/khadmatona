<?php

use App\Core\Auth\CoreAuthServiceProvider;
use App\Core\Localization\CoreLocalizationServiceProvider;
use App\Core\Lookup\CoreLookupServiceProvider;
use App\Core\Media\CoreMediaServiceProvider;
use App\Core\Notification\CoreNotificationServiceProvider;
use App\Core\Permissions\CorePermissionsServiceProvider;
use App\Modules\Analytics\AnalyticsServiceProvider;
use App\Modules\Blog\BlogServiceProvider;
use App\Modules\CommercialLead\CommercialLeadServiceProvider;
use App\Modules\Contact\ContactServiceProvider;
use App\Modules\Finance\FinanceServiceProvider;
use App\Modules\Lead\LeadServiceProvider;
use App\Modules\Lookup\LookupServiceProvider;
use App\Modules\OwnerPortal\OwnerPortalServiceProvider;
use App\Modules\Property\PropertyServiceProvider;
use App\Modules\PropertyAlert\PropertyAlertServiceProvider;
use App\Modules\Rental\RentalServiceProvider;
use App\Modules\Reviews\ReviewsServiceProvider;
use App\Modules\Settings\SettingsServiceProvider;
use App\Modules\Visit\VisitServiceProvider;
use App\Modules\WhatsApp\WhatsAppServiceProvider;
use App\Providers\AppServiceProvider;

return [
    AppServiceProvider::class,

    // Core (cross-cutting, shared by every module)
    CoreAuthServiceProvider::class,
    CoreLocalizationServiceProvider::class,
    CoreLookupServiceProvider::class,
    CoreMediaServiceProvider::class,
    CoreNotificationServiceProvider::class,
    CorePermissionsServiceProvider::class,

    // MVP business modules
    PropertyServiceProvider::class,
    LeadServiceProvider::class,
    LookupServiceProvider::class,
    SettingsServiceProvider::class,
    BlogServiceProvider::class,
    ReviewsServiceProvider::class,

    // Post-MVP business modules
    CommercialLeadServiceProvider::class,
    ContactServiceProvider::class,
    WhatsAppServiceProvider::class,
    PropertyAlertServiceProvider::class,
    VisitServiceProvider::class,
    OwnerPortalServiceProvider::class,
    AnalyticsServiceProvider::class,
    RentalServiceProvider::class,
    FinanceServiceProvider::class,
    App\Modules\Task\TaskServiceProvider::class,
    App\Modules\InternalChat\InternalChatServiceProvider::class,
    App\Modules\SocialPublishing\SocialPublishingServiceProvider::class,
];
