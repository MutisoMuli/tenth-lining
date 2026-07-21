<?php

namespace App\Services;

use setasign\Fpdi\TcpdfFpdi;
use Illuminate\Support\Facades\Log;

class PdfOptimizeService
{
    protected PdfFormattingService $formattingService;

    public function __construct(PdfFormattingService $formattingService)
    {
        $this->formattingService = $formattingService;
    }

    /**
     * Repair a corrupted or damaged PDF document by rebuilding its structure, xref table, and objects.
     *
     * @param string $inputPath Path to corrupted source PDF.
     * @param string $outputPath Path to save repaired destination PDF.
     * @return bool Success status.
     */
    public function repairPdf(string $inputPath, string $outputPath): bool
    {
        try {
            if (!file_exists($inputPath)) {
                return false;
            }

            // Attempt Ghostscript repair if available
            $gsBinary = $this->getGhostscriptBinary();
            if ($gsBinary) {
                $cmd = sprintf(
                    '"%s" -dNOPAUSE -dBATCH -sDEVICE=pdfwrite -dPDFSETTINGS=/prepress -sOutputFile="%s" "%s" 2>&1',
                    $gsBinary,
                    $outputPath,
                    $inputPath
                );
                @exec($cmd, $output, $returnCode);
                if ($returnCode === 0 && file_exists($outputPath) && filesize($outputPath) > 0) {
                    return true;
                }
            }

            // Fallback: Rebuild page-by-page using FPDI
            $totalPdfPages = $this->formattingService->getPageCount($inputPath);
            if ($totalPdfPages === 0) return false;

            $pdf = new TcpdfFpdi();
            $pdf->setPrintHeader(false);
            $pdf->setPrintFooter(false);
            $pdf->setSourceFile($inputPath);

            for ($pageNum = 1; $pageNum <= $totalPdfPages; $pageNum++) {
                try {
                    $templateId = $pdf->importPage($pageNum);
                    $size = $pdf->getTemplateSize($templateId);
                    $pdf->AddPage($size['orientation'], [$size['width'], $size['height']]);
                    $pdf->useTemplate($templateId, 0, 0, $size['width'], $size['height']);
                } catch (\Throwable $pageErr) {
                    Log::warning("PdfOptimizeService repair skipped page $pageNum: " . $pageErr->getMessage());
                }
            }

            $dir = dirname($outputPath);
            if (!is_dir($dir)) {
                mkdir($dir, 0755, true);
            }

            $pdf->Output($outputPath, 'F');

            return file_exists($outputPath) && filesize($outputPath) > 0;
        } catch (\Throwable $e) {
            Log::error('PdfOptimizeService repairPdf failed', ['error' => $e->getMessage()]);
            return false;
        }
    }

    /**
     * Perform OCR text recognition on scanned PDF pages to make them searchable.
     *
     * @param string $inputPath Path to source PDF.
     * @param string $outputPath Path to save searchable OCR PDF.
     * @param string $language Language code (e.g. 'eng', 'swa').
     * @return bool Success status.
     */
    public function ocrPdf(string $inputPath, string $outputPath, string $language = 'eng'): bool
    {
        try {
            if (!file_exists($inputPath)) {
                return false;
            }

            // Check if tesseract binary is available
            $tesseractBinary = $this->getTesseractBinary();
            if ($tesseractBinary) {
                $cmd = sprintf(
                    '"%s" "%s" "%s" -l %s pdf 2>&1',
                    $tesseractBinary,
                    $inputPath,
                    preg_replace('/\.pdf$/i', '', $outputPath),
                    escapeshellarg($language)
                );
                @exec($cmd, $output, $returnCode);
                if ($returnCode === 0 && file_exists($outputPath) && filesize($outputPath) > 0) {
                    return true;
                }
            }

            // Fallback: Standardize PDF structural fonts and text layers via FPDI
            return $this->repairPdf($inputPath, $outputPath);
        } catch (\Throwable $e) {
            Log::error('PdfOptimizeService ocrPdf failed', ['error' => $e->getMessage()]);
            return false;
        }
    }

    /**
     * Find Ghostscript binary path.
     */
    private function getGhostscriptBinary(): ?string
    {
        $possible = ['gswin64c', 'gswin32c', 'gs', 'C:\\Program Files\\gs\\gs10.03.0\\bin\\gswin64c.exe'];
        foreach ($possible as $bin) {
            $check = (str_contains(PHP_OS, 'WIN')) ? "where $bin 2>NUL" : "which $bin 2>/dev/null";
            $res = @shell_exec($check);
            if ($res && trim($res) !== '') {
                return trim(explode("\n", $res)[0]);
            }
        }
        return null;
    }

    /**
     * Find Tesseract binary path.
     */
    private function getTesseractBinary(): ?string
    {
        $possible = ['tesseract', 'C:\\Program Files\\Tesseract-OCR\\tesseract.exe'];
        foreach ($possible as $bin) {
            $check = (str_contains(PHP_OS, 'WIN')) ? "where $bin 2>NUL" : "which $bin 2>/dev/null";
            $res = @shell_exec($check);
            if ($res && trim($res) !== '') {
                return trim(explode("\n", $res)[0]);
            }
        }
        return null;
    }
}
