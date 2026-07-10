<?php

use App\Http\Controllers\DocumentController;
use App\Http\Controllers\PaymentController;
use Illuminate\Support\Facades\Route;

// Landing page
Route::get('/', [DocumentController::class, 'index'])->name('home');

// Document routes
Route::post('/upload', [DocumentController::class, 'upload'])->name('document.upload');
Route::get('/editor/{id}', [DocumentController::class, 'editor'])->name('editor');
Route::get('/preview/{id}', [DocumentController::class, 'preview'])->name('document.preview');
Route::post('/document/{id}/settings', [DocumentController::class, 'saveSettings'])->name('document.settings');
Route::post('/document/{id}/export', [DocumentController::class, 'export'])->name('document.export');
Route::get('/document/{id}/download', [DocumentController::class, 'download'])->name('document.download');

// Payment routes
Route::post('/payment/initiate', [PaymentController::class, 'initiate'])->name('payment.initiate');
Route::get('/payment/status/{checkoutRequestId}', [PaymentController::class, 'status'])->name('payment.status');

// M-Pesa callback (no CSRF)
Route::post('/api/mpesa/callback', [PaymentController::class, 'callback'])->name('mpesa.callback')->withoutMiddleware(['web']);

// Dashboard (requires auth)
Route::middleware('auth')->group(function () {
    Route::get('/dashboard', function () {
        $documents = auth()->user()->documents()->with('payment')->latest()->get();
        return view('dashboard', compact('documents'));
    })->name('dashboard');
});

