<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Document;
use App\Services\PdfFormattingService;
use App\Services\PdfOptimizeService;
use App\Services\WordToPdfService;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Log;

class OptimizePdfController extends Controller
{
    protected PdfFormattingService $formattingService;
    protected PdfOptimizeService $optimizeService;

    public function __construct(PdfFormattingService $formattingService, PdfOptimizeService $optimizeService)
    {
        $this->formattingService = $formattingService;
        $this->optimizeService = $optimizeService;
    }

    /**
     * Handle document upload for Repair PDF and OCR PDF tools.
     */
    public function upload(Request $request)
    {
        try {
            $request->validate([
                'file' => 'required|file|mimes:pdf,doc,docx|max:104857600',
            ]);

            $toolType = $request->input('tool_type', 'repair-pdf');
            $file = $request->file('file');
            $originalName = $file->getClientOriginalName();
            $extension = strtolower($file->getClientOriginalExtension());

            // Store original upload
            $storedPath = $file->store('documents/originals', 'local');
            $fullPath = storage_path('app/' . $storedPath);
            if (!file_exists($fullPath)) {
                $fullPath = storage_path('app/private/' . $storedPath);
            }

            // Convert Word to PDF if uploaded doc/docx
            if (in_array($extension, ['doc', 'docx'])) {
                $converter = new WordToPdfService();
                $targetDir = dirname($fullPath);
                $pdfPath = $converter->convert($fullPath, $targetDir);
                if ($pdfPath) {
                    $storedPath = 'documents/originals/' . basename($pdfPath);
                    $fullPath = $pdfPath;
                }
            }

            $pageCount = $this->formattingService->getPageCount($fullPath);
            if ($pageCount === 0) {
                // For Repair PDF, default to 1 page if header corrupted
                $pageCount = 1;
            }

            $fileSize = file_exists($fullPath) ? filesize($fullPath) : 0;
            $costPerPage = 1;
            $totalCost = max(1, $pageCount * $costPerPage);

            $doc = Document::safeCreate([
                'user_id' => auth()->id(),
                'original_name' => $originalName,
                'original_path' => $storedPath,
                'page_count' => $pageCount,
                'file_size' => $fileSize,
                'status' => 'pending',
                'payment_status' => 'unpaid',
                'tool_type' => $toolType,
            ]);

            return response()->json([
                'success' => true,
                'document_id' => $doc->id,
                'original_name' => $originalName,
                'page_count' => $pageCount,
                'file_size' => $fileSize,
                'cost' => $totalCost,
            ]);
        } catch (\Throwable $e) {
            Log::error('OptimizePdfController upload failed', ['error' => $e->getMessage()]);
            return response()->json(['success' => false, 'error' => 'Upload failed: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Process Repair PDF or OCR PDF execution after payment verification.
     */
    public function process(Request $request, $id)
    {
        try {
            $doc = Document::findOrFail($id);

            $inputPath = storage_path('app/' . $doc->original_path);
            if (!file_exists($inputPath)) {
                $inputPath = storage_path('app/private/' . $doc->original_path);
            }

            $dir = dirname($inputPath);
            $prefix = ($doc->tool_type === 'ocr-pdf') ? 'ocr_' : 'repaired_';
            $outputPath = $dir . '/' . $prefix . Str::slug(pathinfo($doc->original_name, PATHINFO_FILENAME)) . '.pdf';

            $success = false;

            if ($doc->tool_type === 'ocr-pdf') {
                $lang = $request->input('language', 'eng');
                $success = $this->optimizeService->ocrPdf($inputPath, $outputPath, $lang);
            } else {
                // repair-pdf
                $success = $this->optimizeService->repairPdf($inputPath, $outputPath);
            }

            if (!$success || !file_exists($outputPath)) {
                return response()->json(['success' => false, 'error' => 'Failed to process document optimization.'], 500);
            }

            $relativePath = str_replace([storage_path('app/private/'), storage_path('app/')], '', $outputPath);
            $relativePath = ltrim(str_replace('\\', '/', $relativePath), '/');

            $doc->formatted_path = $relativePath;
            $doc->compressed_size = filesize($outputPath);
            $doc->status = 'completed';
            $doc->payment_status = 'paid';
            $doc->save();

            return response()->json([
                'success' => true,
                'message' => 'Document optimized successfully.',
                'download_url' => route('document.download', $doc->id),
            ]);
        } catch (\Throwable $e) {
            Log::error('OptimizePdfController process failed', ['error' => $e->getMessage()]);
            return response()->json(['success' => false, 'error' => 'Processing failed: ' . $e->getMessage()], 500);
        }
    }
}
