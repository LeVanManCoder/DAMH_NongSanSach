<?php

namespace App\Services;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;

class ShippingService
{
    /**
     * @return array{khoang_cach_km: string, phi_van_chuyen: int, phuong_thuc_tinh: string, ghi_chu: ?string}
     */
    public function calculate(
        ?string $address,
        ?float $distanceKm = null,
        ?float $latitude = null,
        ?float $longitude = null,
    ): array {
        $note = null;
        $method = 'uoc_tinh_mac_dinh';

        if ($distanceKm !== null) {
            $distance = $distanceKm;
            $method = 'khoang_cach_cung_cap';
        } elseif ($latitude !== null && $longitude !== null && $this->hasOriginCoordinates()) {
            $distance = $this->haversineDistance($latitude, $longitude);
            $method = 'haversine';
        } elseif ($address !== null && $this->canUseGoogleMaps()) {
            [$distance, $note] = $this->googleMapsDistance($address);
            $method = $note === null ? 'google_maps' : 'uoc_tinh_du_phong';

            if ($note !== null && $latitude !== null && $longitude !== null && $this->hasOriginCoordinates()) {
                $distance = $this->haversineDistance($latitude, $longitude);
                $method = 'haversine';
            }
        } elseif ($latitude !== null && $longitude !== null && ! $this->hasOriginCoordinates()) {
            $distance = (float) config('shipping.fallback_distance_km', 5);
            $note = 'Chưa cấu hình tọa độ nông trại; đang dùng khoảng cách ước tính mặc định.';
        } else {
            $distance = (float) config('shipping.fallback_distance_km', 5);
            $note = 'Google Maps chưa cấu hình; đang dùng khoảng cách ước tính mặc định.';
        }

        $distance = round(max(0, $distance), 2);

        return [
            'khoang_cach_km' => number_format($distance, 2, '.', ''),
            'phi_van_chuyen' => (int) ceil($distance * (int) config('shipping.price_per_km', 5000)),
            'phuong_thuc_tinh' => $method,
            'ghi_chu' => $note,
        ];
    }

    private function canUseGoogleMaps(): bool
    {
        return filled(config('shipping.google_maps_api_key'))
            && filled(config('shipping.origin_address'));
    }

    private function hasOriginCoordinates(): bool
    {
        return is_numeric(config('shipping.origin_latitude'))
            && is_numeric(config('shipping.origin_longitude'));
    }

    private function haversineDistance(float $latitude, float $longitude): float
    {
        $originLatitude = deg2rad((float) config('shipping.origin_latitude'));
        $originLongitude = deg2rad((float) config('shipping.origin_longitude'));
        $destinationLatitude = deg2rad($latitude);
        $destinationLongitude = deg2rad($longitude);

        $latitudeDelta = $destinationLatitude - $originLatitude;
        $longitudeDelta = $destinationLongitude - $originLongitude;
        $a = sin($latitudeDelta / 2) ** 2
            + cos($originLatitude) * cos($destinationLatitude) * sin($longitudeDelta / 2) ** 2;

        return 6371 * 2 * atan2(sqrt($a), sqrt(1 - $a));
    }

    /**
     * @return array{0: float, 1: ?string}
     */
    private function googleMapsDistance(string $address): array
    {
        try {
            $response = Http::timeout(5)->get(
                'https://maps.googleapis.com/maps/api/distancematrix/json',
                [
                    'origins' => config('shipping.origin_address'),
                    'destinations' => $address,
                    'key' => config('shipping.google_maps_api_key'),
                    'language' => 'vi',
                    'units' => 'metric',
                ],
            );
        } catch (ConnectionException) {
            return [
                (float) config('shipping.fallback_distance_km', 5),
                'Không thể kết nối Google Maps; đang dùng khoảng cách ước tính mặc định.',
            ];
        }

        $element = $response->json('rows.0.elements.0');
        if ($response->successful()
            && is_array($element)
            && ($element['status'] ?? null) === 'OK'
            && is_numeric($element['distance']['value'] ?? null)) {
            return [(float) $element['distance']['value'] / 1000, null];
        }

        return [
            (float) config('shipping.fallback_distance_km', 5),
            'Google Maps không trả được khoảng cách; đang dùng khoảng cách ước tính mặc định.',
        ];
    }
}
