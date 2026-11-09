<?php

return [

    'reset_password' => [
        'subject' => 'Réinitialisation de votre mot de passe',
        'greeting' => 'Bonjour :name,',
        'line1' => 'Vous recevez cet e-mail car nous avons reçu une demande de réinitialisation du mot de passe de votre compte.',
        'action' => 'Réinitialiser le mot de passe',
        'line2' => 'Ce lien de réinitialisation expirera dans 60 minutes.',
        'line3' => "Si vous n'êtes pas à l'origine de cette demande, aucune action supplémentaire n'est requise.",
    ],

    'new_property_pending' => [
        'subject' => 'Bien en attente de validation',
        'greeting' => 'Bonjour :name,',
        'line1' => 'Le Commercial :commercial a soumis le bien "":title"" pour validation.',
        'action' => 'Voir le bien',
    ],

    'lead_callback_due' => [
        'subject' => 'Rappel : un lead est à rappeler',
        'greeting' => 'Bonjour :name,',
        'line1' => "C'est l'heure de rappeler :lead (téléphone : :phone).",
        'action' => 'Ouvrir le lead',
    ],

    'visit_assigned' => [
        'subject' => 'Une visite vous concerne',
        'greeting' => 'Bonjour :name,',
        'line1' => 'La visite de :lead pour le bien "":property"" est prévue le :when.',
        'action' => 'Voir le calendrier des visites',
    ],

];
