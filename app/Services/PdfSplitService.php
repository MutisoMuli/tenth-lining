<?php

namespace App\Services;

use setasign\Fpdi\TcpdfFpdi;
use Illuminate\Support\Facades\Log;
use ZipArchive;

class PdfSplitService
{
    /**
     * Split a PDF by custom page ranges and package into a ZIP archive if multiple files.
     *
     * @param string $inputPath Path to source PDF.
     * @param array  $ranges    Array of ranges, e.g. [['from' => 1, 'to' => 5], ['from' => 6, 'to' => 10]].
     * @param string $outputDir Directory to store output files.
     * @return string|null Path to generated output file (.zip or .pdf), or null on failure.
     */
    public function splitByRanges(string $inputPath, array $ranges, string $outputDir): ?string
    {
        try {
            if (!file_exists($inputPath) || empty($ranges)) {
                return null;
            }

            if (!is_dir($outputDir)) {
                mkdir($outputDir, 0755, true);
            }

            $formatter = new PdfFormattingService();
            $totalPdfPages = $formatter->getPageCount($inputPath);
            if ($totalPdfPages === 0) return null;

            $generatedFiles = [];

            foreach ($ranges as $index => $range) {
                $from = max(1, min($totalPdfPages, (int)($range['from'] ?? 1)));
                $to = max($from, min($totalPdfPages, (int)($range['to'] ?? $totalPdfPages)));

                $outputPdfName = sprintf("split_range_%d_to_%d.pdf", $from, $to);
                $outputPdfPath = $outputDir . '/' . $outputPdfName;

                $pdf = new TcpdfFpdi();
                $pdf->setPrintHeader(false);
                $pdf->setPrintFooter(false);
                $pdf->setSourceFile($inputPath);

                for ($pageNum = $from; $pageNum <= $to; $pageNum++) {
                    $templateId = $pdf->importPage($pageNum);
                    $size = $pdf->getTemplateSize($templateId);
                    $pdf->AddPage($size['orientation'], [$size['width'], $size['height']]);
                    $pdf->useTemplate($templateId, 0, 0, $size['width'], $size['height']);
                }

                $pdf->Output($outputPdfPath, 'F');

                if (file_exists($outputPdfPath) && filesize($outputPdfPath) > 0) {
                    $generatedFiles[] = [
                        'name' => $outputPdfName,
                        'path' => $outputPdfPath,
                    ];
                }
            }

            if (empty($generatedFiles)) {
                return null;
            }

            // If only 1 PDF file was generated, return that PDF directly
            if (count($generatedFiles) === 1) {
                return $generatedFiles[0]['path'];
            }

            // Otherwise package all generated PDFs into a ZIP archive
            $zipPath = $outputDir . '/split_documents.zip';
            $zip = new ZipArchive();

            if ($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) === true) {
                foreach ($generatedFiles as $item) {
                    $zip->addFile($item['path'], $item['name']);
                }
                $zip->close();
                return $zipPath;
            }

            return $generatedFiles[0]['path'];
        } catch (\Throwable $e) {
            Log::error('PdfSplitService splitByRanges failed', ['error' => $e->getMessage()]);
            return null;
        }
    }

    /**
     * Extract all pages into individual 1-page PDF files packaged in a ZIP archive.
     */
    public function extractAllPages(string $inputPath, string $outputDir): ?string
    {
        try {
            $formatter = new PdfFormattingService();
            $totalPdfPages = $formatter->getPageCount($inputPath);
            if ($totalPdfPages === 0) return null;

            $ranges = [];
            for ($i = 1; $i <= $totalPdfPages; $i++) {
                $ranges[] = ['from' => $i, 'to' => $i];
            }

            return $this->splitByRanges($inputPath, $ranges, $outputDir);
        } catch (\Throwable $e) {
            Log::error('PdfSplitService extractAllPages failed', ['error' => $e->getMessage()]);
            return null;
        }
    }

    /**
     * Extract specific page numbers into a single new PDF document.
     */
    public function extractPages(string $inputPath, array $pageNumbers, string $outputDir): ?string
    {
        try {
            if (!file_exists($inputPath) || empty($pageNumbers)) {
                return null;
            }

            if (!is_dir($outputDir)) {
                mkdir($outputDir, 0755, true);
            }

            $formatter = new PdfFormattingService();
            $totalPdfPages = $formatter->getPageCount($inputPath);
            if ($totalPdfPages === 0) return null;

            $validPages = array_filter($pageNumbers, fn($p) => is_numeric($p) && $p >= 1 && $p <= $totalPdfPages);
            if (empty($validPages)) return null;

            $outputPdfPath = $outputDir . '/extracted_pages.pdf';

            $pdf = new TcpdfFpdi();
            $pdf->setPrintHeader(false);
            $pdf->setPrintFooter(false);
            $pdf->setSourceFile($inputPath);

            foreach ($validPages as $pageNum) {
                $templateId = $pdf->importPage((int)$pageNum);
                $size = $pdf->getTemplateSize($templateId);
                $pdf->AddPage($size['orientation'], [$size['width'], $size['height']]);
                $pdf->useTemplate($templateId, 0, 0, $size['width'], $size['height']);
            }

            $pdf->Output($outputPdfPath, 'F');
            return file_exists($outputPdfPath) ? $outputPdfPath : null;
        } catch (\Throwable $e) {
            Log::error('PdfSplitService extractPages failed', ['error' => $e->getMessage()]);
            return null;
        }
    }
}
