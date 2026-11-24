<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use JsonException;

class JwtTokenService
{
    public function issue(User $user): string
    {
        $now = now()->timestamp;
        $claims = [
            'iss' => config('jwt.issuer'),
            'sub' => (string) $user->getKey(),
            'iat' => $now,
            'exp' => $now + (int) config('jwt.ttl', 3600),
            'jti' => (string) Str::uuid(),
        ];

        $header = $this->encode(json_encode([
            'typ' => 'JWT',
            'alg' => 'HS256',
        ], JSON_THROW_ON_ERROR));
        $payload = $this->encode(json_encode($claims, JSON_THROW_ON_ERROR));
        $unsignedToken = $header.'.'.$payload;
        $token = $unsignedToken.'.'.$this->encode(hash_hmac('sha256', $unsignedToken, $this->secret(), true));

        DB::table('personal_access_tokens')->insert([
            'tokenable_type' => $user->getMorphClass(),
            'tokenable_id' => $user->getKey(),
            'name' => 'web-access',
            'token' => hash('sha256', $token),
            'abilities' => json_encode(['*'], JSON_THROW_ON_ERROR),
            'expires_at' => now()->addSeconds((int) config('jwt.ttl', 3600)),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return $token;
    }

    public function authenticate(string $token): ?User
    {
        if (strlen($token) > 8192) {
            return null;
        }

        $parts = explode('.', $token);

        if (count($parts) !== 3) {
            return null;
        }

        [$encodedHeader, $encodedPayload, $encodedSignature] = $parts;
        $headerJson = $this->decode($encodedHeader);
        $payloadJson = $this->decode($encodedPayload);
        $signature = $this->decode($encodedSignature);

        if ($headerJson === null || $payloadJson === null || $signature === null) {
            return null;
        }

        try {
            $header = json_decode($headerJson, true, 512, JSON_THROW_ON_ERROR);
            $claims = json_decode($payloadJson, true, 512, JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            return null;
        }

        if (! is_array($header) || ($header['typ'] ?? null) !== 'JWT' || ($header['alg'] ?? null) !== 'HS256') {
            return null;
        }

        $expectedSignature = hash_hmac('sha256', $encodedHeader.'.'.$encodedPayload, $this->secret(), true);

        if (! hash_equals($expectedSignature, $signature)) {
            return null;
        }

        if (! is_array($claims)
            || ($claims['iss'] ?? null) !== config('jwt.issuer')
            || ! isset($claims['sub'], $claims['exp'], $claims['jti'])
            || ! is_string($claims['sub'])
            || ! ctype_digit($claims['sub'])
            || ! is_int($claims['iat'] ?? null)
            || $claims['iat'] > now()->timestamp
            || ! is_int($claims['exp'])
            || $claims['exp'] <= now()->timestamp
            || $claims['exp'] > $claims['iat'] + (int) config('jwt.ttl', 3600)
            || ! is_string($claims['jti'])
            || $claims['jti'] === '') {
            return null;
        }

        $tokenHash = hash('sha256', $token);
        $tokenRecord = DB::table('personal_access_tokens')
            ->where('token', $tokenHash)
            ->where('tokenable_type', (new User)->getMorphClass())
            ->where('tokenable_id', (int) $claims['sub'])
            ->where('expires_at', '>', now())
            ->first();

        return $tokenRecord ? User::query()->find((int) $claims['sub']) : null;
    }

    public function revoke(string $token): void
    {
        DB::table('personal_access_tokens')
            ->where('token', hash('sha256', $token))
            ->delete();
    }

    private function encode(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }

    private function decode(string $value): ?string
    {
        if ($value === '' || preg_match('/^[A-Za-z0-9_-]+$/D', $value) !== 1) {
            return null;
        }

        $decoded = base64_decode(strtr($value, '-_', '+/').str_repeat('=', (4 - strlen($value) % 4) % 4), true);

        return $decoded === false ? null : $decoded;
    }

    private function secret(): string
    {
        $secret = (string) config('jwt.secret');

        if (str_starts_with($secret, 'base64:')) {
            $decoded = base64_decode(substr($secret, 7), true);
            $secret = $decoded === false ? '' : $decoded;
        }

        if (strlen($secret) < 32) {
            throw new \LogicException('JWT_SECRET or APP_KEY must provide at least 32 bytes of signing key material.');
        }

        return $secret;
    }
}
