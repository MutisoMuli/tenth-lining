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

// Merge PDF Tool Routes
Route::post('/api/tool/merge/upload', [\App\Http\Controllers\MergePdfController::class, 'upload'])->name('api.merge.upload');
Route::post('/api/tool/merge/process/{id}', [\App\Http\Controllers\MergePdfController::class, 'process'])->name('api.merge.process');

// Split PDF Tool Routes
Route::post('/api/tool/split/upload', [\App\Http\Controllers\SplitPdfController::class, 'upload'])->name('api.split.upload');
Route::post('/api/tool/split/process/{id}', [\App\Http\Controllers\SplitPdfController::class, 'process'])->name('api.split.process');

// Compress PDF Tool Routes
Route::post('/api/tool/compress/upload', [\App\Http\Controllers\CompressPdfController::class, 'upload'])->name('api.compress.upload');
Route::post('/api/tool/compress/process/{id}', [\App\Http\Controllers\CompressPdfController::class, 'process'])->name('api.compress.process');

// Convert PDF Tool Routes
Route::post('/api/tool/convert/upload', [\App\Http\Controllers\ConvertPdfController::class, 'upload'])->name('api.convert.upload');
Route::post('/api/tool/convert/process/{id}', [\App\Http\Controllers\ConvertPdfController::class, 'process'])->name('api.convert.process');

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
    $isTenthLining = ($document->tool_type === 'tenth-lining') || 
                     (empty($document->tool_type) && !empty($document->tenth_line_settings));
    $pricePerPage = $isTenthLining ? 3 : 1;

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
        'tool_type' => $document->tool_type ?? 'tenth-lining',
        'rate' => $pricePerPage,
        'cost' => $document->page_count * $pricePerPage,
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

// Tool APIs (Merge, Split, Compress, Convert, Organize)
Route::post('/api/tool/merge/upload', [\App\Http\Controllers\MergePdfController::class, 'upload']);
Route::post('/api/tool/merge/process/{id}', [\App\Http\Controllers\MergePdfController::class, 'process']);
Route::post('/api/tool/split/upload', [\App\Http\Controllers\SplitPdfController::class, 'upload']);
Route::post('/api/tool/split/process/{id}', [\App\Http\Controllers\SplitPdfController::class, 'process']);
Route::post('/api/tool/compress/upload', [\App\Http\Controllers\CompressPdfController::class, 'upload']);
Route::post('/api/tool/compress/process/{id}', [\App\Http\Controllers\CompressPdfController::class, 'process']);
Route::post('/api/tool/convert/upload', [\App\Http\Controllers\ConvertPdfController::class, 'upload']);
Route::post('/api/tool/convert/process/{id}', [\App\Http\Controllers\ConvertPdfController::class, 'process']);
Route::post('/api/tool/organize/upload', [\App\Http\Controllers\OrganizePdfController::class, 'upload']);
Route::post('/api/tool/organize/process/{id}', [\App\Http\Controllers\OrganizePdfController::class, 'process']);

// ─── SPA Catch-All (must be LAST) ─────────────────────
// Serves the SPA shell for all page navigation
Route::get('/{any?}', function () {
    return view('spa');
})->where('any', '.*')->name('spa');

