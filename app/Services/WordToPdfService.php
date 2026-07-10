<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use Symfony\Component\Process\Process;

class WordToPdfService
{
    protected string $libreOfficePath;

    public function __construct()
    {
        $this->libreOfficePath = config('services.libreoffice.path', 'soffice');
    }

    /**
     * Convert a Word document (DOC/DOCX) to PDF using LibreOffice headless mode.
     *
     * @param string $inputPath  Absolute path to the Word file.
     * @param string $outputDir  Directory to save the converted PDF.
     * @return string|null       Path to the converted PDF, or null on failure.
     */
    public function convert(string $inputPath, string $outputDir): ?string
    {
        try {
            $process = new Process([
                $this->libreOfficePath,
                '--headless',
                '--convert-to', 'pdf',
                '--outdir', $outputDir,
                $inputPath,
            ]);

            $process->setTimeout(120);
            $process->run();

            if (!$process->isSuccessful()) {
                Log::error('LibreOffice conversion failed', [
                    'error' => $process->getErrorOutput(),
                    'input' => $inputPath,
                ]);
                return null;
            }

            // Derive the output filename
            $baseName = pathinfo($inputPath, PATHINFO_FILENAME);
            $pdfPath = rtrim($outputDir, '/\\') . DIRECTORY_SEPARATOR . $baseName . '.pdf';

            return file_exists($pdfPath) ? $pdfPath : null;
        } catch (\Throwable $e) {
            Log::error('Word to PDF conversion exception', ['error' => $e->getMessage()]);
            return null;
        }
    }
}
