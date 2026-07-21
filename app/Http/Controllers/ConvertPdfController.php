<?php

namespace App\Http\Controllers;

use App\Models\Document;
use App\Services\PdfConvertService;
use App\Services\PdfFormattingService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ConvertPdfController extends Controller
{
    /**
     * Upload document for conversion.
     */
    public function upload(Request $request)
    {
        $request->validate([
            'file' => 'required|file|max:102400', // Max 100MB
            'conversion_type' => 'required|string',
        ]);

        try {
            $file = $request->file('file');
            $originalName = $file->getClientOriginalName();
            $extension = strtolower($file->getClientOriginalExtension());
            $conversionType = strtolower($request->input('conversion_type', 'word-to-pdf'));

            // Store original uploaded file
            $storedPath = $file->store('documents/originals', 'local');
            $fullPath = storage_path('app/private/' . $storedPath);

            $pageCount = 1;
            $formatter = new PdfFormattingService();
            $convertService = new PdfConvertService();

            if (in_array($extension, ['pdf'])) {
                $pageCount = max(1, $formatter->getPageCount($fullPath));
            } elseif (in_array($extension, ['jpg', 'jpeg', 'png', 'webp'])) {
                $pageCount = 1;
            } else {
                // Word, PPT, Excel, HTML: convert to temp PDF to get page count
                $tempDir = storage_path('app/private/documents/convert_temp/' . Str::uuid());
                $convertedPdf = $convertService->officeToPdf($fullPath, $tempDir);
                if ($convertedPdf && file_exists($convertedPdf)) {
                    $pageCount = max(1, $formatter->getPageCount($convertedPdf));
                }
            }

            $document = Document::safeCreate([
                'user_id' => auth()->id(),
                'original_name' => $originalName,
                'original_path' => $storedPath,
                'page_count' => $pageCount,
                'file_size' => filesize($fullPath),
                'status' => 'pending',
                'payment_status' => 'unpaid',
                'tool_type' => 'convert-pdf',
                'page_number_settings' => [
                    'conversion_type' => $conversionType,
                ],
            ]);

            return response()->json([
                'success' => true,
                'document_id' => $document->id,
                'original_name' => $document->original_name,
                'page_count' => $document->page_count,
                'file_size' => $document->file_size,
                'conversion_type' => $conversionType,
                'rate' => 1, // KES 1 per page for conversion tool
                'cost' => $document->page_count * 1,
            ]);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('Convert upload error', ['error' => $e->getMessage()]);
            return response()->json(['success' => false, 'error' => 'Failed to process document: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Process document conversion after payment verification.
     */
    public function process(Request $request, string $id)
    {
        $document = Document::findOrFail($id);

        $inputPath = storage_path('app/private/' . $document->original_path);
        if (!file_exists($inputPath)) {
            return response()->json(['error' => 'Original document file not found.'], 404);
        }

        $settings = $document->page_number_settings ?? [];
        $conversionType = $settings['conversion_type'] ?? 'word-to-pdf';

        $sessionFolder = 'documents/formatted/' . Str::uuid();
        $outputDir = storage_path('app/private/' . $sessionFolder);
        if (!is_dir($outputDir)) mkdir($outputDir, 0755, true);

        $convertService = new PdfConvertService();
        $resultFile = null;

        switch ($conversionType) {
            case 'jpg-to-pdf':
                $outputPdf = $outputDir . '/converted_document.pdf';
                if ($convertService->jpgToPdf([$inputPath], $outputPdf)) {
                    $resultFile = $outputPdf;
                }
                break;

            case 'word-to-pdf':
            case 'ppt-to-pdf':
            case 'excel-to-pdf':
            case 'html-to-pdf':
                $resultFile = $convertService->officeToPdf($inputPath, $outputDir);
                break;

            case 'pdf-to-jpg':
                $resultFile = $convertService->pdfToJpg($inputPath, $outputDir);
                break;

            case 'pdf-to-word':
                $resultFile = $convertService->pdfToOffice($inputPath, 'docx', $outputDir);
                break;

            case 'pdf-to-ppt':
                $resultFile = $convertService->pdfToOffice($inputPath, 'pptx', $outputDir);
                break;

            case 'pdf-to-excel':
                $resultFile = $convertService->pdfToOffice($inputPath, 'xlsx', $outputDir);
                break;

            case 'pdf-to-pdfa':
                $outputPdfA = $outputDir . '/converted_pdfa.pdf';
                if ($convertService->pdfToPdfA($inputPath, $outputPdfA)) {
                    $resultFile = $outputPdfA;
                }
                break;

            default:
                $resultFile = $convertService->officeToPdf($inputPath, $outputDir);
                break;
        }

        if (!$resultFile || !file_exists($resultFile)) {
            return response()->json(['error' => 'Failed to convert document format.'], 500);
        }

        $relativeOutputPath = $sessionFolder . '/' . basename($resultFile);

        $document->update([
            'formatted_path' => $relativeOutputPath,
            'status' => 'completed',
            'payment_status' => 'paid',
            'compressed_size' => filesize($resultFile),
        ]);

        return response()->json([
            'success' => true,
            'download_url' => route('document.download', $document->id),
        ]);
    }
}
