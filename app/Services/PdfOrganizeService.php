<?php

namespace App\Services;

use setasign\Fpdi\TcpdfFpdi;
use Illuminate\Support\Facades\Log;

class PdfOrganizeService
{
    /**
     * Remove specified pages from a PDF and save to output path.
     *
     * @param string $inputPath Path to source PDF.
     * @param array  $pagesToRemove Array of 1-indexed page numbers to remove.
     * @param string $outputPath Path to save destination PDF.
     * @return bool Success status.
     */
    public function removePages(string $inputPath, array $pagesToRemove, string $outputPath): bool
    {
        try {
            if (!file_exists($inputPath)) {
                return false;
            }

            $formatter = new PdfFormattingService();
            $totalPdfPages = $formatter->getPageCount($inputPath);
            if ($totalPdfPages === 0) return false;

            $pagesToRemove = array_map('intval', $pagesToRemove);

            $pdf = new TcpdfFpdi();
            $pdf->setPrintHeader(false);
            $pdf->setPrintFooter(false);
            $pdf->setSourceFile($inputPath);

            $pagesKept = 0;

            for ($pageNum = 1; $pageNum <= $totalPdfPages; $pageNum++) {
                if (in_array($pageNum, $pagesToRemove, true)) {
                    continue; // Skip pages specified for removal
                }

                $templateId = $pdf->importPage($pageNum);
                $size = $pdf->getTemplateSize($templateId);
                $pdf->AddPage($size['orientation'], [$size['width'], $size['height']]);
                $pdf->useTemplate($templateId, 0, 0, $size['width'], $size['height']);
                $pagesKept++;
            }

            if ($pagesKept === 0) {
                return false; // Cannot remove all pages
            }

            $dir = dirname($outputPath);
            if (!is_dir($dir)) {
                mkdir($dir, 0755, true);
            }

            $pdf->Output($outputPath, 'F');

            return file_exists($outputPath) && filesize($outputPath) > 0;
        } catch (\Throwable $e) {
            Log::error('PdfOrganizeService removePages failed', ['error' => $e->getMessage()]);
            return false;
        }
    }

    /**
     * Extract specific pages from a PDF document.
     *
     * @param string $inputPath Path to source PDF.
     * @param array  $pagesToKeep Array of 1-indexed page numbers to extract.
     * @param string $outputPath Path to save destination PDF.
     * @return bool Success status.
     */
    public function extractPages(string $inputPath, array $pagesToKeep, string $outputPath): bool
    {
        try {
            if (!file_exists($inputPath) || empty($pagesToKeep)) {
                return false;
            }

            $formatter = new PdfFormattingService();
            $totalPdfPages = $formatter->getPageCount($inputPath);
            if ($totalPdfPages === 0) return false;

            $pdf = new TcpdfFpdi();
            $pdf->setPrintHeader(false);
            $pdf->setPrintFooter(false);
            $pdf->setSourceFile($inputPath);

            $pagesAdded = 0;

            foreach ($pagesToKeep as $pageNum) {
                $pageNum = (int)$pageNum;
                if ($pageNum < 1 || $pageNum > $totalPdfPages) continue;

                $templateId = $pdf->importPage($pageNum);
                $size = $pdf->getTemplateSize($templateId);
                $pdf->AddPage($size['orientation'], [$size['width'], $size['height']]);
                $pdf->useTemplate($templateId, 0, 0, $size['width'], $size['height']);
                $pagesAdded++;
            }

            if ($pagesAdded === 0) return false;

            $dir = dirname($outputPath);
            if (!is_dir($dir)) {
                mkdir($dir, 0755, true);
            }

            $pdf->Output($outputPath, 'F');

            return file_exists($outputPath) && filesize($outputPath) > 0;
        } catch (\Throwable $e) {
            Log::error('PdfOrganizeService extractPages failed', ['error' => $e->getMessage()]);
            return false;
        }
    }

    /**
     * Re-order and rotate pages in a PDF document based on page operations.
     *
     * @param string $inputPath Path to source PDF.
     * @param array  $operations Array of page objects, e.g. [['page' => 2, 'rotate' => 90], ['page' => 1, 'rotate' => 0]].
     * @param string $outputPath Path to save destination PDF.
     * @return bool Success status.
     */
    public function reorderAndRotate(string $inputPath, array $operations, string $outputPath): bool
    {
        try {
            if (!file_exists($inputPath) || empty($operations)) {
                return false;
            }

            $formatter = new PdfFormattingService();
            $totalPdfPages = $formatter->getPageCount($inputPath);
            if ($totalPdfPages === 0) return false;

            $pdf = new TcpdfFpdi();
            $pdf->setPrintHeader(false);
            $pdf->setPrintFooter(false);
            $pdf->setSourceFile($inputPath);

            $pagesAdded = 0;

            foreach ($operations as $op) {
                $pageNum = (int)($op['page'] ?? 0);
                $rotate = (int)($op['rotate'] ?? 0);

                if ($pageNum < 1 || $pageNum > $totalPdfPages) continue;

                $templateId = $pdf->importPage($pageNum);
                $size = $pdf->getTemplateSize($templateId);

                $orientation = $size['orientation'];
                if ($rotate == 90 || $rotate == 270) {
                    $orientation = ($orientation === 'P') ? 'L' : 'P';
                }

                $pdf->AddPage($orientation, [$size['width'], $size['height']]);

                if ($rotate != 0) {
                    $pdf->StartTransform();
                    $pdf->Rotate($rotate, $size['width'] / 2, $size['height'] / 2);
                }

                $pdf->useTemplate($templateId, 0, 0, $size['width'], $size['height']);

                if ($rotate != 0) {
                    $pdf->StopTransform();
                }

                $pagesAdded++;
            }

            if ($pagesAdded === 0) return false;

            $dir = dirname($outputPath);
            if (!is_dir($dir)) {
                mkdir($dir, 0755, true);
            }

            $pdf->Output($outputPath, 'F');

            return file_exists($outputPath) && filesize($outputPath) > 0;
        } catch (\Throwable $e) {
            Log::error('PdfOrganizeService reorderAndRotate failed', ['error' => $e->getMessage()]);
            return false;
        }
    }

    /**
     * Convert an array of scanned images into a multi-page PDF document.
     *
     * @param array  $imagePaths Array of paths to uploaded image files.
     * @param string $outputPath Destination path for generated PDF.
     * @return bool Success status.
     */
    public function scanImagesToPdf(array $imagePaths, string $outputPath): bool
    {
        try {
            if (empty($imagePaths)) return false;

            $pdf = new TcpdfFpdi();
            $pdf->setPrintHeader(false);
            $pdf->setPrintFooter(false);

            $imagesAdded = 0;

            foreach ($imagePaths as $imgPath) {
                if (!file_exists($imgPath)) continue;

                $imgSize = @getimagesize($imgPath);
                if (!$imgSize) continue;

                $width = $imgSize[0];
                $height = $imgSize[1];
                $orientation = ($width > $height) ? 'L' : 'P';

                // Convert px to mm (72 dpi conversion or fit A4)
                $pageWidth = 210;
                $pageHeight = 297;

                if ($orientation === 'L') {
                    $pageWidth = 297;
                    $pageHeight = 210;
                }

                $pdf->AddPage($orientation, [$pageWidth, $pageHeight]);
                $pdf->Image($imgPath, 0, 0, $pageWidth, $pageHeight, '', '', '', false, 300, '', false, false, 0);
                $imagesAdded++;
            }

            if ($imagesAdded === 0) return false;

            $dir = dirname($outputPath);
            if (!is_dir($dir)) {
                mkdir($dir, 0755, true);
            }

            $pdf->Output($outputPath, 'F');

            return file_exists($outputPath) && filesize($outputPath) > 0;
        } catch (\Throwable $e) {
            Log::error('PdfOrganizeService scanImagesToPdf failed', ['error' => $e->getMessage()]);
            return false;
        }
    }
}
