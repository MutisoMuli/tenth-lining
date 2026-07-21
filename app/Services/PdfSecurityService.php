<?php

namespace App\Services;

use setasign\Fpdi\TcpdfFpdi;
use Illuminate\Support\Facades\Log;

class PdfSecurityService
{
    protected PdfFormattingService $formattingService;

    public function __construct(PdfFormattingService $formattingService)
    {
        $this->formattingService = $formattingService;
    }

    /**
     * Unlock PDF (re-write PDF without protection restrictions).
     */
    public function unlockPdf(string $inputPath, ?string $password, string $outputPath): bool
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
            }

            $dir = dirname($outputPath);
            if (!is_dir($dir)) mkdir($dir, 0755, true);

            $pdf->Output($outputPath, 'F');
            return file_exists($outputPath);
        } catch (\Throwable $e) {
            Log::error('PdfSecurityService::unlockPdf exception', ['error' => $e->getMessage()]);
            return false;
        }
    }

    /**
     * Protect PDF (encrypt PDF with user password).
     */
    public function protectPdf(string $inputPath, string $password, string $outputPath): bool
    {
        try {
            if (!file_exists($inputPath)) return false;

            $totalPdfPages = $this->formattingService->getPageCount($inputPath);
            if ($totalPdfPages === 0) return false;

            $pdf = new TcpdfFpdi();
            $pdf->setPrintHeader(false);
            $pdf->setPrintFooter(false);

            // Set encryption protection password
            $pdf->SetProtection(['print', 'copy'], $password, $password);

            $pdf->setSourceFile($inputPath);

            for ($pageNum = 1; $pageNum <= $totalPdfPages; $pageNum++) {
                $templateId = $pdf->importPage($pageNum);
                $size = $pdf->getTemplateSize($templateId);

                $pdf->AddPage($size['orientation'], [$size['width'], $size['height']]);
                $pdf->useTemplate($templateId, 0, 0, $size['width'], $size['height']);
            }

            $dir = dirname($outputPath);
            if (!is_dir($dir)) mkdir($dir, 0755, true);

            $pdf->Output($outputPath, 'F');
            return file_exists($outputPath);
        } catch (\Throwable $e) {
            Log::error('PdfSecurityService::protectPdf exception', ['error' => $e->getMessage()]);
            return false;
        }
    }

    /**
     * Sign PDF (overlay signature image or text onto document).
     */
    public function signPdf(string $inputPath, array $signatureData, string $outputPath): bool
    {
        try {
            if (!file_exists($inputPath)) return false;

            $totalPdfPages = $this->formattingService->getPageCount($inputPath);
            if ($totalPdfPages === 0) return false;

            $pdf = new TcpdfFpdi();
            $pdf->setPrintHeader(false);
            $pdf->setPrintFooter(false);
            $pdf->setSourceFile($inputPath);

            $targetPage = (int)($signatureData['page'] ?? $totalPdfPages);
            $sigType = $signatureData['type'] ?? 'text'; // 'text' or 'image'
            $sigContent = $signatureData['content'] ?? 'Digital Signature';

            for ($pageNum = 1; $pageNum <= $totalPdfPages; $pageNum++) {
                $templateId = $pdf->importPage($pageNum);
                $size = $pdf->getTemplateSize($templateId);

                $pdf->AddPage($size['orientation'], [$size['width'], $size['height']]);
                $pdf->useTemplate($templateId, 0, 0, $size['width'], $size['height']);

                if ($pageNum === $targetPage) {
                    if ($sigType === 'image' && str_starts_with($sigContent, 'data:image')) {
                        // Base64 PNG signature image
                        $imgData = preg_replace('#^data:image/\w+;base64,#i', '', $sigContent);
                        $imgData = base64_decode($imgData);
                        $tmpFile = tempnam(sys_get_temp_dir(), 'sig_') . '.png';
                        file_put_contents($tmpFile, $imgData);

                        $x = (float)($signatureData['x'] ?? ($size['width'] - 65));
                        $y = (float)($signatureData['y'] ?? ($size['height'] - 45));
                        $pdf->Image($tmpFile, $x, $y, 50, 25, 'PNG');
                        @unlink($tmpFile);
                    } else {
                        // Text / Name Signature box
                        $x = (float)($signatureData['x'] ?? ($size['width'] - 75));
                        $y = (float)($signatureData['y'] ?? ($size['height'] - 35));

                        $pdf->SetFont('helvetica', 'B', 11);
                        $pdf->SetTextColor(15, 23, 42);
                        $pdf->SetFillColor(248, 250, 252);
                        $pdf->SetDrawColor(99, 102, 241);
                        $pdf->Rect($x, $y, 65, 22, 'DF');

                        $pdf->SetXY($x + 2, $y + 3);
                        $pdf->Cell(61, 6, 'Digitally Signed by:', 0, 1, 'L');
                        $pdf->SetFont('helvetica', 'BI', 12);
                        $pdf->SetTextColor(99, 102, 241);
                        $pdf->SetX($x + 2);
                        $pdf->Cell(61, 8, $sigContent, 0, 1, 'L');
                    }
                }
            }

            $dir = dirname($outputPath);
            if (!is_dir($dir)) mkdir($dir, 0755, true);

            $pdf->Output($outputPath, 'F');
            return file_exists($outputPath);
        } catch (\Throwable $e) {
            Log::error('PdfSecurityService::signPdf exception', ['error' => $e->getMessage()]);
            return false;
        }
    }

    /**
     * Redact PDF (blackout sensitive areas).
     */
    public function redactPdf(string $inputPath, array $redactions, string $outputPath): bool
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

                // Apply redaction rectangles for this page
                foreach ($redactions as $red) {
                    $rPage = (int)($red['page'] ?? 1);
                    if ($rPage === $pageNum || $rPage === 0) {
                        $x = (float)($red['x'] ?? 20);
                        $y = (float)($red['y'] ?? 50);
                        $w = (float)($red['w'] ?? ($size['width'] - 40));
                        $h = (float)($red['h'] ?? 15);

                        $pdf->SetFillColor(0, 0, 0);
                        $pdf->Rect($x, $y, $w, $h, 'F');
                    }
                }
            }

            $dir = dirname($outputPath);
            if (!is_dir($dir)) mkdir($dir, 0755, true);

            $pdf->Output($outputPath, 'F');
            return file_exists($outputPath);
        } catch (\Throwable $e) {
            Log::error('PdfSecurityService::redactPdf exception', ['error' => $e->getMessage()]);
            return false;
        }
    }

    /**
     * Compare two PDFs side-by-side into a single comparison PDF.
     */
    public function comparePdf(string $inputPath1, string $inputPath2, string $outputPath): bool
    {
        try {
            if (!file_exists($inputPath1) || !file_exists($inputPath2)) return false;

            $pages1 = $this->formattingService->getPageCount($inputPath1);
            $pages2 = $this->formattingService->getPageCount($inputPath2);
            $maxPages = max($pages1, $pages2);

            $pdf = new TcpdfFpdi();
            $pdf->setPrintHeader(false);
            $pdf->setPrintFooter(false);

            for ($pageNum = 1; $pageNum <= $maxPages; $pageNum++) {
                $pdf->AddPage('L', 'A4'); // Landscape for side-by-side
                $pageWidth = $pdf->getPageWidth();
                $halfWidth = ($pageWidth - 30) / 2;

                // Render File 1 on Left
                if ($pageNum <= $pages1) {
                    $pdf->setSourceFile($inputPath1);
                    $tpl1 = $pdf->importPage($pageNum);
                    $size1 = $pdf->getTemplateSize($tpl1);
                    $pdf->SetXY(10, 10);
                    $pdf->SetFont('helvetica', 'B', 9);
                    $pdf->SetTextColor(71, 85, 105);
                    $pdf->Cell($halfWidth, 5, "Document A - Page {$pageNum}", 0, 1, 'L');
                    $pdf->useTemplate($tpl1, 10, 18, $halfWidth, 0);
                }

                // Render File 2 on Right
                if ($pageNum <= $pages2) {
                    $pdf->setSourceFile($inputPath2);
                    $tpl2 = $pdf->importPage($pageNum);
                    $size2 = $pdf->getTemplateSize($tpl2);
                    $rightX = 20 + $halfWidth;
                    $pdf->SetXY($rightX, 10);
                    $pdf->SetFont('helvetica', 'B', 9);
                    $pdf->SetTextColor(71, 85, 105);
                    $pdf->Cell($halfWidth, 5, "Document B - Page {$pageNum}", 0, 1, 'L');
                    $pdf->useTemplate($tpl2, $rightX, 18, $halfWidth, 0);
                }
            }

            $dir = dirname($outputPath);
            if (!is_dir($dir)) mkdir($dir, 0755, true);

            $pdf->Output($outputPath, 'F');
            return file_exists($outputPath);
        } catch (\Throwable $e) {
            Log::error('PdfSecurityService::comparePdf exception', ['error' => $e->getMessage()]);
            return false;
        }
    }
}
