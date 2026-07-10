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
        $pricePerPage = 3; // KES 3 per page
        $amount = $document->page_count * $pricePerPage;

        $response = $mpesa->stkPush(
            $request->phone,
            $amount,
            'TL-' . substr($document->id, 0, 8),
            'Tenth Lining - ' . $document->page_count . ' pages'
        );

        if (!$response || !isset($response['CheckoutRequestID'])) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to initiate payment. Please try again.',
            ], 500);
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

        $body = $data['Body']['stkCallback'] ?? null;
        if (!$body) {
            return response()->json(['ResultCode' => 1, 'ResultDesc' => 'Invalid callback data']);
        }

        $checkoutRequestId = $body['CheckoutRequestID'] ?? '';
        $resultCode = $body['ResultCode'] ?? 1;
        $resultDesc = $body['ResultDesc'] ?? 'Unknown';

        $payment = Payment::where('checkout_request_id', $checkoutRequestId)->first();
        if (!$payment) {
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
        } else {
            // Failed payment
            $payment->update([
                'status' => 'failed',
                'result_desc' => $resultDesc,
            ]);
        }

        return response()->json(['ResultCode' => 0, 'ResultDesc' => 'Accepted']);
    }

    /**
     * Poll payment status from the frontend.
     */
    public function status(string $checkoutRequestId)
    {
        $payment = Payment::where('checkout_request_id', $checkoutRequestId)->first();

        if (!$payment) {
            return response()->json(['status' => 'not_found'], 404);
        }

        return response()->json([
            'status' => $payment->status,
            'mpesa_receipt' => $payment->mpesa_receipt_number,
            'paid_at' => $payment->paid_at?->toISOString(),
        ]);
    }
}
