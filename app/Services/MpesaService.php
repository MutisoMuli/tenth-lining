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
    protected string $storeNumber;
    protected string $callbackUrl;
    protected string $transactionType;
    protected string $environment;
    protected string $baseUrl;

    public function __construct()
    {
        $this->consumerKey = config('services.mpesa.consumer_key', '');
        $this->consumerSecret = config('services.mpesa.consumer_secret', '');
        $this->passkey = config('services.mpesa.passkey', '');
        $this->shortcode = config('services.mpesa.shortcode', '4879341');
        $this->storeNumber = config('services.mpesa.store_number', '');
        $this->transactionType = config('services.mpesa.transaction_type', 'CustomerBuyGoodsOnline');
        $this->callbackUrl = config('services.mpesa.callback_url', '');
        $this->environment = strtolower(config('services.mpesa.environment', 'live'));
        $this->baseUrl = in_array($this->environment, ['production', 'live'])
            ? 'https://api.safaricom.co.ke'
            : 'https://sandbox.safaricom.co.ke';

        Log::info('[M-Pesa] Service initialized', [
            'environment' => $this->environment,
            'shortcode' => $this->shortcode,
            'store_number' => $this->storeNumber,
            'transaction_type' => $this->transactionType,
        ]);
    }

    /**
     * Generate an OAuth access token from Safaricom Daraja API.
     */
    public function getAccessToken(): ?string
    {
        $url = "{$this->baseUrl}/oauth/v1/generate?grant_type=client_credentials";

        try {
            $response = Http::timeout(30)
                ->withOptions(['verify' => false])
                ->withBasicAuth($this->consumerKey, $this->consumerSecret)
                ->get($url);

            if ($response->successful()) {
                Log::info('[M-Pesa] Access token generated', ['status' => $response->status()]);
                return $response->json('access_token');
            }

            Log::error('[M-Pesa] Access token error', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);
            return null;
        } catch (\Throwable $e) {
            Log::error('[M-Pesa] Access token exception', ['error' => $e->getMessage()]);
            return null;
        }
    }

    /**
     * Initiate an STK Push (Lipa Na M-Pesa Online) request.
     */
    public function stkPush(string $phone, float $amount, string $accountReference, string $description = 'Tenth Lining'): ?array
    {
        $accessToken = $this->getAccessToken();

        if (!$accessToken) {
            return ['error' => 'Failed to authenticate with M-Pesa. Please try again.'];
        }

        $phone = $this->formatPhoneNumber($phone);
        $timestamp = now()->format('YmdHis');

        // Password MUST be generated using the BusinessShortCode (HO number)
        $businessShortCode = $this->shortcode;
        $password = base64_encode($businessShortCode . $this->passkey . $timestamp);

        // Determine PartyB based on transaction type
        // For Till (Buy Goods): PartyB = Store/Till Number
        // For Paybill: PartyB = BusinessShortCode (same as HO)
        $partyB = $businessShortCode;
        if ($this->transactionType === 'CustomerBuyGoodsOnline' && !empty($this->storeNumber)) {
            $partyB = $this->storeNumber;
            Log::info('[M-Pesa] Using distinct PartyB for Till STK Push', [
                'ho_shortcode' => $businessShortCode,
                'till_party_b' => $partyB,
            ]);
        }

        // Resolve callback URL - Safaricom rejects localhost/127.0.0.1
        $callbackUrl = $this->callbackUrl;
        if (empty($callbackUrl) || str_contains($callbackUrl, 'localhost') || str_contains($callbackUrl, '127.0.0.1')) {
            $host = request()->getHttpHost();
            if ($host && !str_contains($host, 'localhost') && !str_contains($host, '127.0.0.1')) {
                $callbackUrl = "https://{$host}/api/mpesa/callback";
            } else {
                $callbackUrl = url('/api/mpesa/callback');
            }
        }

        // In sandbox, always use CustomerPayBillOnline regardless of config
        $transactionType = $this->environment === 'sandbox'
            ? 'CustomerPayBillOnline'
            : $this->transactionType;

        $url = "{$this->baseUrl}/mpesa/stkpush/v1/processrequest";

        $payload = [
            'BusinessShortCode' => $businessShortCode,
            'Password' => $password,
            'Timestamp' => $timestamp,
            'TransactionType' => $transactionType,
            'Amount' => (int) ceil($amount),
            'PartyA' => $phone,
            'PartyB' => $partyB,
            'PhoneNumber' => $phone,
            'CallBackURL' => $callbackUrl,
            'AccountReference' => substr($accountReference, 0, 12),
            'TransactionDesc' => substr($description, 0, 12),
        ];

        Log::info('[M-Pesa] STK Push request', [
            'url' => $url,
            'shortcode' => $businessShortCode,
            'store_number' => $this->storeNumber,
            'party_b' => $partyB,
            'transaction_type' => $transactionType,
            'phone' => $phone,
            'amount' => (int) ceil($amount),
            'callback_url' => $callbackUrl,
            'account_ref' => $payload['AccountReference'],
        ]);

        try {
            $response = Http::timeout(30)
                ->withOptions(['verify' => false])
                ->withToken($accessToken)
                ->post($url, $payload);

            $result = $response->json() ?? [];

            Log::info('[M-Pesa] STK Push response', [
                'status' => $response->status(),
                'response' => $result,
            ]);

            if (isset($result['ResponseCode']) && $result['ResponseCode'] == '0') {
                return $result;
            }

            $errorMsg = $result['errorMessage'] ?? $result['ResponseDescription'] ?? 'M-Pesa STK Push failed (' . ($result['errorCode'] ?? $response->status()) . ').';
            return ['error' => $errorMsg];
        } catch (\Throwable $e) {
            Log::error('[M-Pesa] STK Push exception', ['error' => $e->getMessage()]);
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

        $url = "{$this->baseUrl}/mpesa/stkpushquery/v1/query";

        try {
            $response = Http::timeout(30)
                ->withOptions(['verify' => false])
                ->withToken($token)
                ->post($url, [
                    'BusinessShortCode' => $this->shortcode,
                    'Password' => $password,
                    'Timestamp' => $timestamp,
                    'CheckoutRequestID' => $checkoutRequestId,
                ]);

            $result = $response->json();

            Log::info('[M-Pesa] STK Query result', [
                'checkout_request_id' => $checkoutRequestId,
                'response' => $result,
            ]);

            return $result;
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
        // Strip spaces, dashes, parentheses
        $phone = preg_replace('/[\s\-\(\)]/', '', $phone);
        $phone = preg_replace('/[^0-9+]/', '', $phone);

        if (str_starts_with($phone, '+254')) {
            $phone = substr($phone, 1);
        } elseif (str_starts_with($phone, '0')) {
            $phone = '254' . substr($phone, 1);
        }

        return $phone;
    }
}
