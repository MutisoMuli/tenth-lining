<?php

namespace App\Http\Controllers;

use App\Models\Document;
use App\Services\PdfFormattingService;
use App\Services\PdfSplitService;
use App\Services\WordToPdfService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class SplitPdfController extends Controller
{
    /**
     * Upload a PDF document for splitting.
     */
    public function upload(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:pdf,doc,docx|max:102400', // Max 100MB
        ]);

        try {
            $file = $request->file('file');
            $originalName = $file->getClientOriginalName();
            $extension = strtolower($file->getClientOriginalExtension());

            // Store the uploaded file
            $storedPath = $file->store('documents/originals', 'local');
            $fullPath = storage_path('app/private/' . $storedPath);

            // Convert Word to PDF if needed
            if (in_array($extension, ['doc', 'docx'])) {
                $converter = new WordToPdfService();
                $pdfPath = $converter->convert($fullPath, storage_path('app/private/documents/originals'));

                if ($pdfPath) {
                    $storedPath = 'documents/originals/' . basename($pdfPath);
                    $fullPath = $pdfPath;
                }
            }

            // Get page count
            $formatter = new PdfFormattingService();
            $pageCount = $formatter->getPageCount($fullPath);

            if ($pageCount === 0) {
                return response()->json(['success' => false, 'error' => 'Unable to read the PDF. The file may be corrupted.'], 400);
            }

            // Create document record
            $document = Document::safeCreate([
                'user_id' => auth()->id(),
                'original_name' => $originalName,
                'original_path' => $storedPath,
                'page_count' => $pageCount,
                'file_size' => filesize($fullPath),
                'status' => 'pending',
                'payment_status' => 'unpaid',
                'tool_type' => 'split-pdf',
            ]);

            return response()->json([
                'success' => true,
                'document_id' => $document->id,
                'original_name' => $document->original_name,
                'page_count' => $document->page_count,
                'file_size' => $document->file_size,
                'rate' => 1, // KES 1 per page for split tool
                'cost' => $document->page_count * 1,
            ]);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('Split upload error', ['error' => $e->getMessage()]);
            return response()->json(['success' => false, 'error' => 'Failed to process document: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Process PDF split after payment verification.
     */
    public function process(Request $request, string $id)
    {
        $document = Document::findOrFail($id);

        $inputPath = storage_path('app/private/' . $document->original_path);
        if (!file_exists($inputPath)) {
            return response()->json(['error' => 'Original document file not found.'], 404);
        }

        $mode = $request->input('mode', 'ranges'); // 'ranges', 'all', 'extract'
        $sessionFolder = 'documents/formatted/' . Str::uuid();
        $outputDir = storage_path('app/private/' . $sessionFolder);

        $splitService = new PdfSplitService();
        $resultPath = null;

        if ($mode === 'all') {
            $resultPath = $splitService->extractAllPages($inputPath, $outputDir);
        } elseif ($mode === 'extract') {
            $pages = $request->input('pages', []);
            $resultPath = $splitService->extractPages($inputPath, $pages, $outputDir);
        } else {
            // Default: custom ranges
            $ranges = $request->input('ranges', []);
            if (empty($ranges)) {
                // Default split in half
                $mid = max(1, (int)ceil($document->page_count / 2));
                $ranges = [
                    ['from' => 1, 'to' => $mid],
                    ['from' => min($document->page_count, $mid + 1), 'to' => $document->page_count]
                ];
            }
            $resultPath = $splitService->splitByRanges($inputPath, $ranges, $outputDir);
        }

        if (!$resultPath || !file_exists($resultPath)) {
            return response()->json(['error' => 'Failed to split PDF document.'], 500);
        }

        $relativeOutputPath = $sessionFolder . '/' . basename($resultPath);

        $document->update([
            'formatted_path' => $relativeOutputPath,
            'status' => 'completed',
            'payment_status' => 'paid',
            'compressed_size' => filesize($resultPath),
        ]);

        return response()->json([
            'success' => true,
            'download_url' => route('document.download', $document->id),
        ]);
    }
}
