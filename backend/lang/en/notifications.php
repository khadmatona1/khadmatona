<?php

return [

    'reset_password' => [
        'subject' => 'Reset Your Password',
        'greeting' => 'Hello :name,',
        'line1' => 'You are receiving this email because we received a password reset request for your account.',
        'action' => 'Reset Password',
        'line2' => 'This password reset link will expire in 60 minutes.',
        'line3' => 'If you did not request a password reset, no further action is required.',
    ],

    'new_property_pending' => [
        'subject' => 'Property awaiting approval',
        'greeting' => 'Hello :name,',
        'line1' => 'Commercial :commercial submitted the property "":title"" for approval.',
        'action' => 'View property',
    ],

    'lead_callback_due' => [
        'subject' => 'Reminder: a lead is due for a callback',
        'greeting' => 'Hello :name,',
        'line1' => "It's time to call :lead back (phone: :phone).",
        'action' => 'Open lead',
    ],

    'visit_assigned' => [
        'subject' => 'A visit concerns you',
        'greeting' => 'Hello :name,',
        'line1' => ':lead\'s visit for the property "":property"" is scheduled for :when.',
        'action' => 'View visits calendar',
    ],

];
