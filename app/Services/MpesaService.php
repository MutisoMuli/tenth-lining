<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class MpesaService
{
    protected string $consumerKey;
    protected string $consumerSecret;
    protected string $passkey;
    protected string $shortcode;
    protected string $callbackUrl;
    protected string $transactionType;
    protected string $baseUrl;

    public function __construct()
    {
        $this->consumerKey = config('services.mpesa.consumer_key', '');
        $this->consumerSecret = config('services.mpesa.consumer_secret', '');
        $this->passkey = config('services.mpesa.passkey', '');
        $this->shortcode = config('services.mpesa.shortcode', '4879341');
        $this->transactionType = config('services.mpesa.transaction_type', 'CustomerPayBillOnline');
        $this->callbackUrl = config('services.mpesa.callback_url', '');
        $env = strtolower(config('services.mpesa.environment', 'production'));
        $this->baseUrl = in_array($env, ['production', 'live'])
            ? 'https://api.safaricom.co.ke'
            : 'https://sandbox.safaricom.co.ke';
    }

    /**
     * Generate an OAuth access token from Safaricom Daraja API.
     */
    public function getAccessToken(): ?string
    {
        $url = "{$this->baseUrl}/oauth/v1/generate?grant_type=client_credentials";
        Log::info('[M-Pesa] OAuth token request initiated', [
            'url' => $url,
            'environment' => config('services.mpesa.environment'),
            'consumer_key_prefix' => substr($this->consumerKey, 0, 6) . '...',
        ]);

        $startTime = microtime(true);

        try {
            $response = Http::timeout(30)
                ->retry(2, 500, throw: false)
                ->withBasicAuth($this->consumerKey, $this->consumerSecret)
                ->get($url);

            $durationMs = round((microtime(true) - $startTime) * 1000, 2);

            if ($response->successful()) {
                Log::info('[M-Pesa] OAuth token generated successfully', [
                    'duration_ms' => $durationMs,
                    'status' => $response->status(),
                ]);
                return $response->json('access_token');
            }

            Log::error('[M-Pesa] OAuth token request failed', [
                'duration_ms' => $durationMs,
                'status' => $response->status(),
                'headers' => $response->headers(),
                'body' => $response->body(),
            ]);
            return null;
        } catch (\Throwable $e) {
            $durationMs = round((microtime(true) - $startTime) * 1000, 2);
            Log::error('[M-Pesa] OAuth token exception', [
                'duration_ms' => $durationMs,
                'error' => $e->getMessage(),
            ]);
            return null;
        }
    }

    /**
     * Initiate an STK Push (Lipa Na M-Pesa Online) request.
     */
    public function stkPush(string $phone, float $amount, string $accountReference, string $description = 'Tenth Lining'): ?array
    {
        $url = "{$this->baseUrl}/mpesa/stkpush/v1/processrequest";
        $token = $this->getAccessToken();

        if (!$token) {
            Log::error('[M-Pesa] STK Push aborted: OAuth token unavailable');
            return ['error' => 'Could not connect to Safaricom M-Pesa API (OAuth authentication failed or timed out). Check laravel.log for full details.'];
        }

        $timestamp = now()->format('YmdHis');
        $password = base64_encode($this->shortcode . $this->passkey . $timestamp);
        $phone = $this->formatPhoneNumber($phone);

        // Safaricom production API requires a valid public HTTPS CallBackURL (no localhost/127.0.0.1)
        $callbackUrl = $this->callbackUrl;
        if (empty($callbackUrl) || str_contains($callbackUrl, 'localhost') || str_contains($callbackUrl, '127.0.0.1')) {
            $host = request()->getHttpHost();
            if ($host && !str_contains($host, 'localhost') && !str_contains($host, '127.0.0.1')) {
                $scheme = request()->isSecure() ? 'https' : 'https';
                $callbackUrl = "{$scheme}://{$host}/api/mpesa/callback";
            } else {
                $callbackUrl = url('/api/mpesa/callback');
            }
        }

        $payload = [
            'BusinessShortCode' => $this->shortcode,
            'Password' => $password,
            'Timestamp' => $timestamp,
            'TransactionType' => $this->transactionType,
            'Amount' => (int) ceil($amount),
            'PartyA' => $phone,
            'PartyB' => $this->shortcode,
            'PhoneNumber' => $phone,
            'CallBackURL' => $callbackUrl,
            'AccountReference' => substr($accountReference, 0, 12),
            'TransactionDesc' => substr($description, 0, 12),
        ];

        Log::info('[M-Pesa] STK Push request payload prepared', [
            'url' => $url,
            'shortcode' => $this->shortcode,
            'transaction_type' => $this->transactionType,
            'phone' => $phone,
            'amount' => (int) ceil($amount),
            'callback_url' => $callbackUrl,
            'account_ref' => $payload['AccountReference'],
        ]);

        $startTime = microtime(true);

        try {
            $response = Http::timeout(30)
                ->retry(2, 500, throw: false)
                ->withToken($token)
                ->post($url, $payload);

            $durationMs = round((microtime(true) - $startTime) * 1000, 2);
            $data = $response->json() ?? [];

            if ($response->successful() && isset($data['CheckoutRequestID'])) {
                Log::info('[M-Pesa] STK Push initiated successfully', [
                    'duration_ms' => $durationMs,
                    'checkout_request_id' => $data['CheckoutRequestID'],
                    'merchant_request_id' => $data['MerchantRequestID'] ?? null,
                    'response' => $data,
                ]);
                return $data;
            }

            Log::error('[M-Pesa] STK Push request failed from Safaricom', [
                'duration_ms' => $durationMs,
                'status' => $response->status(),
                'error_code' => $data['errorCode'] ?? null,
                'error_message' => $data['errorMessage'] ?? $data['ResponseDescription'] ?? null,
                'data' => $data,
                'raw_body' => $response->body(),
            ]);

            $errorMsg = $data['errorMessage'] ?? $data['ResponseDescription'] ?? 'M-Pesa STK Push failed (' . ($data['errorCode'] ?? $response->status()) . ').';
            return ['error' => $errorMsg];
        } catch (\Throwable $e) {
            $durationMs = round((microtime(true) - $startTime) * 1000, 2);
            Log::error('[M-Pesa] STK Push exception', [
                'duration_ms' => $durationMs,
                'error' => $e->getMessage(),
            ]);

            if (str_contains($e->getMessage(), 'cURL error 28')) {
                return ['error' => 'Connection to Safaricom API timed out (cURL error 28 after 30s). If testing on localhost, outbound connection to api.safaricom.co.ke may be blocked by local ISP/firewall. Deploy to live server.'];
            }
            return ['error' => $e->getMessage()];
        }
    }

    /**
     * Query the status of an STK Push transaction.
     */
    public function stkQuery(string $checkoutRequestId): ?array
    {
        $token = $this->getAccessToken();
        if (!$token) {
            return null;
        }

        $timestamp = now()->format('YmdHis');
        $password = base64_encode($this->shortcode . $this->passkey . $timestamp);

        try {
            $response = Http::timeout(30)
                ->withToken($token)
                ->post("{$this->baseUrl}/mpesa/stkpushquery/v1/query", [
                    'BusinessShortCode' => $this->shortcode,
                    'Password' => $password,
                    'Timestamp' => $timestamp,
                    'CheckoutRequestID' => $checkoutRequestId,
                ]);

            Log::info('[M-Pesa] STK Query response', [
                'checkout_request_id' => $checkoutRequestId,
                'status' => $response->status(),
                'data' => $response->json(),
            ]);

            return $response->json();
        } catch (\Throwable $e) {
            Log::error('[M-Pesa] STK Query exception', ['error' => $e->getMessage()]);
            return null;
        }
    }

    /**
     * Format phone number to 254XXXXXXXXX format.
     */
    protected function formatPhoneNumber(string $phone): string
    {
        $phone = preg_replace('/[^0-9]/', '', $phone);

        if (str_starts_with($phone, '0')) {
            $phone = '254' . substr($phone, 1);
        } elseif (str_starts_with($phone, '+254')) {
            $phone = substr($phone, 1);
        }

        return $phone;
    }
}
