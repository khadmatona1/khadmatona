<?php

return [

    'errors' => [
        'meta_not_configured' => 'تطبيق Meta غير مُهيأ. يرجى ضبط META_SOCIAL_APP_ID و META_SOCIAL_APP_SECRET في ملف .env.',
        'account_not_connected' => 'لا يوجد حساب مرتبط بهذه المنصة.',
        'token_invalid' => 'انتهت صلاحية الوصول إلى حساب Meta أو تم إلغاؤه. أعد ربط الحساب في إعدادات النشر الاجتماعي.',
        'outcome_unknown' => 'لم يرد Meta على طلب النشر: قد يكون المنشور متاحًا بالفعل. تحقق من الصفحة قبل إعادة المحاولة.',
        'rate_limited' => 'تم بلوغ حد طلبات Meta. ستتم إعادة المحاولة تلقائيًا.',
        'instagram_quota_reached' => 'تم بلوغ حصة النشر اليومية على Instagram. ستتم إعادة المحاولة تلقائيًا.',
        'meta_unreachable' => 'يتعذر الوصول إلى Meta مؤقتًا. ستتم إعادة المحاولة تلقائيًا.',
        'meta_rejected' => 'رفض Meta المنشور: :reason',
        'unexpected_response' => 'استجابة غير متوقعة من Meta.',
        'unexpected_error' => 'حدث خطأ غير متوقع أثناء النشر.',
        'image_unreachable' => 'يتعذر الوصول إلى الصور مؤقتًا. ستتم إعادة المحاولة تلقائيًا.',
        'no_images' => 'يتطلب Instagram صورة واحدة على الأقل: هذا العقار بدون صور.',
        'no_valid_images' => 'لا يمكن استخدام أي من صور هذا العقار (يجب أن تكون متاحة للعموم عبر HTTPS وبالصيغة والحجم المناسبين).',
        'container_error' => 'تعذر على Instagram معالجة الوسائط.',
        'container_expired' => 'انتهت صلاحية وسائط Instagram قبل نشرها.',
        'container_not_ready' => 'ما زال Instagram يعالج الوسائط. ستتم إعادة المحاولة تلقائيًا.',
        'property_not_public' => 'هذا العقار غير منشور على الموقع: يجب أن يكون معتمدًا ومتاحًا.',
        'platform_disabled' => 'النشر معطل لهذه المنصة في الإعدادات.',
        'already_published' => 'هذا العقار منشور بالفعل أو قيد النشر على المنصات المحددة.',
        'not_retryable' => 'يمكن إعادة محاولة المنشورات الفاشلة فقط.',
        'invalid_oauth_state' => 'انتهت صلاحية الاتصال بـ Meta أو أنه غير صالح. يرجى البدء من جديد.',
        'oauth_session_expired' => 'انتهت جلسة تسجيل الدخول إلى Meta. يرجى البدء من جديد.',
        'page_not_available' => 'هذه الصفحة غير متاحة لحساب Facebook هذا.',
    ],

];
