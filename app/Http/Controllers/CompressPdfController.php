<?php

namespace App\Http\Controllers;

use App\Models\Document;
use App\Services\PdfCompressionService;
use App\Services\PdfFormattingService;
use App\Services\WordToPdfService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class CompressPdfController extends Controller
{
    /**
     * Upload a PDF or Word document for compression.
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
                return response()->json(['success' => false, 'error' => 'Unable to read the document. The file may be corrupted.'], 400);
            }

            $fileSize = filesize($fullPath);

            // Create document record
            $document = Document::safeCreate([
                'user_id' => auth()->id(),
                'original_name' => $originalName,
                'original_path' => $storedPath,
                'page_count' => $pageCount,
                'file_size' => $fileSize,
                'status' => 'pending',
                'payment_status' => 'unpaid',
                'tool_type' => 'compress-pdf',
            ]);

            return response()->json([
                'success' => true,
                'document_id' => $document->id,
                'original_name' => $document->original_name,
                'page_count' => $document->page_count,
                'file_size' => $document->file_size,
                'rate' => 1, // KES 1 per page for compression tool
                'cost' => $document->page_count * 1,
            ]);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('Compress upload error', ['error' => $e->getMessage()]);
            return response()->json(['success' => false, 'error' => 'Failed to process document: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Process PDF compression after payment verification.
     */
    public function process(Request $request, string $id)
    {
        $document = Document::findOrFail($id);

        $inputPath = storage_path('app/private/' . $document->original_path);
        if (!file_exists($inputPath)) {
            return response()->json(['error' => 'Original document file not found.'], 404);
        }

        $quality = $request->input('quality', 'medium'); // 'extreme' / 'low', 'medium' / 'recommended', 'high' / 'less'
        $outputFilename = 'documents/formatted/' . Str::uuid() . '.pdf';
        $outputPath = storage_path('app/private/' . $outputFilename);

        $compressService = new PdfCompressionService();
        $success = $compressService->compress($inputPath, $outputPath, $quality);

        if (!$success || !file_exists($outputPath)) {
            return response()->json(['error' => 'Failed to compress PDF document.'], 500);
        }

        $originalSize = $document->file_size;
        $compressedSize = filesize($outputPath);
        $savedBytes = max(0, $originalSize - $compressedSize);
        $savedPercent = $originalSize > 0 ? round(($savedBytes / $originalSize) * 100) : 0;

        $document->update([
            'formatted_path' => $outputFilename,
            'status' => 'completed',
            'payment_status' => 'paid',
            'compressed_size' => $compressedSize,
        ]);

        return response()->json([
            'success' => true,
            'download_url' => route('document.download', $document->id),
            'original_size' => $originalSize,
            'compressed_size' => $compressedSize,
            'saved_bytes' => $savedBytes,
            'saved_percent' => $savedPercent,
        ]);
    }
}
