<?php

namespace App\Services;

use setasign\Fpdi\TcpdfFpdi;
use Illuminate\Support\Facades\Log;

class PdfFormattingService
{
    /**
     * Apply page numbering and tenth-line numbering overlays to an existing PDF.
     *
     * @param string $inputPath  Absolute path to the source PDF.
     * @param string $outputPath Absolute path to save the formatted PDF.
     * @param array  $pageNumberSettings  Configuration for page numbers.
     * @param array  $tenthLineSettings   Configuration for tenth-line numbering.
     * @param array  $lineCoordinates     Array of line Y-coordinates per page from the frontend.
     * @return bool
     */
    public function format(
        string $inputPath,
        string $outputPath,
        array $pageNumberSettings = [],
        array $tenthLineSettings = [],
        array $lineCoordinates = []
    ): bool {
        try {
            $pdf = new TcpdfFpdi();
            $pageCount = $pdf->setSourceFile($inputPath);

            for ($pageNum = 1; $pageNum <= $pageCount; $pageNum++) {
                $templateId = $pdf->importPage($pageNum);
                $size = $pdf->getTemplateSize($templateId);

                $pdf->AddPage($size['orientation'], [$size['width'], $size['height']]);
                $pdf->useTemplate($templateId, 0, 0, $size['width'], $size['height']);

                // Apply page numbering
                if (!empty($pageNumberSettings['enabled'])) {
                    $this->applyPageNumber($pdf, $pageNum, $size, $pageNumberSettings);
                }

                // Apply tenth-line numbering
                if (!empty($tenthLineSettings['enabled'])) {
                    $pageLines = $lineCoordinates[$pageNum - 1] ?? [];
                    $this->applyTenthLining($pdf, $pageLines, $size, $tenthLineSettings);
                }
            }

            $pdf->Output($outputPath, 'F');
            return true;
        } catch (\Throwable $e) {
            Log::error('PDF formatting failed', [
                'error' => $e->getMessage(),
                'input' => $inputPath,
            ]);
            return false;
        }
    }

    /**
     * Get the page count of a PDF file.
     */
    public function getPageCount(string $path): int
    {
        try {
            $pdf = new TcpdfFpdi();
            return $pdf->setSourceFile($path);
        } catch (\Throwable $e) {
            Log::error('PDF page count failed', ['error' => $e->getMessage()]);
            return 0;
        }
    }

    /**
     * Apply a page number overlay to the current page.
     */
    protected function applyPageNumber(TcpdfFpdi $pdf, int $pageNum, array $size, array $settings): void
    {
        $startingNumber = (int) ($settings['starting_number'] ?? 1);
        $displayNumber = $startingNumber + $pageNum - 1;

        $fontFamily = $this->sanitizeFont($settings['font'] ?? 'Helvetica');
        $fontSize = (int) ($settings['font_size'] ?? 12);
        $style = '';
        if (!empty($settings['bold'])) $style .= 'B';
        if (!empty($settings['italic'])) $style .= 'I';

        $pdf->SetFont($fontFamily, $style, $fontSize);

        // Parse color (hex to RGB)
        $color = $this->hexToRgb($settings['colour'] ?? '#000000');
        $pdf->SetTextColor($color[0], $color[1], $color[2]);

        // Calculate position from margin_top and margin_right (in mm)
        $marginTop = (float) ($settings['margin_top'] ?? 10);
        $marginRight = (float) ($settings['margin_right'] ?? 10);

        // Custom overrides
        $customX = $settings['custom_x'] ?? null;
        $customY = $settings['custom_y'] ?? null;

        if ($customX !== null && $customX !== '' && $customY !== null && $customY !== '') {
            $x = (float) $customX;
            $y = (float) $customY;
        } else {
            $x = $size['width'] - $marginRight;
            $y = $marginTop;
        }

        $pdf->SetXY($x, $y);
        $pdf->Cell(0, 0, (string) $displayNumber, 0, 0, 'L');
    }

    /**
     * Apply tenth-line numbering overlays to the current page.
     * Draws a horizontal line and a colored badge for every 10th line.
     */
    protected function applyTenthLining(TcpdfFpdi $pdf, array $lineYPositions, array $size, array $settings): void
    {
        if (empty($lineYPositions)) {
            return;
        }

        $fontFamily = $this->sanitizeFont($settings['font'] ?? 'Helvetica');
        $fontSize = (int) ($settings['font_size'] ?? 10);
        $style = !empty($settings['bold']) ? 'B' : '';
        $rightMargin = (float) ($settings['right_margin'] ?? 10);
        $topOffset = (float) ($settings['top_offset'] ?? 0);

        $color = $this->hexToRgb($settings['colour'] ?? '#000000');
        $lineColorHex = $settings['line_colour'] ?? $settings['colour'] ?? '#000000';
        $lineColor = $this->hexToRgb($lineColorHex);
        $lineThickness = (float) ($settings['line_thickness'] ?? 0.3);
        $customLineLength = (float) ($settings['line_length'] ?? 0);

        // Number every 10th line
        $lineNumber = 0;
        foreach ($lineYPositions as $yPercent) {
            $lineNumber++;
            if ($lineNumber % 10 === 0) {
                // Convert Y from percentage of page height to mm
                $y = ($yPercent / 100) * $size['height'] + $topOffset;

                // ── Draw horizontal line ──
                $lineEndX = $size['width'] - $rightMargin;
                if ($customLineLength > 0) {
                    $lineStartX = max(0, $lineEndX - $customLineLength);
                } else {
                    $lineStartX = $size['width'] * 0.55; // Default ~55% of page width
                }

                $pdf->SetDrawColor($lineColor[0], $lineColor[1], $lineColor[2]);
                $pdf->SetLineWidth($lineThickness);
                $pdf->Line($lineStartX, $y, $lineEndX, $y);

                $showBadge = $settings['show_badge'] ?? true;

                if ($showBadge) {
                    // ── Draw badge rectangle ──
                    $badgeWidth = $fontSize * 0.6 + 4; // approximate width based on font size
                    $badgeHeight = $fontSize * 0.4 + 2;
                    $badgeX = $lineEndX;
                    $badgeY = $y - ($badgeHeight / 2);

                    $pdf->SetFillColor($color[0], $color[1], $color[2]);
                    $pdf->Rect($badgeX, $badgeY, $badgeWidth, $badgeHeight, 'F');

                    // ── Draw line number text in white inside the badge ──
                    $pdf->SetFont($fontFamily, $style, $fontSize);
                    $pdf->SetTextColor(255, 255, 255);
                    $pdf->SetXY($badgeX, $badgeY);
                    $pdf->Cell($badgeWidth, $badgeHeight, (string) $lineNumber, 0, 0, 'C');

                    // Reset text color for subsequent elements
                    $pdf->SetTextColor($color[0], $color[1], $color[2]);
                } else {
                    // ── Draw line number text without badge background ──
                    $badgeWidth = $fontSize * 0.6 + 4;
                    $badgeHeight = $fontSize * 0.4 + 2;
                    $badgeX = $lineEndX;
                    $badgeY = $y - ($badgeHeight / 2);

                    $pdf->SetFont($fontFamily, $style, $fontSize);
                    $pdf->SetTextColor($color[0], $color[1], $color[2]);
                    $pdf->SetXY($badgeX, $badgeY);
                    $pdf->Cell($badgeWidth, $badgeHeight, (string) $lineNumber, 0, 0, 'C');
                }
            }
        }
    }

    /**
     * Calculate the default position for page numbers (legacy fallback).
     */
    protected function calculatePageNumberPosition(string $position, array $size, int $fontSize): array
    {
        $margin = 10;
        $fontHeight = $fontSize * 0.35; // Approximate mm height

        return match ($position) {
            'top-left' => [$margin, $margin + $fontHeight],
            'top-right' => [$size['width'] - $margin - 20, $margin + $fontHeight],
            'bottom-left' => [$margin, $size['height'] - $margin],
            'bottom-right' => [$size['width'] - $margin - 20, $size['height'] - $margin],
            default => [$size['width'] - $margin - 20, $margin + $fontHeight], // top-right
        };
    }

    /**
     * Convert hex color to RGB array.
     */
    protected function hexToRgb(string $hex): array
    {
        $hex = ltrim($hex, '#');
        if (strlen($hex) === 3) {
            $hex = $hex[0] . $hex[0] . $hex[1] . $hex[1] . $hex[2] . $hex[2];
        }
        return [
            hexdec(substr($hex, 0, 2)),
            hexdec(substr($hex, 2, 2)),
            hexdec(substr($hex, 4, 2)),
        ];
    }

    /**
     * Sanitize font name to FPDI-compatible values.
     */
    protected function sanitizeFont(string $font): string
    {
        return match ($font) {
            'Times', 'Merriweather', 'Playfair', 'Georgia' => 'Times',
            'Courier', 'FiraCode' => 'Courier',
            default => 'Helvetica',
        };
    }
}
