<?php

namespace App\Services;

use setasign\Fpdi\TcpdfFpdi;
use Illuminate\Support\Facades\Log;

class PdfMergeService
{
    /**
     * Merge multiple PDF files into a single output PDF.
     *
     * @param array  $inputPaths  Array of absolute paths to source PDF files in sequence.
     * @param string $outputPath  Absolute path to save the merged PDF.
     * @return bool
     */
    public function merge(array $inputPaths, string $outputPath): bool
    {
        try {
            if (empty($inputPaths)) {
                return false;
            }

            // Ensure output directory exists
            $dir = dirname($outputPath);
            if (!is_dir($dir)) {
                mkdir($dir, 0755, true);
            }

            $pdf = new TcpdfFpdi();
            $pdf->setPrintHeader(false);
            $pdf->setPrintFooter(false);

            foreach ($inputPaths as $filePath) {
                if (!file_exists($filePath)) {
                    Log::warning('PdfMergeService: File missing', ['path' => $filePath]);
                    continue;
                }

                $pageCount = $pdf->setSourceFile($filePath);
                for ($pageNum = 1; $pageNum <= $pageCount; $pageNum++) {
                    $templateId = $pdf->importPage($pageNum);
                    $size = $pdf->getTemplateSize($templateId);

                    $pdf->AddPage($size['orientation'], [$size['width'], $size['height']]);
                    $pdf->useTemplate($templateId, 0, 0, $size['width'], $size['height']);
                }
            }

            $pdf->Output($outputPath, 'F');
            return file_exists($outputPath) && filesize($outputPath) > 0;
        } catch (\Throwable $e) {
            Log::error('PdfMergeService failed', [
                'error' => $e->getMessage(),
                'inputPaths' => $inputPaths,
                'outputPath' => $outputPath
            ]);
            return false;
        }
    }

    /**
     * Calculate total page count for a list of PDF files.
     *
     * @param array $filePaths Array of absolute paths to PDF files.
     * @return int
     */
    public function getTotalPageCount(array $filePaths): int
    {
        $total = 0;
        $formatter = new PdfFormattingService();

        foreach ($filePaths as $path) {
            if (file_exists($path)) {
                $total += $formatter->getPageCount($path);
            }
        }

        return $total;
    }
}
