<?php

// Every module's routes are wired here - the single, reviewable manifest
// of what endpoints exist, alongside bootstrap/providers.php for modules.
require __DIR__.'/../app/Core/Auth/Http/routes.php';
require __DIR__.'/../app/Core/Localization/Http/routes.php';
require __DIR__.'/../app/Core/Lookup/Http/routes.php';
require __DIR__.'/../app/Core/Notification/Http/routes.php';
require __DIR__.'/../app/Modules/Property/Http/routes.php';
require __DIR__.'/../app/Modules/Lead/Http/routes.php';
require __DIR__.'/../app/Modules/Lookup/Http/routes.php';
require __DIR__.'/../app/Modules/Settings/Http/routes.php';
require __DIR__.'/../app/Modules/Blog/Http/routes.php';
require __DIR__.'/../app/Modules/Reviews/Http/routes.php';
require __DIR__.'/../app/Modules/CommercialLead/Http/routes.php';
require __DIR__.'/../app/Modules/Contact/Http/routes.php';
require __DIR__.'/../app/Modules/WhatsApp/Http/routes.php';
require __DIR__.'/../app/Modules/PropertyAlert/Http/routes.php';
require __DIR__.'/../app/Modules/Visit/Http/routes.php';
require __DIR__.'/../app/Modules/OwnerPortal/Http/routes.php';
require __DIR__.'/../app/Modules/Analytics/Http/routes.php';
require __DIR__.'/../app/Modules/Rental/Http/routes.php';
require __DIR__.'/../app/Modules/Finance/Http/routes.php';
require __DIR__.'/../app/Modules/Task/Http/routes.php';
require __DIR__.'/../app/Modules/InternalChat/Http/routes.php';
require __DIR__.'/../app/Modules/SocialPublishing/Http/routes.php';
