<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use setasign\Fpdi\TcpdfFpdi;
use Symfony\Component\Process\Process;
use ZipArchive;

class PdfConvertService
{
    protected string $libreOfficePath;
    protected string $ghostscriptPath;

    public function __construct()
    {
        $this->libreOfficePath = config('services.libreoffice.path', 'soffice');
        $this->ghostscriptPath = config('services.ghostscript.path', 'gs');
    }

    /**
     * Convert Image files (JPG, PNG) to PDF document using TCPDF.
     */
    public function jpgToPdf(array $imagePaths, string $outputPath): bool
    {
        try {
            $pdf = new TcpdfFpdi();
            $pdf->setPrintHeader(false);
            $pdf->setPrintFooter(false);
            $pdf->SetMargins(0, 0, 0);
            $pdf->SetAutoPageBreak(false, 0);

            foreach ($imagePaths as $imgPath) {
                if (!file_exists($imgPath)) continue;

                $size = @getimagesize($imgPath);
                if (!$size) continue;

                $widthMm = $size[0] * 0.264583;
                $heightMm = $size[1] * 0.264583;
                $orientation = $widthMm > $heightMm ? 'L' : 'P';

                $pdf->AddPage($orientation, [$widthMm, $heightMm]);
                $pdf->Image($imgPath, 0, 0, $widthMm, $heightMm, '', '', '', false, 300, '', false, false, 0);
            }

            $dir = dirname($outputPath);
            if (!is_dir($dir)) mkdir($dir, 0755, true);

            $pdf->Output($outputPath, 'F');
            return file_exists($outputPath) && filesize($outputPath) > 0;
        } catch (\Throwable $e) {
            Log::error('jpgToPdf failed', ['error' => $e->getMessage()]);
            return false;
        }
    }

    /**
     * Convert Office / HTML documents (DOC, DOCX, PPT, PPTX, XLS, XLSX, HTML) to PDF using LibreOffice headless mode.
     */
    public function officeToPdf(string $inputPath, string $outputDir): ?string
    {
        try {
            if (!is_dir($outputDir)) mkdir($outputDir, 0755, true);

            $process = new Process([
                $this->libreOfficePath,
                '--headless',
                '--convert-to', 'pdf',
                '--outdir', $outputDir,
                $inputPath,
            ]);

            $process->setTimeout(180);
            $process->run();

            $baseName = pathinfo($inputPath, PATHINFO_FILENAME);
            $pdfPath = rtrim($outputDir, '/\\') . DIRECTORY_SEPARATOR . $baseName . '.pdf';

            if (file_exists($pdfPath) && filesize($pdfPath) > 0) {
                return $pdfPath;
            }

            // Fallback: If LibreOffice fails or missing, check WordToPdfService
            $wordConverter = new WordToPdfService();
            return $wordConverter->convert($inputPath, $outputDir);
        } catch (\Throwable $e) {
            Log::error('officeToPdf failed', ['error' => $e->getMessage()]);
            return null;
        }
    }

    /**
     * Convert PDF pages to JPG images and package in a ZIP archive if multiple pages.
     */
    public function pdfToJpg(string $pdfPath, string $outputDir): ?string
    {
        try {
            if (!is_dir($outputDir)) mkdir($outputDir, 0755, true);

            // Attempt 1: Ghostscript device jpeg
            $outputPattern = $outputDir . '/page_%d.jpg';
            $process = new Process([
                $this->ghostscriptPath,
                '-sDEVICE=jpeg',
                '-r150',
                '-dNOPAUSE',
                '-dBATCH',
                "-sOutputFile={$outputPattern}",
                $pdfPath,
            ]);

            $process->setTimeout(300);
            $process->run();

            $extractedImages = glob($outputDir . '/page_*.jpg');

            if (empty($extractedImages)) {
                return null;
            }

            if (count($extractedImages) === 1) {
                return $extractedImages[0];
            }

            // Package into ZIP
            $zipPath = $outputDir . '/pdf_images.zip';
            $zip = new ZipArchive();
            if ($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) === true) {
                foreach ($extractedImages as $imgFile) {
                    $zip->addFile($imgFile, basename($imgFile));
                }
                $zip->close();
                return $zipPath;
            }

            return $extractedImages[0];
        } catch (\Throwable $e) {
            Log::error('pdfToJpg failed', ['error' => $e->getMessage()]);
            return null;
        }
    }

    /**
     * Convert PDF to Office format (DOCX, PPTX, XLSX) via LibreOffice.
     */
    public function pdfToOffice(string $pdfPath, string $targetFormat, string $outputDir): ?string
    {
        try {
            if (!is_dir($outputDir)) mkdir($outputDir, 0755, true);

            $formatMap = [
                'docx' => 'docx',
                'word' => 'docx',
                'pptx' => 'pptx',
                'ppt' => 'pptx',
                'xlsx' => 'xlsx',
                'excel' => 'xlsx',
            ];

            $ext = $formatMap[strtolower($targetFormat)] ?? 'docx';

            $process = new Process([
                $this->libreOfficePath,
                '--headless',
                '--infilter=writer_pdf_import',
                '--convert-to', $ext,
                '--outdir', $outputDir,
                $pdfPath,
            ]);

            $process->setTimeout(180);
            $process->run();

            $baseName = pathinfo($pdfPath, PATHINFO_FILENAME);
            $outputPath = rtrim($outputDir, '/\\') . DIRECTORY_SEPARATOR . $baseName . '.' . $ext;

            if (file_exists($outputPath) && filesize($outputPath) > 0) {
                return $outputPath;
            }

            return null;
        } catch (\Throwable $e) {
            Log::error('pdfToOffice failed', ['error' => $e->getMessage()]);
            return null;
        }
    }

    /**
     * Convert standard PDF to ISO PDF/A compliance format.
     */
    public function pdfToPdfA(string $pdfPath, string $outputPath): bool
    {
        try {
            $dir = dirname($outputPath);
            if (!is_dir($dir)) mkdir($dir, 0755, true);

            $process = new Process([
                $this->ghostscriptPath,
                '-sDEVICE=pdfwrite',
                '-dPDFA=2',
                '-dPDFACompatibilityPolicy=1',
                '-dNOPAUSE',
                '-dQUIET',
                '-dBATCH',
                "-sOutputFile={$outputPath}",
                $pdfPath,
            ]);

            $process->setTimeout(300);
            $process->run();

            if (file_exists($outputPath) && filesize($outputPath) > 0) {
                return true;
            }

            // Fallback: Re-save clean PDF stream via FPDI
            $pdf = new TcpdfFpdi();
            $pdf->setPrintHeader(false);
            $pdf->setPrintFooter(false);
            $pageCount = $pdf->setSourceFile($pdfPath);

            for ($pageNum = 1; $pageNum <= $pageCount; $pageNum++) {
                $templateId = $pdf->importPage($pageNum);
                $size = $pdf->getTemplateSize($templateId);
                $pdf->AddPage($size['orientation'], [$size['width'], $size['height']]);
                $pdf->useTemplate($templateId, 0, 0, $size['width'], $size['height']);
            }

            $pdf->Output($outputPath, 'F');
            return file_exists($outputPath) && filesize($outputPath) > 0;
        } catch (\Throwable $e) {
            Log::error('pdfToPdfA failed', ['error' => $e->getMessage()]);
            return false;
        }
    }
}
