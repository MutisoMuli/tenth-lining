<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Document;
use App\Services\PdfFormattingService;
use App\Services\PdfEditService;
use App\Services\WordToPdfService;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Log;

class EditPdfController extends Controller
{
    protected PdfFormattingService $formattingService;
    protected PdfEditService $editService;

    public function __construct(PdfFormattingService $formattingService, PdfEditService $editService)
    {
        $this->formattingService = $formattingService;
        $this->editService = $editService;
    }

    /**
     * Handle document upload for EDIT PDF tools.
     */
    public function upload(Request $request)
    {
        try {
            $request->validate([
                'file' => 'required|file|mimes:pdf,doc,docx|max:104857600',
            ]);

            $toolType = $request->input('tool_type', 'rotate-pdf');
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
                return response()->json(['success' => false, 'error' => 'Unable to read PDF page count.'], 422);
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
            Log::error('EditPdfController upload failed', ['error' => $e->getMessage()]);
            return response()->json(['success' => false, 'error' => 'Upload failed: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Process EDIT PDF execution after payment verification.
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
            $outputPath = $dir . '/edited_' . Str::slug(pathinfo($doc->original_name, PATHINFO_FILENAME)) . '.pdf';

            $success = false;

            if ($doc->tool_type === 'rotate-pdf') {
                $angle = (int)$request->input('rotation', 90);
                $success = $this->editService->rotatePdf($inputPath, $angle, $outputPath);
            } elseif ($doc->tool_type === 'add-watermark') {
                $text = $request->input('watermark_text', 'CONFIDENTIAL');
                $rotation = (int)$request->input('rotation', 45);
                $opacity = (float)$request->input('opacity', 0.3);
                $success = $this->editService->addWatermark($inputPath, $text, $outputPath, $rotation, $opacity);
            } elseif ($doc->tool_type === 'add-page-numbers') {
                $settings = $request->all();
                $success = $this->editService->addPageNumbers($inputPath, $settings, $outputPath);
            } elseif ($doc->tool_type === 'crop-pdf') {
                $margins = [
                    'top' => (float)$request->input('margin_top', 10),
                    'bottom' => (float)$request->input('margin_bottom', 10),
                    'left' => (float)$request->input('margin_left', 10),
                    'right' => (float)$request->input('margin_right', 10),
                ];
                $success = $this->editService->cropPdf($inputPath, $margins, $outputPath);
            } elseif ($doc->tool_type === 'edit-pdf' || $doc->tool_type === 'pdf-forms') {
                $annotations = $request->input('annotations', []);
                $success = $this->editService->editPdf($inputPath, $annotations, $outputPath);
            } else {
                $success = $this->editService->rotatePdf($inputPath, 90, $outputPath);
            }

            if (!$success || !file_exists($outputPath)) {
                return response()->json(['success' => false, 'error' => 'Failed to process document editing.'], 500);
            }

            $relativePath = str_replace([storage_path('app/private/'), storage_path('app/')], '', $outputPath);
            $relativePath = ltrim(str_replace('\\', '/', $relativePath), '/');

            $doc->formatted_path = $relativePath;
            $doc->status = 'completed';
            $doc->save();

            return response()->json([
                'success' => true,
                'message' => 'Document edited successfully.',
                'download_url' => url('/api/documents/' . $doc->id . '/download'),
            ]);
        } catch (\Throwable $e) {
            Log::error('EditPdfController process failed', ['error' => $e->getMessage()]);
            return response()->json(['success' => false, 'error' => 'Processing failed: ' . $e->getMessage()], 500);
        }
    }
}
