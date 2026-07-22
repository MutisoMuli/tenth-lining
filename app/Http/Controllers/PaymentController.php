<?php

namespace App\Http\Controllers;

use App\Models\Document;
use App\Models\Payment;
use App\Models\Receipt;
use App\Services\MpesaService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class PaymentController extends Controller
{
    /**
     * Initiate M-Pesa STK Push payment for a document.
     */
    public function initiate(Request $request, MpesaService $mpesa)
    {
        $request->validate([
            'document_id' => 'required|exists:documents,id',
            'phone' => 'required|string|min:10',
        ]);

        $document = Document::findOrFail($request->document_id);
        $isTenthLining = ($document->tool_type === 'tenth-lining') || 
                         (empty($document->tool_type) && !empty($document->tenth_line_settings));
        $pricePerPage = $isTenthLining ? 3 : 1;
        $amount = $document->page_count * $pricePerPage;

        $response = $mpesa->stkPush(
            $request->phone,
            $amount,
            'TL-' . substr($document->id, 0, 8),
            'Tenth Lining - ' . $document->page_count . ' pages'
        );

        if (!$response || isset($response['error']) || !isset($response['CheckoutRequestID'])) {
            $error = $response['error'] ?? $response['errorMessage'] ?? 'Failed to initiate M-Pesa payment.';
            return response()->json([
                'success' => false,
                'message' => $error,
            ], 400);
        }

        // Create payment record
        $payment = Payment::create([
            'document_id' => $document->id,
            'user_id' => auth()->id(),
            'checkout_request_id' => $response['CheckoutRequestID'],
            'merchant_request_id' => $response['MerchantRequestID'],
            'phone_number' => $request->phone,
            'amount' => $amount,
            'status' => 'pending',
        ]);

        return response()->json([
            'success' => true,
            'checkout_request_id' => $response['CheckoutRequestID'],
            'amount' => $amount,
            'pages' => $document->page_count,
            'message' => 'STK Push sent. Please check your phone.',
        ]);
    }

    /**
     * Handle M-Pesa callback from Safaricom.
     */
    public function callback(Request $request)
    {
        $data = $request->all();
        \Illuminate\Support\Facades\Log::info('[M-Pesa Callback Received]', ['payload' => $data]);

        $body = $data['Body']['stkCallback'] ?? null;
        if (!$body) {
            \Illuminate\Support\Facades\Log::warning('[M-Pesa Callback] Invalid payload structure missing stkCallback', ['data' => $data]);
            return response()->json(['ResultCode' => 1, 'ResultDesc' => 'Invalid callback data']);
        }

        $checkoutRequestId = $body['CheckoutRequestID'] ?? '';
        $resultCode = $body['ResultCode'] ?? 1;
        $resultDesc = $body['ResultDesc'] ?? 'Unknown';

        $payment = Payment::where('checkout_request_id', $checkoutRequestId)->first();
        if (!$payment) {
            \Illuminate\Support\Facades\Log::warning('[M-Pesa Callback] Payment record not found for CheckoutRequestID', ['checkout_request_id' => $checkoutRequestId]);
            return response()->json(['ResultCode' => 0, 'ResultDesc' => 'Accepted']);
        }

        if ($resultCode == 0) {
            // Successful payment
            $metadata = collect($body['CallbackMetadata']['Item'] ?? []);
            $mpesaReceiptNumber = $metadata->firstWhere('Name', 'MpesaReceiptNumber')['Value'] ?? null;

            $payment->update([
                'status' => 'completed',
                'mpesa_receipt_number' => $mpesaReceiptNumber,
                'result_desc' => $resultDesc,
                'paid_at' => now(),
            ]);

            // Mark document as paid
            $payment->document->update(['payment_status' => 'paid']);

            // Create receipt
            Receipt::create([
                'payment_id' => $payment->id,
                'receipt_number' => 'TL-' . strtoupper(Str::random(8)),
                'download_token' => Str::uuid()->toString(),
            ]);

            \Illuminate\Support\Facades\Log::info('[M-Pesa Payment Completed]', [
                'payment_id' => $payment->id,
                'mpesa_receipt' => $mpesaReceiptNumber,
                'document_id' => $payment->document_id,
            ]);
        } else {
            // Failed payment
            $payment->update([
                'status' => 'failed',
                'result_desc' => $resultDesc,
            ]);

            \Illuminate\Support\Facades\Log::warning('[M-Pesa Payment Failed User Callback]', [
                'payment_id' => $payment->id,
                'result_code' => $resultCode,
                'result_desc' => $resultDesc,
            ]);
        }

        return response()->json(['ResultCode' => 0, 'ResultDesc' => 'Accepted']);
    }

    /**
     * Poll payment status from the frontend with real-time M-Pesa Daraja STK query.
     */
    public function status(string $checkoutRequestId, MpesaService $mpesa)
    {
        $payment = Payment::where('checkout_request_id', $checkoutRequestId)->first();

        if (!$payment) {
            return response()->json(['status' => 'not_found'], 404);
        }

        // If status is still pending in DB, query Safaricom Daraja STK Push Query API directly
        if ($payment->status === 'pending') {
            try {
                $queryResult = $mpesa->stkQuery($checkoutRequestId);

                if ($queryResult) {
                    $resultCode = isset($queryResult['ResultCode']) ? (string)$queryResult['ResultCode'] : null;
                    $resultDesc = $queryResult['ResultDesc'] ?? $queryResult['ResponseDescription'] ?? '';

                    if ($resultCode === '0') {
                        // Payment successfully completed at Safaricom!
                        $mpesaReceiptNumber = $queryResult['MpesaReceiptNumber'] ?? $payment->mpesa_receipt_number;
                        if (empty($mpesaReceiptNumber)) {
                            $mpesaReceiptNumber = 'MP' . strtoupper(Str::random(8));
                        }

                        $payment->update([
                            'status' => 'completed',
                            'mpesa_receipt_number' => $mpesaReceiptNumber,
                            'result_desc' => $resultDesc ?: 'Completed',
                            'paid_at' => now(),
                        ]);

                        if ($payment->document) {
                            $payment->document->update(['payment_status' => 'paid']);
                        }

                        if (!$payment->receipt) {
                            Receipt::create([
                                'payment_id' => $payment->id,
                                'receipt_number' => 'TL-' . strtoupper(Str::random(8)),
                                'download_token' => Str::uuid()->toString(),
                            ]);
                        }

                        \Illuminate\Support\Facades\Log::info('[M-Pesa Status Check] Payment verified as COMPLETED via STK Query', [
                            'checkout_request_id' => $checkoutRequestId,
                            'payment_id' => $payment->id,
                        ]);
                    } elseif ($resultCode !== null && $resultCode !== '') {
                        // Non-zero result code returned from Safaricom (e.g. 1032 cancelled, 1037 timeout, 1 insufficient balance, 2001 wrong PIN)
                        $payment->update([
                            'status' => 'failed',
                            'result_desc' => $resultDesc ?: 'Transaction failed or cancelled.',
                        ]);

                        \Illuminate\Support\Facades\Log::warning('[M-Pesa Status Check] Payment FAILED/CANCELLED via STK Query', [
                            'checkout_request_id' => $checkoutRequestId,
                            'result_code' => $resultCode,
                            'result_desc' => $resultDesc,
                        ]);
                    }
                }
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::error('[M-Pesa Status Check STK Query Exception]', ['error' => $e->getMessage()]);
            }
        }

        return response()->json([
            'status' => $payment->status,
            'mpesa_receipt' => $payment->mpesa_receipt_number,
            'paid_at' => $payment->paid_at?->toISOString(),
            'result_desc' => $payment->result_desc,
        ]);
    }

    /**
     * Manually confirm / verify payment with Safaricom Daraja API.
     */
    public function verify(string $checkoutRequestId, MpesaService $mpesa)
    {
        $payment = Payment::where('checkout_request_id', $checkoutRequestId)->first();

        if (!$payment) {
            return response()->json(['success' => false, 'message' => 'Payment session not found.'], 404);
        }

        if ($payment->status === 'completed') {
            return response()->json([
                'success' => true,
                'status' => 'completed',
                'mpesa_receipt' => $payment->mpesa_receipt_number,
            ]);
        }

        // Query Safaricom Daraja STK Query API before marking as paid
        try {
            $queryResult = $mpesa->stkQuery($checkoutRequestId);

            if ($queryResult) {
                $resultCode = isset($queryResult['ResultCode']) ? (string)$queryResult['ResultCode'] : null;
                $resultDesc = $queryResult['ResultDesc'] ?? $queryResult['ResponseDescription'] ?? '';

                if ($resultCode === '0') {
                    // Actual successful payment confirmed by Safaricom
                    $mpesaReceiptNumber = $queryResult['MpesaReceiptNumber'] ?? $payment->mpesa_receipt_number;
                    if (empty($mpesaReceiptNumber)) {
                        $mpesaReceiptNumber = 'MP' . strtoupper(Str::random(8));
                    }

                    $payment->update([
                        'status' => 'completed',
                        'mpesa_receipt_number' => $mpesaReceiptNumber,
                        'result_desc' => $resultDesc ?: 'Verified via STK Query',
                        'paid_at' => now(),
                    ]);

                    if ($payment->document) {
                        $payment->document->update(['payment_status' => 'paid']);
                    }

                    if (!$payment->receipt) {
                        Receipt::create([
                            'payment_id' => $payment->id,
                            'receipt_number' => 'TL-' . strtoupper(Str::random(8)),
                            'download_token' => Str::uuid()->toString(),
                        ]);
                    }

                    return response()->json([
                        'success' => true,
                        'status' => 'completed',
                        'mpesa_receipt' => $payment->mpesa_receipt_number,
                    ]);
                } else if ($resultCode !== null && $resultCode !== '') {
                    // STK Push failed or was cancelled by user
                    $payment->update([
                        'status' => 'failed',
                        'result_desc' => $resultDesc ?: 'Transaction cancelled or failed.',
                    ]);

                    return response()->json([
                        'success' => false,
                        'status' => 'failed',
                        'message' => $resultDesc ?: 'Payment was cancelled or failed on M-Pesa. Please try initiating STK push again.',
                    ], 400);
                }
            }
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('[M-Pesa Verify Exception]', ['error' => $e->getMessage()]);
        }

        return response()->json([
            'success' => false,
            'status' => $payment->status,
            'message' => 'Payment has not been confirmed by M-Pesa yet. Please ensure you enter your M-Pesa PIN on your phone.',
        ], 400);
    }
}
