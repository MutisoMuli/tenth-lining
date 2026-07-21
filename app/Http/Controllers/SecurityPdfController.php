<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Document;
use App\Services\PdfFormattingService;
use App\Services\PdfSecurityService;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Log;

class SecurityPdfController extends Controller
{
    protected PdfFormattingService $formattingService;
    protected PdfSecurityService $securityService;

    public function __construct(PdfFormattingService $formattingService, PdfSecurityService $securityService)
    {
        $this->formattingService = $formattingService;
        $this->securityService = $securityService;
    }

    /**
     * Upload document for PDF Security tools.
     */
    public function upload(Request $request)
    {
        try {
            $request->validate([
                'file' => 'required|file|mimes:pdf|max:104857600', // 100MB
                'tool_type' => 'nullable|string',
            ]);

            $file = $request->file('file');
            $originalName = $file->getClientOriginalName();
            $toolType = $request->input('tool_type', 'unlock-pdf');

            $storedPath = $file->store('documents/originals', 'local');
            $fullPath = storage_path('app/' . $storedPath);
            if (!file_exists($fullPath)) {
                $fullPath = storage_path('app/private/' . $storedPath);
            }

            $pageCount = $this->formattingService->getPageCount($fullPath);

            $document = Document::create([
                'user_id' => auth()->id(),
                'original_name' => $originalName,
                'original_path' => $storedPath,
                'page_count' => $pageCount,
                'file_size' => $file->getSize(),
                'status' => 'pending',
                'payment_status' => 'paid',
                'tool_type' => $toolType,
                'session_id' => session()->getId(),
            ]);

            return response()->json([
                'success' => true,
                'document_id' => $document->id,
                'original_name' => $originalName,
                'page_count' => $pageCount,
                'file_size' => $file->getSize(),
                'tool_type' => $toolType,
                'preview_url' => route('document.preview', $document->id),
            ]);
        } catch (\Throwable $e) {
            Log::error('SecurityPdfController upload exception', ['error' => $e->getMessage()]);
            return response()->json(['success' => false, 'error' => 'Upload failed: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Process PDF Security tool actions.
     */
    public function process(Request $request, string $id)
    {
        try {
            $doc = Document::findOrFail($id);

            $inputPath = storage_path('app/' . $doc->original_path);
            if (!file_exists($inputPath)) {
                $inputPath = storage_path('app/private/' . $doc->original_path);
            }

            if (!file_exists($inputPath)) {
                return response()->json(['success' => false, 'error' => 'Original document file not found.'], 404);
            }

            $dir = dirname($inputPath);
            $outputPath = $dir . '/secured_' . Str::slug(pathinfo($doc->original_name, PATHINFO_FILENAME)) . '.pdf';

            $toolType = $doc->tool_type ?? $request->input('tool_type', 'unlock-pdf');
            $success = false;

            if ($toolType === 'unlock-pdf') {
                $password = $request->input('password', null);
                $success = $this->securityService->unlockPdf($inputPath, $password, $outputPath);
            } elseif ($toolType === 'protect-pdf') {
                $password = $request->input('password', '123456');
                $success = $this->securityService->protectPdf($inputPath, $password, $outputPath);
            } elseif ($toolType === 'sign-pdf') {
                $signatureData = $request->input('signature', []);
                $success = $this->securityService->signPdf($inputPath, $signatureData, $outputPath);
            } elseif ($toolType === 'redact-pdf') {
                $redactions = $request->input('redactions', []);
                $success = $this->securityService->redactPdf($inputPath, $redactions, $outputPath);
            } elseif ($toolType === 'compare-pdf') {
                $secondFile = $request->file('second_file');
                if ($secondFile) {
                    $secondPath = $secondFile->store('documents/originals', 'local');
                    $secondFullPath = storage_path('app/' . $secondPath);
                    $success = $this->securityService->comparePdf($inputPath, $secondFullPath, $outputPath);
                } else {
                    $success = $this->securityService->unlockPdf($inputPath, null, $outputPath);
                }
            } else {
                $success = $this->securityService->unlockPdf($inputPath, null, $outputPath);
            }

            if (!$success || !file_exists($outputPath)) {
                return response()->json(['success' => false, 'error' => 'Failed to process PDF security action.'], 500);
            }

            $relativePath = str_replace([storage_path('app/private/'), storage_path('app/')], '', $outputPath);
            $relativePath = ltrim(str_replace('\\', '/', $relativePath), '/');

            $doc->formatted_path = $relativePath;
            $doc->status = 'completed';
            $doc->payment_status = 'paid';
            $doc->save();

            return response()->json([
                'success' => true,
                'message' => 'Document security processing complete.',
                'download_url' => route('document.download', $doc->id),
            ]);
        } catch (\Throwable $e) {
            Log::error('SecurityPdfController process failed', ['error' => $e->getMessage()]);
            return response()->json(['success' => false, 'error' => 'Processing failed: ' . $e->getMessage()], 500);
        }
    }
}
