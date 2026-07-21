<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use setasign\Fpdi\TcpdfFpdi;
use Symfony\Component\Process\Process;

class PdfCompressionService
{
    protected string $ghostscriptPath;

    public function __construct()
    {
        $this->ghostscriptPath = config('services.ghostscript.path', 'gs');
    }

    /**
     * Compress a PDF file using Ghostscript or FPDI stream optimization fallback.
     *
     * @param string $inputPath   Absolute path to the source PDF.
     * @param string $outputPath  Absolute path for the compressed PDF.
     * @param string $quality     Compression quality: low (extreme), medium (recommended), high (less).
     * @return bool
     */
    public function compress(string $inputPath, string $outputPath, string $quality = 'medium'): bool
    {
        if (!file_exists($inputPath)) {
            return false;
        }

        // Ensure output directory exists
        $dir = dirname($outputPath);
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }

        // Attempt 1: Ghostscript
        $gsSuccess = $this->compressWithGhostscript($inputPath, $outputPath, $quality);
        if ($gsSuccess && file_exists($outputPath) && filesize($outputPath) > 0) {
            return true;
        }

        // Attempt 2: Fallback via FPDI stream compression
        return $this->compressWithFpdi($inputPath, $outputPath);
    }

    /**
     * Compress PDF using Ghostscript binary.
     */
    protected function compressWithGhostscript(string $inputPath, string $outputPath, string $quality): bool
    {
        $pdfsettings = match ($quality) {
            'low', 'extreme' => '/screen',
            'high', 'less' => '/prepress',
            default => '/ebook', // Recommended
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

            return $process->isSuccessful() && file_exists($outputPath) && filesize($outputPath) > 0;
        } catch (\Throwable $e) {
            Log::info('Ghostscript unavailable or failed, switching to FPDI fallback', ['error' => $e->getMessage()]);
            return false;
        }
    }

    /**
     * Fallback PDF compression using FPDI / TCPDF stream compression.
     */
    protected function compressWithFpdi(string $inputPath, string $outputPath): bool
    {
        try {
            $pdf = new TcpdfFpdi();
            $pdf->setPrintHeader(false);
            $pdf->setPrintFooter(false);
            
            // Enable compression & optimize object streams
            $pdf->SetCompression(true);

            $pageCount = $pdf->setSourceFile($inputPath);
            for ($pageNum = 1; $pageNum <= $pageCount; $pageNum++) {
                $templateId = $pdf->importPage($pageNum);
                $size = $pdf->getTemplateSize($templateId);

                $pdf->AddPage($size['orientation'], [$size['width'], $size['height']]);
                $pdf->useTemplate($templateId, 0, 0, $size['width'], $size['height']);
            }

            $pdf->Output($outputPath, 'F');
            return file_exists($outputPath) && filesize($outputPath) > 0;
        } catch (\Throwable $e) {
            Log::error('FPDI compression fallback failed', ['error' => $e->getMessage()]);
            
            // Ultimate fallback: copy original file if compression failed
            if (file_exists($inputPath)) {
                return copy($inputPath, $outputPath);
            }
            return false;
        }
    }

    /**
     * Check if compression is needed based on file size threshold.
     */
    public function needsCompression(string $path, int $maxSizeMb = 25): bool
    {
        return filesize($path) > ($maxSizeMb * 1024 * 1024);
    }
}
