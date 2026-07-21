<?php

namespace App\Http\Controllers;

use App\Models\Document;
use App\Models\Download;
use App\Services\PdfFormattingService;
use App\Services\WordToPdfService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class DocumentController extends Controller
{
    /**
     * Show the landing page.
     */
    public function index()
    {
        return view('welcome');
    }

    /**
     * Handle file upload and redirect to the editor.
     */
    public function upload(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:pdf,doc,docx|max:102400', // 100MB
        ]);

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

            if (!$pdfPath) {
                return back()->withErrors(['file' => 'Failed to convert Word document to PDF. Please upload a PDF file directly.']);
            }

            $storedPath = 'documents/originals/' . basename($pdfPath);
            $fullPath = $pdfPath;
        }

        // Get page count
        $formatter = new PdfFormattingService();
        $pageCount = $formatter->getPageCount($fullPath);

        if ($pageCount === 0) {
            return back()->withErrors(['file' => 'Unable to read the PDF. The file may be corrupted.']);
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
            'tool_type' => $request->input('tool_type', 'tenth-lining'),
        ]);

        // Return JSON for SPA requests, redirect for traditional form submits
        if ($request->expectsJson() || $request->header('X-Requested-With') === 'XMLHttpRequest') {
            return response()->json([
                'success' => true,
                'document_id' => $document->id,
                'original_name' => $document->original_name,
                'page_count' => $document->page_count,
                'file_size' => $document->file_size,
            ]);
        }

        return redirect()->route('spa', ['any' => 'editor/' . $document->id]);

    }

    /**
     * Show the editor page for a document.
     */
    public function editor(string $id)
    {
        $document = Document::findOrFail($id);
        return view('editor', compact('document'));
    }

    /**
     * Serve the original PDF for preview in the browser.
     */
    public function preview(string $id)
    {
        $document = Document::findOrFail($id);
        $path = storage_path('app/private/' . $document->original_path);

        if (!file_exists($path)) {
            abort(404, 'Document not found.');
        }

        return response()->file($path, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="preview.pdf"',
        ]);
    }

    /**
     * Save formatting settings for a document.
     */
    public function saveSettings(Request $request, string $id)
    {
        $document = Document::findOrFail($id);

        $document->update([
            'page_number_settings' => $request->input('page_number_settings'),
            'tenth_line_settings' => $request->input('tenth_line_settings'),
        ]);

        return response()->json(['success' => true, 'message' => 'Settings saved.']);
    }

    /**
     * Export the formatted PDF (after payment verification).
     */
    public function export(Request $request, string $id)
    {
        $document = Document::findOrFail($id);

        if ($document->payment_status !== 'paid') {
            return response()->json(['error' => 'Payment required before download.'], 402);
        }

        // Use settings from the request (current editor state) with DB fallback
        $pageNumberSettings = $request->input('page_number_settings', $document->page_number_settings ?? []);
        $tenthLineSettings = $request->input('tenth_line_settings', $document->tenth_line_settings ?? []);

        // Persist settings so re-downloads from history also use them
        $document->update([
            'page_number_settings' => $pageNumberSettings,
            'tenth_line_settings' => $tenthLineSettings,
        ]);

        // Generate formatted PDF
        $formatter = new PdfFormattingService();
        $inputPath = storage_path('app/private/' . $document->original_path);
        $outputFilename = 'documents/formatted/' . Str::uuid() . '.pdf';
        $outputPath = storage_path('app/private/' . $outputFilename);

        // Ensure output directory exists
        if (!is_dir(dirname($outputPath))) {
            mkdir(dirname($outputPath), 0755, true);
        }

        $lineCoordinates = $request->input('line_coordinates', []);

        $success = $formatter->format(
            $inputPath,
            $outputPath,
            $pageNumberSettings,
            $tenthLineSettings,
            $lineCoordinates
        );

        if (!$success) {
            return response()->json(['error' => 'Failed to generate formatted PDF.'], 500);
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

    /**
     * Download the formatted PDF.
     */
    public function download(string $id)
    {
        $document = Document::findOrFail($id);

        if ($document->payment_status !== 'paid' || !$document->formatted_path) {
            abort(403, 'Payment required or document not yet processed.');
        }

        $path = storage_path('app/private/' . $document->formatted_path);

        if (!file_exists($path)) {
            abort(404, 'Formatted document not found.');
        }

        // Log download
        Download::create([
            'document_id' => $document->id,
            'user_id' => auth()->id(),
            'ip_address' => request()->ip(),
        ]);

        $downloadName = pathinfo($document->original_name, PATHINFO_FILENAME) . '_formatted.pdf';

        return response()->download($path, $downloadName);
    }
}
