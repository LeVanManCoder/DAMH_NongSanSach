<?php

namespace App\Services;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Symfony\Component\HttpKernel\Exception\HttpException;

class ImageStorageService
{
    private const FOLDERS = [
        'nong-lanh/complaints',
        'nong-lanh/farming-logs',
        'nong-lanh/products',
    ];

    public function store(UploadedFile $file, string $folder): string
    {
        if (! in_array($folder, self::FOLDERS, true)) {
            throw new \InvalidArgumentException('Thư mục lưu ảnh không hợp lệ.');
        }

        if ($this->cloudinaryConfigured() && config('app.env') !== 'testing') {
            return $this->uploadToCloudinary($file, $folder);
        }

        $localFolder = substr($folder, strlen('nong-lanh/'));
        $path = $file->store($localFolder, 'public');
        if ($path === false) {
            throw new RuntimeException('Không thể lưu ảnh vào bộ nhớ công khai.');
        }

        return $this->publicUrl($path);
    }

    public function publicUrl(string $path): string
    {
        if (filter_var($path, FILTER_VALIDATE_URL)) {
            return $path;
        }

        return url(Storage::disk('public')->url($path));
    }

    public function storagePath(string $location): ?string
    {
        if (! filter_var($location, FILTER_VALIDATE_URL)) {
            return ltrim(str_replace('\\', '/', $location), '/');
        }

        $locationPath = parse_url($location, PHP_URL_PATH);
        $diskPath = parse_url(Storage::disk('public')->url(''), PHP_URL_PATH);
        if (! is_string($locationPath) || ! is_string($diskPath)) {
            return null;
        }

        $prefix = rtrim($diskPath, '/').'/';
        if (! str_starts_with($locationPath, $prefix)) {
            return null;
        }

        return substr($locationPath, strlen($prefix));
    }

    public function delete(string $location): bool
    {
        $path = $this->storagePath($location);

        return $path !== null && Storage::disk('public')->delete($path);
    }

    private function cloudinaryConfigured(): bool
    {
        return filled(config('services.cloudinary.cloud_name'))
            && filled(config('services.cloudinary.api_key'))
            && filled(config('services.cloudinary.api_secret'));
    }

    private function uploadToCloudinary(UploadedFile $file, string $folder): string
    {
        $cloudName = (string) config('services.cloudinary.cloud_name');
        $timestamp = now()->timestamp;
        $signature = sha1("folder={$folder}&timestamp={$timestamp}".config('services.cloudinary.api_secret'));

        try {
            $response = Http::timeout(30)
                ->attach('file', $file->getContent(), $file->getClientOriginalName())
                ->post("https://api.cloudinary.com/v1_1/{$cloudName}/image/upload", [
                    'api_key' => config('services.cloudinary.api_key'),
                    'folder' => $folder,
                    'timestamp' => $timestamp,
                    'signature' => $signature,
                ]);
        } catch (ConnectionException $exception) {
            throw new HttpException(502, 'Cloudinary hiện không khả dụng.', $exception);
        }

        if (! $response->successful()) {
            throw new HttpException(502, 'Cloudinary không thể lưu ảnh (HTTP '.$response->status().').');
        }

        $secureUrl = $response->json('secure_url');
        if (! is_string($secureUrl) || ! str_starts_with($secureUrl, 'https://')) {
            throw new HttpException(502, 'Cloudinary không trả về secure_url HTTPS hợp lệ.');
        }

        return $secureUrl;
    }
}
