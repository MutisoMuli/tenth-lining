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
        $this->baseUrl = config('services.mpesa.environment') === 'production'
            ? 'https://api.safaricom.co.ke'
            : 'https://sandbox.safaricom.co.ke';
    }

    /**
     * Generate an OAuth access token from Safaricom Daraja API.
     */
    public function getAccessToken(): ?string
    {
        try {
            $response = Http::withBasicAuth($this->consumerKey, $this->consumerSecret)
                ->get("{$this->baseUrl}/oauth/v1/generate?grant_type=client_credentials");

            if ($response->successful()) {
                return $response->json('access_token');
            }

            Log::error('M-Pesa OAuth failed', ['response' => $response->body(), 'status' => $response->status()]);
            return null;
        } catch (\Throwable $e) {
            Log::error('M-Pesa OAuth exception', ['error' => $e->getMessage()]);
            return null;
        }
    }

    /**
     * Initiate an STK Push (Lipa Na M-Pesa Online) request.
     */
    public function stkPush(string $phone, float $amount, string $accountReference, string $description = 'Tenth Lining'): ?array
    {
        $token = $this->getAccessToken();
        if (!$token) {
            return ['error' => 'Authentication with M-Pesa failed. Please check API credentials.'];
        }

        $timestamp = now()->format('YmdHis');
        $password = base64_encode($this->shortcode . $this->passkey . $timestamp);

        // Normalize phone number to 254...
        $phone = $this->formatPhoneNumber($phone);

        try {
            $response = Http::withToken($token)
                ->post("{$this->baseUrl}/mpesa/stkpush/v1/processrequest", [
                    'BusinessShortCode' => $this->shortcode,
                    'Password' => $password,
                    'Timestamp' => $timestamp,
                    'TransactionType' => $this->transactionType,
                    'Amount' => (int) ceil($amount),
                    'PartyA' => $phone,
                    'PartyB' => $this->shortcode,
                    'PhoneNumber' => $phone,
                    'CallBackURL' => $this->callbackUrl ?: url('/api/mpesa/callback'),
                    'AccountReference' => substr($accountReference, 0, 12),
                    'TransactionDesc' => substr($description, 0, 12),
                ]);

            $data = $response->json() ?? [];

            if ($response->successful() && isset($data['CheckoutRequestID'])) {
                return $data;
            }

            Log::error('M-Pesa STK Push failed', ['response' => $data, 'body' => $response->body()]);
            $errorMsg = $data['errorMessage'] ?? $data['ResponseDescription'] ?? 'M-Pesa STK Push failed.';
            return ['error' => $errorMsg];
        } catch (\Throwable $e) {
            Log::error('M-Pesa STK Push exception', ['error' => $e->getMessage()]);
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
            $response = Http::withToken($token)
                ->post("{$this->baseUrl}/mpesa/stkpushquery/v1/query", [
                    'BusinessShortCode' => $this->shortcode,
                    'Password' => $password,
                    'Timestamp' => $timestamp,
                    'CheckoutRequestID' => $checkoutRequestId,
                ]);

            return $response->json();
        } catch (\Throwable $e) {
            Log::error('M-Pesa STK Query exception', ['error' => $e->getMessage()]);
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
