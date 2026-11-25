<?php

return [
    'price_per_km' => 5000,
    'fallback_distance_km' => (float) env('SHIPPING_FALLBACK_DISTANCE_KM', 5),
    'origin_address' => env('SHIPPING_ORIGIN_ADDRESS'),
    'origin_latitude' => env('SHIPPING_ORIGIN_LATITUDE'),
    'origin_longitude' => env('SHIPPING_ORIGIN_LONGITUDE'),
    'google_maps_api_key' => env('GOOGLE_MAPS_API_KEY'),
];
