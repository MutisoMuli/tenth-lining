<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use Symfony\Component\Process\Process;

class PdfCompressionService
{
    protected string $ghostscriptPath;

    public function __construct()
    {
        $this->ghostscriptPath = config('services.ghostscript.path', 'gs');
    }

    /**
     * Compress a PDF file using Ghostscript.
     *
     * @param string $inputPath   Absolute path to the source PDF.
     * @param string $outputPath  Absolute path for the compressed PDF.
     * @param string $quality     Compression quality: low, medium, high.
     * @return bool
     */
    public function compress(string $inputPath, string $outputPath, string $quality = 'medium'): bool
    {
        $pdfsettings = match ($quality) {
            'low' => '/screen',
            'high' => '/prepress',
            default => '/ebook',
        };

        try {
            $process = new Process([
                $this->ghostscriptPath,
                '-sDEVICE=pdfwrite',
                '-dCompatibilityLevel=1.4',
                "-dPDFSETTINGS={$pdfsettings}",
                '-dNOPAUSE',
                '-dQUIET',
                '-dBATCH',
                "-sOutputFile={$outputPath}",
                $inputPath,
            ]);

            $process->setTimeout(300);
            $process->run();

            if (!$process->isSuccessful()) {
                Log::error('Ghostscript compression failed', [
                    'error' => $process->getErrorOutput(),
                    'input' => $inputPath,
                ]);
                return false;
            }

            return file_exists($outputPath);
        } catch (\Throwable $e) {
            Log::error('PDF compression exception', ['error' => $e->getMessage()]);
            return false;
        }
    }

    /**
     * Check if compression is needed based on file size threshold.
     *
     * @param string $path      Path to the PDF file.
     * @param int    $maxSizeMb Maximum allowed size in MB.
     * @return bool
     */
    public function needsCompression(string $path, int $maxSizeMb = 25): bool
    {
        return filesize($path) > ($maxSizeMb * 1024 * 1024);
    }
}
