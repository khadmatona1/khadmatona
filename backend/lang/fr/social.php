<?php

return [

    'errors' => [
        'meta_not_configured' => "L'application Meta n'est pas configurée. Renseignez META_SOCIAL_APP_ID et META_SOCIAL_APP_SECRET dans le fichier .env.",
        'account_not_connected' => "Aucun compte n'est connecté pour cette plateforme.",
        'token_invalid' => "L'accès au compte Meta a expiré ou a été révoqué. Reconnectez le compte dans les paramètres de publication sociale.",
        'outcome_unknown' => "Meta n'a pas répondu à la publication : le post est peut-être en ligne. Vérifiez la page avant de réessayer.",
        'rate_limited' => 'Limite de requêtes Meta atteinte. Une nouvelle tentative aura lieu automatiquement.',
        'instagram_quota_reached' => 'Quota quotidien de publication Instagram atteint. Une nouvelle tentative aura lieu automatiquement.',
        'meta_unreachable' => 'Meta est momentanément injoignable. Une nouvelle tentative aura lieu automatiquement.',
        'meta_rejected' => 'Meta a refusé la publication : :reason',
        'unexpected_response' => 'Réponse inattendue de Meta.',
        'unexpected_error' => 'Une erreur inattendue est survenue pendant la publication.',
        'image_unreachable' => 'Les photos sont momentanément inaccessibles. Une nouvelle tentative aura lieu automatiquement.',
        'no_images' => "Instagram exige au moins une photo : ce bien n'en a aucune.",
        'no_valid_images' => "Aucune photo de ce bien n'est utilisable (elles doivent être accessibles publiquement en HTTPS, au bon format et à la bonne taille).",
        'container_error' => "Instagram n'a pas pu traiter le média.",
        'container_expired' => 'Le média Instagram a expiré avant sa publication.',
        'container_not_ready' => "Instagram traite encore le média. Une nouvelle tentative aura lieu automatiquement.",
        'property_not_public' => "Ce bien n'est pas publié sur le site : il doit être approuvé et disponible.",
        'platform_disabled' => 'La publication est désactivée pour cette plateforme dans les paramètres.',
        'already_published' => 'Ce bien est déjà publié ou en cours de publication sur les plateformes choisies.',
        'not_retryable' => "Seule une publication en échec peut être relancée.",
        'invalid_oauth_state' => 'La connexion à Meta a expiré ou est invalide. Veuillez recommencer.',
        'oauth_session_expired' => 'La session de connexion à Meta a expiré. Veuillez recommencer.',
        'page_not_available' => "Cette page n'est pas disponible pour ce compte Facebook.",
    ],

];
