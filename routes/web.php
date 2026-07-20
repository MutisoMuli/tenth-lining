<?php

use App\Http\Controllers\DocumentController;
use App\Http\Controllers\PaymentController;
use App\Models\Document;
use Illuminate\Support\Facades\Route;

// ─── API Routes (JSON responses) ───────────────────────
// These must be defined BEFORE the SPA catch-all

// CSRF token endpoint for SPA
Route::get('/api/csrf-token', function () {
    return response()->json(['token' => csrf_token()]);
})->name('api.csrf');

// Document history API (returns recent documents)
Route::get('/api/documents/history', function () {
    $documents = Document::latest()->limit(50)->get(['id', 'original_name', 'page_count', 'file_size', 'status', 'payment_status', 'created_at']);
    return response()->json(['documents' => $documents]);
})->name('api.documents.history');

// File upload (returns JSON with document ID)
Route::post('/upload', [DocumentController::class, 'upload'])->name('document.upload');

// PDF preview (serves file)
Route::get('/preview/{id}', [DocumentController::class, 'preview'])->name('document.preview');

// Document settings save
Route::post('/document/{id}/settings', [DocumentController::class, 'saveSettings'])->name('document.settings');

// Document export (after payment)
Route::post('/document/{id}/export', [DocumentController::class, 'export'])->name('document.export');

// Document download (serves file)
Route::get('/document/{id}/download', [DocumentController::class, 'download'])->name('document.download');

// Document metadata API (returns JSON for editor)
Route::get('/api/document/{id}', function (string $id) {
    $document = Document::findOrFail($id);
    return response()->json([
        'id' => $document->id,
        'original_name' => $document->original_name,
        'page_count' => $document->page_count,
        'file_size' => $document->file_size,
        'status' => $document->status,
        'payment_status' => $document->payment_status,
        'page_number_settings' => $document->page_number_settings ?? [],
        'tenth_line_settings' => $document->tenth_line_settings ?? [],
        'preview_url' => route('document.preview', $document->id),
        'cost' => $document->page_count * 3,
    ]);
})->name('api.document');

// Document delete API
Route::delete('/api/document/{id}', function (string $id) {
    $document = Document::find($id);
    if ($document) {
        if ($document->original_path && \Illuminate\Support\Facades\Storage::disk('public')->exists($document->original_path)) {
            \Illuminate\Support\Facades\Storage::disk('public')->delete($document->original_path);
        }
        if ($document->formatted_path && \Illuminate\Support\Facades\Storage::disk('public')->exists($document->formatted_path)) {
            \Illuminate\Support\Facades\Storage::disk('public')->delete($document->formatted_path);
        }
        $document->delete();
    }
    return response()->json(['success' => true]);
})->name('api.document.delete');

// Payment routes
Route::post('/payment/initiate', [PaymentController::class, 'initiate'])->name('payment.initiate');
Route::get('/payment/status/{checkoutRequestId}', [PaymentController::class, 'status'])->name('payment.status');

// M-Pesa callback (no CSRF)
Route::post('/api/mpesa/callback', [PaymentController::class, 'callback'])->name('mpesa.callback')->withoutMiddleware(['web']);

// ─── SPA Catch-All (must be LAST) ─────────────────────
// Serves the SPA shell for all page navigation
Route::get('/{any?}', function () {
    return view('spa');
})->where('any', '.*')->name('spa');

