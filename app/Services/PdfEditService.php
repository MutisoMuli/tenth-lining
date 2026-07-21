<?php

namespace App\Services;

use setasign\Fpdi\TcpdfFpdi;
use Illuminate\Support\Facades\Log;

class PdfEditService
{
    protected PdfFormattingService $formattingService;

    public function __construct(PdfFormattingService $formattingService)
    {
        $this->formattingService = $formattingService;
    }

    /**
     * Rotate pages of a PDF document by a given angle (90, 180, 270 degrees).
     */
    public function rotatePdf(string $inputPath, int $angle, string $outputPath): bool
    {
        try {
            if (!file_exists($inputPath)) return false;

            $totalPdfPages = $this->formattingService->getPageCount($inputPath);
            if ($totalPdfPages === 0) return false;

            $angle = ($angle % 360 + 360) % 360;

            $pdf = new TcpdfFpdi();
            $pdf->setPrintHeader(false);
            $pdf->setPrintFooter(false);
            $pdf->setSourceFile($inputPath);

            for ($pageNum = 1; $pageNum <= $totalPdfPages; $pageNum++) {
                $templateId = $pdf->importPage($pageNum);
                $size = $pdf->getTemplateSize($templateId);

                $orientation = $size['orientation'];
                if ($angle == 90 || $angle == 270) {
                    $orientation = ($orientation === 'P') ? 'L' : 'P';
                }

                $pdf->AddPage($orientation, [$size['width'], $size['height']]);

                if ($angle != 0) {
                    $pdf->StartTransform();
                    $pdf->Rotate($angle, $size['width'] / 2, $size['height'] / 2);
                }

                $pdf->useTemplate($templateId, 0, 0, $size['width'], $size['height']);

                if ($angle != 0) {
                    $pdf->StopTransform();
                }
            }

            $dir = dirname($outputPath);
            if (!is_dir($dir)) mkdir($dir, 0755, true);

            $pdf->Output($outputPath, 'F');
            return file_exists($outputPath) && filesize($outputPath) > 0;
        } catch (\Throwable $e) {
            Log::error('PdfEditService rotatePdf failed', ['error' => $e->getMessage()]);
            return false;
        }
    }

    /**
     * Add watermark text or image to a PDF.
     */
    public function addWatermark(string $inputPath, string $watermarkText, string $outputPath, int $rotation = 45, float $opacity = 0.3): bool
    {
        try {
            if (!file_exists($inputPath)) return false;

            $totalPdfPages = $this->formattingService->getPageCount($inputPath);
            if ($totalPdfPages === 0) return false;

            $pdf = new TcpdfFpdi();
            $pdf->setPrintHeader(false);
            $pdf->setPrintFooter(false);
            $pdf->setSourceFile($inputPath);

            for ($pageNum = 1; $pageNum <= $totalPdfPages; $pageNum++) {
                $templateId = $pdf->importPage($pageNum);
                $size = $pdf->getTemplateSize($templateId);

                $pdf->AddPage($size['orientation'], [$size['width'], $size['height']]);
                $pdf->useTemplate($templateId, 0, 0, $size['width'], $size['height']);

                // Watermark text overlay
                $pdf->SetAlpha($opacity);
                $pdf->SetFont('helvetica', 'B', 36);
                $pdf->SetTextColor(150, 150, 150);

                $pdf->StartTransform();
                $pdf->Rotate($rotation, $size['width'] / 2, $size['height'] / 2);
                $pdf->Text($size['width'] / 4, $size['height'] / 2, $watermarkText);
                $pdf->StopTransform();
                $pdf->SetAlpha(1.0);
            }

            $dir = dirname($outputPath);
            if (!is_dir($dir)) mkdir($dir, 0755, true);

            $pdf->Output($outputPath, 'F');
            return file_exists($outputPath) && filesize($outputPath) > 0;
        } catch (\Throwable $e) {
            Log::error('PdfEditService addWatermark failed', ['error' => $e->getMessage()]);
            return false;
        }
    }

    /**
     * Add page numbers to a PDF document.
     */
    public function addPageNumbers(string $inputPath, array $settings, string $outputPath): bool
    {
        try {
            if (!file_exists($inputPath)) return false;

            $totalPdfPages = $this->formattingService->getPageCount($inputPath);
            if ($totalPdfPages === 0) return false;

            $startNum = (int)($settings['start_number'] ?? 1);
            $position = $settings['position'] ?? 'bottom-center'; // top-right, bottom-center, etc.
            $fontSize = (int)($settings['font_size'] ?? 10);

            $pdf = new TcpdfFpdi();
            $pdf->setPrintHeader(false);
            $pdf->setPrintFooter(false);
            $pdf->setSourceFile($inputPath);

            for ($pageNum = 1; $pageNum <= $totalPdfPages; $pageNum++) {
                $templateId = $pdf->importPage($pageNum);
                $size = $pdf->getTemplateSize($templateId);

                $pdf->AddPage($size['orientation'], [$size['width'], $size['height']]);
                $pdf->useTemplate($templateId, 0, 0, $size['width'], $size['height']);

                $pdf->SetFont('helvetica', '', $fontSize);
                $pdf->SetTextColor(0, 0, 0);

                $displayNum = $startNum + ($pageNum - 1);
                $text = "Page $displayNum of $totalPdfPages";

                $x = $size['width'] / 2 - 15;
                $y = $size['height'] - 15;

                if ($position === 'top-right') {
                    $x = $size['width'] - 35;
                    $y = 12;
                } elseif ($position === 'bottom-right') {
                    $x = $size['width'] - 35;
                    $y = $size['height'] - 15;
                }

                $pdf->Text($x, $y, $text);
            }

            $dir = dirname($outputPath);
            if (!is_dir($dir)) mkdir($dir, 0755, true);

            $pdf->Output($outputPath, 'F');
            return file_exists($outputPath) && filesize($outputPath) > 0;
        } catch (\Throwable $e) {
            Log::error('PdfEditService addPageNumbers failed', ['error' => $e->getMessage()]);
            return false;
        }
    }

    /**
     * Crop PDF page margins (top, bottom, left, right in mm).
     */
    public function cropPdf(string $inputPath, array $cropMargins, string $outputPath): bool
    {
        try {
            if (!file_exists($inputPath)) return false;

            $totalPdfPages = $this->formattingService->getPageCount($inputPath);
            if ($totalPdfPages === 0) return false;

            $top = (float)($cropMargins['top'] ?? 10);
            $bottom = (float)($cropMargins['bottom'] ?? 10);
            $left = (float)($cropMargins['left'] ?? 10);
            $right = (float)($cropMargins['right'] ?? 10);

            $pdf = new TcpdfFpdi();
            $pdf->setPrintHeader(false);
            $pdf->setPrintFooter(false);
            $pdf->setSourceFile($inputPath);

            for ($pageNum = 1; $pageNum <= $totalPdfPages; $pageNum++) {
                $templateId = $pdf->importPage($pageNum);
                $size = $pdf->getTemplateSize($templateId);

                $newWidth = max(20, $size['width'] - ($left + $right));
                $newHeight = max(20, $size['height'] - ($top + $bottom));

                $pdf->AddPage($size['orientation'], [$newWidth, $newHeight]);
                $pdf->useTemplate($templateId, -$left, -$top, $size['width'], $size['height']);
            }

            $dir = dirname($outputPath);
            if (!is_dir($dir)) mkdir($dir, 0755, true);

            $pdf->Output($outputPath, 'F');
            return file_exists($outputPath) && filesize($outputPath) > 0;
        } catch (\Throwable $e) {
            Log::error('PdfEditService cropPdf failed', ['error' => $e->getMessage()]);
            return false;
        }
    }

    /**
     * Edit PDF (Add custom text annotations / signature).
     */
    public function editPdf(string $inputPath, array $annotations, string $outputPath): bool
    {
        try {
            if (!file_exists($inputPath)) return false;

            $totalPdfPages = $this->formattingService->getPageCount($inputPath);
            if ($totalPdfPages === 0) return false;

            $pdf = new TcpdfFpdi();
            $pdf->setPrintHeader(false);
            $pdf->setPrintFooter(false);
            $pdf->setSourceFile($inputPath);

            for ($pageNum = 1; $pageNum <= $totalPdfPages; $pageNum++) {
                $templateId = $pdf->importPage($pageNum);
                $size = $pdf->getTemplateSize($templateId);

                $pdf->AddPage($size['orientation'], [$size['width'], $size['height']]);
                $pdf->useTemplate($templateId, 0, 0, $size['width'], $size['height']);

                // Add annotations for this page
                foreach ($annotations as $ann) {
                    if (($ann['page'] ?? 1) == $pageNum) {
                        $pdf->SetFont('helvetica', 'B', (int)($ann['size'] ?? 12));
                        $pdf->SetTextColor(0, 0, 0);
                        $pdf->Text((float)($ann['x'] ?? 20), (float)($ann['y'] ?? 20), (string)($ann['text'] ?? ''));
                    }
                }
            }

            $dir = dirname($outputPath);
            if (!is_dir($dir)) mkdir($dir, 0755, true);

            $pdf->Output($outputPath, 'F');
            return file_exists($outputPath) && filesize($outputPath) > 0;
        } catch (\Throwable $e) {
            Log::error('PdfEditService editPdf failed', ['error' => $e->getMessage()]);
            return false;
        }
    }
}
