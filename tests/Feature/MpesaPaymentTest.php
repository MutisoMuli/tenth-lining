<?php

namespace Tests\Feature;

use App\Models\Document;
use App\Models\Payment;
use App\Services\MpesaService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MpesaPaymentTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Test initiating M-Pesa payment.
     */
    public function test_initiates_mpesa_payment_successfully()
    {
        $document = Document::create([
            'id' => \Illuminate\Support\Str::uuid()->toString(),
            'original_name' => 'test.pdf',
            'original_path' => 'documents/originals/test.pdf',
            'page_count' => 10,
            'file_size' => 1024,
            'status' => 'pending',
            'payment_status' => 'unpaid',
        ]);

        // Mock the MpesaService to simulate a successful STK response
        $this->mock(MpesaService::class, function ($mock) use ($document) {
            $mock->shouldReceive('stkPush')
                ->once()
                ->with('0712345678', 30.0, 'TL-' . substr($document->id, 0, 8), 'Tenth Lining - 10 pages')
                ->andReturn([
                    'CheckoutRequestID' => 'ws_CO_123456789',
                    'MerchantRequestID' => '123-456-789',
                    'ResponseCode' => '0',
                    'CustomerMessage' => 'Success'
                ]);
        });

        $response = $this->postJson(route('payment.initiate'), [
            'document_id' => $document->id,
            'phone' => '0712345678',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'checkout_request_id' => 'ws_CO_123456789',
                'amount' => 30.0,
                'pages' => 10
            ]);

        $this->assertDatabaseHas('payments', [
            'document_id' => $document->id,
            'checkout_request_id' => 'ws_CO_123456789',
            'status' => 'pending',
            'amount' => 30.0
        ]);
    }

    /**
     * Test successful webhook callback.
     */
    public function test_handles_successful_mpesa_callback()
    {
        $document = Document::create([
            'id' => \Illuminate\Support\Str::uuid()->toString(),
            'original_name' => 'test.pdf',
            'original_path' => 'documents/originals/test.pdf',
            'page_count' => 5,
            'file_size' => 1024,
            'status' => 'pending',
            'payment_status' => 'unpaid',
        ]);

        $payment = Payment::create([
            'id' => \Illuminate\Support\Str::uuid()->toString(),
            'document_id' => $document->id,
            'checkout_request_id' => 'ws_CO_123456789',
            'merchant_request_id' => '123-456-789',
            'phone_number' => '254712345678',
            'amount' => 15.0,
            'status' => 'pending',
        ]);

        // Simulating the standard M-Pesa STK Callback JSON payload
        $callbackPayload = [
            'Body' => [
                'stkCallback' => [
                    'MerchantRequestID' => '123-456-789',
                    'CheckoutRequestID' => 'ws_CO_123456789',
                    'ResultCode' => 0,
                    'ResultDesc' => 'The service request is processed successfully.',
                    'CallbackMetadata' => [
                        'Item' => [
                            ['Name' => 'Amount', 'Value' => 15.0],
                            ['Name' => 'MpesaReceiptNumber', 'Value' => 'QG12345678'],
                            ['Name' => 'TransactionDate', 'Value' => 20260710100000],
                            ['Name' => 'PhoneNumber', 'Value' => 254712345678]
                        ]
                    ]
                ]
            ]
        ];

        $response = $this->postJson(route('mpesa.callback'), $callbackPayload);

        $response->assertStatus(200)
            ->assertJson([
                'ResultCode' => 0,
                'ResultDesc' => 'Accepted'
            ]);

        // Assert payment updated to completed
        $this->assertDatabaseHas('payments', [
            'id' => $payment->id,
            'status' => 'completed',
            'mpesa_receipt_number' => 'QG12345678'
        ]);

        // Assert document updated to paid
        $this->assertDatabaseHas('documents', [
            'id' => $document->id,
            'payment_status' => 'paid'
        ]);

        // Assert receipt created
        $this->assertDatabaseHas('receipts', [
            'payment_id' => $payment->id
        ]);
    }
}
