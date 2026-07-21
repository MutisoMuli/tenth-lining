<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Document;
use App\Services\PdfFormattingService;
use App\Services\PdfOrganizeService;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Log;

class OrganizePdfController extends Controller
{
    protected PdfFormattingService $formattingService;
    protected PdfOrganizeService $organizeService;

    public function __construct(PdfFormattingService $formattingService, PdfOrganizeService $organizeService)
    {
        $this->formattingService = $formattingService;
        $this->organizeService = $organizeService;
    }

    /**
     * Handle document upload for Organize PDF tools (Remove, Extract, Reorder, Scan).
     */
    public function upload(Request $request)
    {
        try {
            $toolType = $request->input('tool_type', 'organize-pdf');

            if ($toolType === 'scan-to-pdf') {
                $request->validate([
                    'files' => 'required|array|min:1',
                    'files.*' => 'required|file|mimes:jpeg,jpg,png,webp|max:20480',
                ]);

                $uploadedFiles = $request->file('files');
                $sessionId = Str::uuid()->toString();
                $tempSubdir = 'documents/scan_temp/' . $sessionId;
                $savedFiles = [];

                foreach ($uploadedFiles as $file) {
                    $origName = $file->getClientOriginalName();
                    $filename = Str::uuid()->toString() . '.' . $file->getClientOriginalExtension();
                    $path = $file->storeAs($tempSubdir, $filename, 'local');
                    $fullPath = storage_path('app/' . $path);

                    $savedFiles[] = [
                        'name' => $origName,
                        'path' => $path,
                        'full_path' => $fullPath,
                    ];
                }

                $pageCount = count($savedFiles);
                $costPerPage = 1;
                $totalCost = $pageCount * $costPerPage;

                $doc = Document::safeCreate([
                    'user_id' => auth()->id(),
                    'original_name' => sprintf("Scanned Document (%d images).pdf", $pageCount),
                    'original_path' => $savedFiles[0]['path'],
                    'page_count' => $pageCount,
                    'file_size' => 0,
                    'status' => 'pending',
                    'payment_status' => 'unpaid',
                    'tool_type' => $toolType,
                    'page_number_settings' => json_encode(['scans' => $savedFiles]),
                ]);

                return response()->json([
                    'success' => true,
                    'document_id' => $doc->id,
                    'original_name' => $doc->original_name,
                    'total_pages' => $pageCount,
                    'cost' => $totalCost,
                    'files' => $savedFiles,
                ]);
            }

            // Single PDF upload for Remove, Extract, Organize
            $request->validate([
                'file' => 'required|file|mimes:pdf,doc,docx|max:104857600',
            ]);

            $file = $request->file('file');
            $originalName = $file->getClientOriginalName();
            $ext = strtolower($file->getClientOriginalExtension());

            $sessionId = Str::uuid()->toString();
            $tempSubdir = 'documents/organize_temp/' . $sessionId;
            $filename = Str::uuid()->toString() . '.' . $ext;

            $path = $file->storeAs($tempSubdir, $filename, 'local');
            $fullPath = storage_path('app/' . $path);

            $pageCount = $this->formattingService->getPageCount($fullPath);
            if ($pageCount === 0) {
                return response()->json(['success' => false, 'error' => 'Unable to read PDF page count. Please check the file.'], 422);
            }

            $costPerPage = 1;
            $totalCost = $pageCount * $costPerPage;

            $doc = Document::safeCreate([
                'user_id' => auth()->id(),
                'original_name' => $originalName,
                'original_path' => $path,
                'page_count' => $pageCount,
                'file_size' => filesize($fullPath),
                'status' => 'pending',
                'payment_status' => 'unpaid',
                'tool_type' => $toolType,
            ]);

            return response()->json([
                'success' => true,
                'document_id' => $doc->id,
                'original_name' => $originalName,
                'page_count' => $pageCount,
                'file_size' => filesize($fullPath),
                'cost' => $totalCost,
            ]);
        } catch (\Throwable $e) {
            Log::error('OrganizePdfController upload failed', ['error' => $e->getMessage()]);
            return response()->json(['success' => false, 'error' => 'Upload failed: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Process Organize PDF execution after payment verification.
     */
    public function process(Request $request, $id)
    {
        try {
            $doc = Document::findOrFail($id);

            $mode = $request->input('mode', 'remove'); // remove, extract, organize, scan
            $inputPath = storage_path('app/' . $doc->original_path);
            $dir = dirname($inputPath);
            $outputPath = $dir . '/processed_' . Str::slug(pathinfo($doc->original_name, PATHINFO_FILENAME)) . '.pdf';

            $success = false;

            if ($mode === 'remove') {
                $pagesToRemove = $request->input('pages', []); // array of page numbers e.g. [2, 5]
                $success = $this->organizeService->removePages($inputPath, $pagesToRemove, $outputPath);
            } elseif ($mode === 'extract') {
                $pagesToKeep = $request->input('pages', []); // array of page numbers e.g. [1, 3, 4]
                $success = $this->organizeService->extractPages($inputPath, $pagesToKeep, $outputPath);
            } elseif ($mode === 'organize') {
                $operations = $request->input('operations', []); // array of [{page: 2, rotate: 90}, {page: 1, rotate: 0}]
                $success = $this->organizeService->reorderAndRotate($inputPath, $operations, $outputPath);
            } elseif ($mode === 'scan') {
                $settings = json_decode($doc->page_number_settings, true);
                $scans = $settings['scans'] ?? [];
                $imagePaths = array_column($scans, 'full_path');
                $success = $this->organizeService->scanImagesToPdf($imagePaths, $outputPath);
            }

            if (!$success || !file_exists($outputPath)) {
                return response()->json(['success' => false, 'error' => 'Failed to process document.'], 500);
            }

            // Save output path and set status
            $relativePath = str_replace(storage_path('app/'), '', $outputPath);
            $relativePath = ltrim(str_replace('\\', '/', $relativePath), '/');

            $doc->formatted_path = $relativePath;
            $doc->status = 'completed';
            $doc->payment_status = 'paid';
            $doc->save();

            return response()->json([
                'success' => true,
                'message' => 'Document processed successfully.',
                'download_url' => route('document.download', $doc->id),
            ]);
        } catch (\Throwable $e) {
            Log::error('OrganizePdfController process failed', ['error' => $e->getMessage()]);
            return response()->json(['success' => false, 'error' => 'Processing failed: ' . $e->getMessage()], 500);
        }
    }
}
