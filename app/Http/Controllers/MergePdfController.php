<?php

namespace App\Http\Controllers;

use App\Models\Document;
use App\Services\PdfFormattingService;
use App\Services\PdfMergeService;
use App\Services\WordToPdfService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class MergePdfController extends Controller
{
    /**
     * Upload multiple PDF files for merging.
     */
    public function upload(Request $request)
    {
        $request->validate([
            'files' => 'required|array|min:2',
            'files.*' => 'required|file|mimes:pdf,doc,docx|max:102400', // Max 100MB per file
        ]);

        try {
            $uploadedFiles = $request->file('files');
            $sessionFolder = 'documents/merge_temp/' . Str::uuid();
            $targetDir = storage_path('app/private/' . $sessionFolder);

            if (!is_dir($targetDir)) {
                mkdir($targetDir, 0755, true);
            }

            $fileList = [];
            $totalPageCount = 0;
            $totalSizeBytes = 0;
            $formatter = new PdfFormattingService();
            $wordConverter = new WordToPdfService();

            foreach ($uploadedFiles as $index => $file) {
                $originalName = $file->getClientOriginalName();
                $extension = strtolower($file->getClientOriginalExtension());
                $storedName = Str::uuid() . '.' . $extension;
                $storedPath = $file->storeAs($sessionFolder, $storedName, 'local');
                $fullPath = storage_path('app/private/' . $storedPath);

                // Convert Word to PDF if needed
                if (in_array($extension, ['doc', 'docx'])) {
                    $convertedPdfPath = $wordConverter->convert($fullPath, $targetDir);
                    if ($convertedPdfPath) {
                        $fullPath = $convertedPdfPath;
                        $storedPath = $sessionFolder . '/' . basename($convertedPdfPath);
                    }
                }

                $pages = $formatter->getPageCount($fullPath);
                $size = filesize($fullPath);

                $totalPageCount += $pages;
                $totalSizeBytes += $size;

                $fileList[] = [
                    'id' => Str::uuid()->toString(),
                    'original_name' => $originalName,
                    'path' => $storedPath,
                    'full_path' => $fullPath,
                    'page_count' => $pages,
                    'file_size' => $size,
                    'order' => $index + 1,
                ];
            }

            // Create document record representing the merge task
            $document = Document::safeCreate([
                'user_id' => auth()->id(),
                'original_name' => 'Merged Document (' . count($fileList) . ' files).pdf',
                'original_path' => $fileList[0]['path'] ?? '',
                'page_count' => max(1, $totalPageCount),
                'file_size' => $totalSizeBytes,
                'status' => 'pending',
                'payment_status' => 'unpaid',
                'tool_type' => 'merge-pdf',
                'page_number_settings' => [
                    'files' => $fileList
                ],
            ]);

            return response()->json([
                'success' => true,
                'document_id' => $document->id,
                'files' => $fileList,
                'total_pages' => $document->page_count,
                'total_size' => $document->file_size,
                'rate' => 1, // KES 1 per page for merge tool
                'cost' => $document->page_count * 1,
            ]);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('Merge upload error', ['error' => $e->getMessage()]);
            return response()->json(['success' => false, 'error' => 'Failed to process files: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Execute PDF merge after payment verification.
     */
    public function process(Request $request, string $id)
    {
        $document = Document::findOrFail($id);

        if ($document->payment_status !== 'paid') {
            return response()->json(['error' => 'Payment required before processing merge.'], 402);
        }

        $orderPayload = $request->input('files', []);
        $filesToMerge = [];

        if (!empty($orderPayload) && is_array($orderPayload)) {
            foreach ($orderPayload as $item) {
                if (isset($item['path'])) {
                    $filesToMerge[] = storage_path('app/private/' . $item['path']);
                }
            }
        }

        // Fallback to stored document file list if payload is empty
        if (empty($filesToMerge) && isset($document->page_number_settings['files'])) {
            foreach ($document->page_number_settings['files'] as $item) {
                if (isset($item['path'])) {
                    $filesToMerge[] = storage_path('app/private/' . $item['path']);
                }
            }
        }

        if (empty($filesToMerge)) {
            return response()->json(['error' => 'No files found to merge.'], 400);
        }

        $outputFilename = 'documents/formatted/' . Str::uuid() . '.pdf';
        $outputPath = storage_path('app/private/' . $outputFilename);

        $mergeService = new PdfMergeService();
        $success = $mergeService->merge($filesToMerge, $outputPath);

        if (!$success) {
            return response()->json(['error' => 'Failed to combine PDF files. Please verify the files are valid.'], 500);
        }

        $document->update([
            'formatted_path' => $outputFilename,
            'status' => 'completed',
            'compressed_size' => filesize($outputPath),
        ]);

        return response()->json([
            'success' => true,
            'download_url' => route('document.download', $document->id),
        ]);
    }
}
