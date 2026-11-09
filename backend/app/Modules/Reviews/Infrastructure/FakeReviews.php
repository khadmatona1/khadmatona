<?php

namespace App\Modules\Reviews\Infrastructure;

/**
 * ============================================================================
 * TEMPORARY - lets the homepage testimonials section be design-reviewed with
 * realistic fake reviews before GOOGLE_PLACES_API_KEY/GOOGLE_PLACE_ID are
 * configured for real. Only ever used when the SHOW_FAKE_REVIEWS env flag is
 * true (see config/app.php's `show_fake_reviews` and this class's one call
 * site in GooglePlacesReviewsProvider::getSummary()). Never enable the flag
 * in production.
 *
 * To remove once done: delete this file, delete the `show_fake_reviews`
 * config key, and delete the `maybeFake()` call site in
 * GooglePlacesReviewsProvider - then set SHOW_FAKE_REVIEWS=false (or remove
 * it) in .env.
 *
 * Fully fictional - no real names, no real photos (blank `profile_photo_url`
 * renders as an initials circle on the frontend, same as a real Google
 * reviewer with no profile photo).
 * ============================================================================
 */
class FakeReviews
{
    private const REVIEWS = [
        [
            'author_name' => 'Mohamed El Amrani',
            'rating' => 5,
            'text' => [
                'fr' => "Service exceptionnel ! L'équipe nous a accompagnés du début à la fin jusqu'à la signature. Merci pour votre professionnalisme.",
                'en' => 'Exceptional service! The team supported us from start to finish through to the signing. Thank you for your professionalism.',
                'ar' => 'خدمة استثنائية! رافقنا الفريق من البداية إلى التوقيع النهائي. شكرًا على احترافيتكم.',
            ],
            'relative_time_description' => ['fr' => 'il y a 2 semaines', 'en' => '2 weeks ago', 'ar' => 'قبل أسبوعين'],
        ],
        [
            'author_name' => 'Fatima Zahra',
            'rating' => 5,
            'text' => [
                'fr' => "Excellente expérience. Une équipe à l'écoute, réactive et très professionnelle. Je recommande vivement !",
                'en' => 'Excellent experience. A team that listens, responsive and very professional. Highly recommend!',
                'ar' => 'تجربة ممتازة. فريق منصت وسريع الاستجابة واحترافي جدًا. أنصح به بشدة!',
            ],
            'relative_time_description' => ['fr' => 'il y a 1 mois', 'en' => '1 month ago', 'ar' => 'قبل شهر'],
        ],
        [
            'author_name' => 'Youssef Benali',
            'rating' => 5,
            'text' => [
                'fr' => "Nous avons trouvé la maison de nos rêves grâce à leur accompagnement. Un grand merci à toute l'équipe !",
                'en' => 'We found the house of our dreams thanks to their support. A big thank you to the whole team!',
                'ar' => 'وجدنا منزل أحلامنا بفضل مرافقتهم. شكرًا جزيلًا لكل الفريق!',
            ],
            'relative_time_description' => ['fr' => 'il y a 1 mois', 'en' => '1 month ago', 'ar' => 'قبل شهر'],
        ],
        [
            'author_name' => 'Sara El Kettani',
            'rating' => 4,
            'text' => [
                'fr' => 'Très satisfaite du service. Disponibilité, conseil et suivi irréprochables. Je recommande les yeux fermés.',
                'en' => 'Very satisfied with the service. Impeccable availability, advice and follow-up. Highly recommended.',
                'ar' => 'راضية جدًا عن الخدمة. توفر ونصيحة ومتابعة لا تشوبها شائبة. أنصح به دون تردد.',
            ],
            'relative_time_description' => ['fr' => 'il y a 2 mois', 'en' => '2 months ago', 'ar' => 'قبل شهرين'],
        ],
        [
            'author_name' => 'Karim Idrissi',
            'rating' => 5,
            'text' => [
                'fr' => 'Processus clair du premier contact à la remise des clés. Équipe réactive et de bon conseil à chaque étape.',
                'en' => 'Clear process from first contact to key handover. Responsive team with good advice at every step.',
                'ar' => 'مسار واضح من أول تواصل إلى تسليم المفاتيح. فريق سريع الاستجابة وذو نصيحة جيدة في كل خطوة.',
            ],
            'relative_time_description' => ['fr' => 'il y a 3 mois', 'en' => '3 months ago', 'ar' => 'قبل 3 أشهر'],
        ],
    ];

    /**
     * @return array{
     *     rating: float,
     *     total: int,
     *     reviews: list<array{
     *         author_name: string,
     *         profile_photo_url: string,
     *         rating: int,
     *         relative_time_description: string,
     *         text: string,
     *     }>,
     *     write_review_url: string,
     *     all_reviews_url: string,
     * }
     */
    public static function make(string $locale): array
    {
        return [
            'rating' => 4.9,
            'total' => 250,
            'reviews' => array_map(
                fn (array $review): array => [
                    'author_name' => $review['author_name'],
                    'profile_photo_url' => '',
                    'rating' => $review['rating'],
                    'relative_time_description' => $review['relative_time_description'][$locale]
                        ?? $review['relative_time_description']['fr'],
                    'text' => $review['text'][$locale] ?? $review['text']['fr'],
                ],
                self::REVIEWS,
            ),
            'write_review_url' => '#',
            'all_reviews_url' => '#',
        ];
    }
}
