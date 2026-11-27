<?php

return [
    'secret' => env('JWT_SECRET', env('APP_KEY')),
    'issuer' => env('APP_URL', 'http://localhost'),
    'ttl' => 3600,
];
